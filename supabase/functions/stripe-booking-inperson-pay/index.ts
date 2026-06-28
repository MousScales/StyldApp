import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      tapToPay = false,
    } = await req.json();

    if (!balanceCents || !subdomain || !bookingId) {
      return json({ error: 'Missing balanceCents, subdomain, or bookingId' }, 400);
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

    const { data: stripeAccountId } = await supabase.rpc('styld_resolve_stripe_account', {
      p_subdomain: subdomain,
    });

    if (!stripeAccountId) {
      return json({ error: 'Styld Pay is not set up for this site.' }, 400);
    }

    const platformRate = parseFloat(Deno.env.get('STYLD_PLATFORM_FEE_PERCENT') ?? '1') / 100;
    const chargeAmount = Math.round((base * (1 + platformRate) + 30) / (1 - 0.029));
    const stripeFeeCents = Math.round(chargeAmount * 0.029 + 30);
    const platformFeeCents = Math.round(base * platformRate);
    const applicationFeeCents = chargeAmount - base;
    const safeAppFee = Math.max(0, Math.min(applicationFeeCents, chargeAmount - 50));

    const params = new URLSearchParams();
    params.set('amount', String(chargeAmount));
    params.set('currency', 'usd');
    params.set('payment_method_types[]', tapToPay ? 'card_present' : 'card');
    params.set('capture_method', 'automatic');
    params.set('description', `Styld in-person — ${subdomain}`);
    params.set('metadata[subdomain]', subdomain);
    params.set('metadata[source]', 'styld_inperson');
    params.set('metadata[bookingId]', String(bookingId));
    params.set('metadata[balance_cents]', String(balance));
    params.set('metadata[tip_cents]', String(tip));
    params.set('metadata[stripe_fee_cents]', String(stripeFeeCents));
    params.set('metadata[platform_fee_cents]', String(platformFeeCents));
    if (customerEmail) params.set('receipt_email', String(customerEmail));

    params.set('transfer_data[destination]', stripeAccountId);
    params.set('on_behalf_of', stripeAccountId);
    params.set('application_fee_amount', String(safeAppFee));

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const pi = await piRes.json();
    if (!piRes.ok) {
      return json({ error: pi.error?.message || 'Could not set up payment' }, 400);
    }

    return json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      fees: {
        balanceCents: balance,
        tipCents: tip,
        bookingAmountCents: base,
        serviceFeeCents: safeAppFee,
        totalChargeCents: chargeAmount,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('stripe-booking-inperson-pay error:', err);
    return json({ error: msg }, 500);
  }
});
