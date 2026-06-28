/**
 * validate-booking-promo
 *
 * Public endpoint for the booking site to validate a promo code before checkout.
 * Payload: { subdomain, code, subtotalCents }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateBookingPromo } from '../_shared/booking-promo.ts';

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
    const { subdomain, code, subtotalCents } = await req.json();
    if (!subdomain || !code) {
      return json({ ok: false, message: 'Missing subdomain or promo code.' }, 400);
    }

    const subtotal = Math.round(Number(subtotalCents) || 0);
    if (subtotal < 1) {
      return json({ ok: false, message: 'Invalid booking total.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userId, error: resolveErr } = await supabase
      .rpc('styld_resolve_published_user_id', { p_subdomain: String(subdomain).trim() });
    if (resolveErr || !userId) {
      return json({ ok: false, message: 'Site not found.' }, 404);
    }

    const result = await validateBookingPromo(supabase, String(userId), String(code), subtotal);
    return json(result, result.ok ? 200 : 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('validate-booking-promo error:', err);
    return json({ ok: false, message: msg }, 500);
  }
});
