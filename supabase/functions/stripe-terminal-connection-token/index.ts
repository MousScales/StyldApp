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

async function getOrCreateTerminalLocation(
  stripeKey: string,
  stripeAccountId: string,
  label: string,
): Promise<string> {
  const listRes = await fetch('https://api.stripe.com/v1/terminal/locations?limit=1', {
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Stripe-Account': stripeAccountId,
    },
  });
  const list = await listRes.json();
  if (listRes.ok && Array.isArray(list.data) && list.data[0]?.id) {
    return String(list.data[0].id);
  }

  const params = new URLSearchParams();
  params.set('display_name', label.slice(0, 100) || 'Styld');
  params.set('address[line1]', 'Mobile service');
  params.set('address[city]', 'San Francisco');
  params.set('address[state]', 'CA');
  params.set('address[country]', 'US');
  params.set('address[postal_code]', '94103');

  const createRes = await fetch('https://api.stripe.com/v1/terminal/locations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Stripe-Account': stripeAccountId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.error?.message || 'Could not create terminal location');
  }
  return String(created.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const { subdomain } = await req.json();
    if (!subdomain) return json({ error: 'Missing subdomain' }, 400);

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

    const tokenRes = await fetch('https://api.stripe.com/v1/terminal/connection_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': stripeAccountId,
      },
      body: '',
    });

    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      return json({ error: token.error?.message || 'Could not create connection token' }, 400);
    }

    const locationId = await getOrCreateTerminalLocation(stripeKey, stripeAccountId, subdomain);

    return json({
      secret: token.secret,
      stripeAccountId,
      locationId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('stripe-terminal-connection-token error:', err);
    return json({ error: msg }, 500);
  }
});
