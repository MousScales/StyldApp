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

    const { bookingId, subdomain, paymentIntentId, paymentMethod = 'card' } = await req.json();

    if (!bookingId || !subdomain || !paymentIntentId) {
      return json({ error: 'Missing bookingId, subdomain, or paymentIntentId' }, 400);
    }

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

    const piRes = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );

    if (!piRes.ok) return json({ error: 'Could not verify payment' }, 400);

    const pi = await piRes.json();
    if (pi.status !== 'succeeded') {
      return json({ error: `Payment not confirmed (status: ${pi.status})` }, 400);
    }

    const metadata = (pi.metadata as Record<string, string>) || {};
    if (metadata.bookingId && metadata.bookingId !== String(bookingId)) {
      return json({ error: 'Payment does not match this booking' }, 400);
    }
    if (metadata.subdomain && metadata.subdomain !== String(subdomain)) {
      return json({ error: 'Payment does not match this site' }, 400);
    }

    const balanceCents = Math.max(0, Number(metadata.balance_cents ?? 0));
    const tipCents = Math.max(0, Number(metadata.tip_cents ?? 0));
    const tipAmount = tipCents / 100;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: siteRow, error: siteErr } = await supabase
      .from('styld_site_subdomains')
      .select('user_id')
      .eq('subdomain', String(subdomain))
      .maybeSingle();

    if (siteErr || !siteRow || siteRow.user_id !== authData.user.id) {
      return json({ error: 'Site not found' }, 403);
    }

    const { data: bookingRow, error: bookingErr } = await supabase
      .from('styld_site_records')
      .select('id, data')
      .eq('user_id', siteRow.user_id)
      .eq('record_type', 'booking')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingErr || !bookingRow) {
      return json({ error: 'Booking not found' }, 404);
    }

    const data = (bookingRow.data ?? {}) as Record<string, unknown>;
    const method = paymentMethod === 'tap_to_pay' ? 'tap_to_pay' : 'card';

    const { error: updateErr } = await supabase
      .from('styld_site_records')
      .update({
        data: {
          ...data,
          payment_status: 'paid',
          payment_method_at_service: method,
          balance_collected_cents: balanceCents,
          tip_amount: tipAmount,
          balance_collected_at: new Date().toISOString(),
          in_person_payment_intent_id: paymentIntentId,
          stripe_payment_intent_id:
            typeof data.stripe_payment_intent_id === 'string' && data.stripe_payment_intent_id
              ? data.stripe_payment_intent_id
              : paymentIntentId,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ ok: true, balanceCents, tipAmount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('stripe-booking-inperson-confirm error:', err);
    return json({ error: msg }, 500);
  }
});
