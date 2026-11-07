/**
 * stripe-booking-payment-link
 *
 * Creates a one-time Stripe Payment Link for an in-person balance (+ tip),
 * sends a branded email to the client, and stores link metadata on the booking.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadSiteEmailBranding, wrapStyldEmail } from '../_shared/styld-email-brand.ts';
import {
  computeChargeBreakdown,
  loadPlatformFeePayer,
  resolvePlatformRatePercent,
} from '../_shared/booking-service-fee.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

function buildPaymentLinkEmail(
  branding: Awaited<ReturnType<typeof loadSiteEmailBranding>>,
  opts: {
    clientName: string;
    service: string;
    balanceCents: number;
    tipCents: number;
    platformFeeCents: number;
    platformFeePayer: 'client' | 'tenant';
    totalChargeCents: number;
    paymentLinkUrl: string;
  },
): string {
  const first = opts.clientName.trim().split(/\s+/)[0] || 'there';
  const tipLine =
    opts.tipCents > 0
      ? `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.softTextColor};font-size:14px;">Tip</td>
      <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.textColor};font-size:14px;font-weight:600;text-align:right;">${money(opts.tipCents)}</td>
    </tr>`
      : '';
  const platformFeeLine =
    opts.platformFeePayer === 'client' && opts.platformFeeCents > 0
      ? `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.softTextColor};font-size:14px;">Platform fee</td>
      <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.textColor};font-size:14px;font-weight:600;text-align:right;">${money(opts.platformFeeCents)}</td>
    </tr>`
      : '';

  const body = `<tr><td style="padding:24px 28px 8px;color:${branding.textColor};">
<h2 style="margin:0 0 10px;color:${branding.textColor};font-family:${branding.headingFont};font-size:24px;font-weight:700;">Hi ${esc(first)},</h2>
<p style="margin:0 0 18px;color:${branding.softTextColor};font-size:15px;line-height:1.6;">
  Your payment for <strong style="color:${branding.textColor};">${esc(opts.service)}</strong> is ready.
  Pay securely online — powered by Styld Pay.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.softTextColor};font-size:14px;">Service balance</td>
    <td style="padding:8px 0;border-bottom:1px solid ${branding.rowBorderColor};color:${branding.textColor};font-size:14px;font-weight:600;text-align:right;">${money(opts.balanceCents)}</td>
  </tr>
  ${tipLine}
  ${platformFeeLine}
  <tr>
    <td style="padding:12px 0;color:${branding.textColor};font-size:15px;font-weight:700;">Total</td>
    <td style="padding:12px 0;color:${branding.primaryColor};font-size:18px;font-weight:800;text-align:right;font-family:${branding.bodyFont};">${money(opts.totalChargeCents)}</td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${branding.ctaGradient};">
<a href="${esc(opts.paymentLinkUrl)}" style="display:inline-block;padding:14px 32px;color:${branding.ctaTextColor};font-size:15px;font-weight:700;text-decoration:none;">Pay now</a>
</td></tr></table>
<p style="margin:18px 0 0;color:${branding.mutedColor};font-size:12px;line-height:1.55;text-align:center;">
  Secure checkout by Stripe · ${esc(branding.businessName)}
</p>
</td></tr>`;

  return wrapStyldEmail(branding, body, `Pay ${branding.businessName}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const {
      balanceCents,
      tipCents = 0,
      subdomain,
      bookingId,
      customerEmail,
      customerName,
      serviceName,
      sendEmail = true,
    } = await req.json();

    if (!subdomain || !bookingId) {
      return json({ error: 'Missing subdomain or bookingId' }, 400);
    }

    const balance = Math.max(0, Math.round(Number(balanceCents)));
    const tip = Math.max(0, Math.round(Number(tipCents)));
    const base = balance + tip;
    if (base < 50) return json({ error: 'Amount must be at least $0.50' }, 400);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Payment not configured' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const rootDomain = Deno.env.get('STYLD_ROOT_DOMAIN') ?? 'styldd.com';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM') ?? 'Styld <bookings@styldd.com>';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: siteRow, error: siteErr } = await supabase
      .from('styld_site_subdomains')
      .select('user_id')
      .eq('subdomain', String(subdomain))
      .maybeSingle();

    if (siteErr || !siteRow || siteRow.user_id !== authData.user.id) {
      return json({ error: 'Site not found' }, 403);
    }

    const userId = siteRow.user_id;

    const { data: stripeAccountRow } = await supabase
      .from('styld_stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const stripeAccountId = String(stripeAccountRow?.stripe_account_id ?? '').trim();
    if (!stripeAccountId) {
      return json({ error: 'Styld Pay is not set up for this account. Connect Stripe in Form & Payments.' }, 400);
    }

    let chargesEnabled = stripeAccountRow?.charges_enabled === true;
    if (!chargesEnabled) {
      const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(stripeAccountId)}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (acctRes.ok) {
        const acct = await acctRes.json();
        chargesEnabled = acct.charges_enabled === true;
        if (chargesEnabled) {
          await supabase
            .from('styld_stripe_accounts')
            .update({ charges_enabled: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
      }
    }

    if (!chargesEnabled) {
      return json({
        error: 'Styld Pay is still activating. Finish Stripe verification, then try again.',
      }, 400);
    }

    const { data: bookingRow, error: bookingErr } = await supabase
      .from('styld_site_records')
      .select('id, data')
      .eq('user_id', userId)
      .eq('record_type', 'booking')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingErr || !bookingRow) {
      return json({ error: 'Booking not found' }, 404);
    }

    const bookingData = (bookingRow.data ?? {}) as Record<string, unknown>;
    const service = String(serviceName ?? bookingData.style_name ?? bookingData.style_id ?? 'Appointment');
    const clientName = String(customerName ?? bookingData.full_name ?? 'there');
    const clientEmail = String(customerEmail ?? bookingData.email ?? '').trim();

    const platformFeePayer = await loadPlatformFeePayer(supabase, userId);
    const platformRate = resolvePlatformRatePercent();
    const fees = computeChargeBreakdown(base, platformFeePayer, platformRate);
    const chargeAmount = fees.chargeCents;
    const safeAppFee = fees.applicationFeeCents;

    const siteUrl = `https://${subdomain}.${rootDomain}`;
    const productName = tip > 0
      ? `${service} — balance + tip`
      : `${service} — balance due`;

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${siteUrl}?payment=success`);
    params.set('cancel_url', `${siteUrl}?payment=cancelled`);
    if (clientEmail) params.set('customer_email', clientEmail);
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][product_data][name]', productName);
    params.set('line_items[0][price_data][unit_amount]', String(chargeAmount));
    params.set('line_items[0][quantity]', '1');
    params.set('payment_intent_data[application_fee_amount]', String(safeAppFee));
    params.set('payment_intent_data[transfer_data][destination]', stripeAccountId);
    params.set('payment_intent_data[on_behalf_of]', stripeAccountId);
    params.set('payment_intent_data[metadata][subdomain]', String(subdomain));
    params.set('payment_intent_data[metadata][source]', 'styld_payment_link');
    params.set('payment_intent_data[metadata][bookingId]', String(bookingId));
    params.set('payment_intent_data[metadata][balance_cents]', String(balance));
    params.set('payment_intent_data[metadata][tip_cents]', String(tip));
    params.set('payment_intent_data[metadata][stripe_fee_cents]', String(fees.stripeFeeCents));
    params.set('payment_intent_data[metadata][platform_fee_cents]', String(fees.platformProfitCents));
    params.set('payment_intent_data[metadata][platform_fee_payer]', platformFeePayer);
    params.set('payment_intent_data[description]', `Styld payment link — ${subdomain}`);
    if (clientEmail) params.set('payment_intent_data[receipt_email]', clientEmail);

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) {
      const stripeMessage = session.error?.message || 'Could not create payment link';
      console.error('Stripe checkout session error:', session);
      return json({ error: stripeMessage }, 400);
    }

    const paymentLinkUrl = String(session.url ?? '');
    const paymentLinkId = String(session.id ?? '');
    if (!paymentLinkUrl) {
      return json({ error: 'Could not create payment link' }, 500);
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('styld_site_records')
      .update({
        data: {
          ...bookingData,
          payment_status: 'payment_link_sent',
          payment_method_at_service: 'payment_link',
          tip_amount: tip / 100,
          payment_link_url: paymentLinkUrl,
          payment_link_id: paymentLinkId,
          payment_link_sent_at: now,
          payment_link_balance_cents: balance,
          payment_link_tip_cents: tip,
          payment_link_platform_fee_cents: fees.displayPlatformFeeCents,
          payment_link_platform_fee_payer: platformFeePayer,
          platform_fee_payer: platformFeePayer,
          payment_link_total_cents: chargeAmount,
        },
        updated_at: now,
      })
      .eq('id', bookingId);

    if (updateErr) return json({ error: updateErr.message }, 500);

    let emailSent = false;
    if (sendEmail && clientEmail && resendKey) {
      const branding = await loadSiteEmailBranding(supabase, userId, siteUrl);
      const html = buildPaymentLinkEmail(branding, {
        clientName,
        service,
        balanceCents: balance,
        tipCents: tip,
        platformFeeCents: fees.displayPlatformFeeCents,
        platformFeePayer,
        totalChargeCents: chargeAmount,
        paymentLinkUrl,
      });

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [clientEmail],
          subject: `Pay ${branding.businessName} — ${money(chargeAmount)}`,
          html,
        }),
      });

      emailSent = emailRes.ok;
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.warn('Payment link email failed:', emailRes.status, errText);
      }
    }

    return json({
      paymentLinkUrl,
      paymentLinkId,
      emailSent,
      fees: {
        balanceCents: balance,
        tipCents: tip,
        bookingAmountCents: base,
        serviceFeeCents: fees.displayPlatformFeeCents,
        totalChargeCents: chargeAmount,
        platformFeePayer,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('stripe-booking-payment-link error:', err);
    return json({ error: msg }, 500);
  }
});
