import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  computeChargeBreakdown,
  estimateStripeProcessingFeeCents,
} from '../_shared/booking-service-fee.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

type StripeResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function stripeGet<T = Record<string, unknown>>(
  path: string,
  stripeKey: string,
  accountId?: string,
): Promise<StripeResult<T>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${stripeKey}` };
  if (accountId) headers['Stripe-Account'] = accountId;
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Stripe request failed (${res.status})`;
    return { ok: false, error: message };
  }
  return { ok: true, data: body as T };
}

function sumUsdCents(buckets: { currency: string; amount: number }[] | undefined): number {
  return (buckets ?? [])
    .filter((b) => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);
}

type StripePayout = {
  id: string;
  amount: number;
  status: string;
  arrival_date: number;
  created: number;
  description: string | null;
};

type StripeFeeDetail = {
  amount?: number;
  type?: string;
};

type StripeBalanceTransaction = {
  id: string;
  amount: number;
  net: number;
  fee: number;
  type: string;
  status: string;
  created: number;
  available_on: number;
  reporting_category: string | null;
  source: string | null;
  description: string | null;
  fee_details?: StripeFeeDetail[];
};

function isPaymentType(type: string): boolean {
  return type === 'charge' || type === 'payment';
}

function parseTransactionFees(t: StripeBalanceTransaction): {
  stripeFeeCents: number;
  platformFeeCents: number;
} {
  let platformFeeCents = 0;

  for (const detail of t.fee_details ?? []) {
    const amount = typeof detail.amount === 'number' ? detail.amount : 0;
    if (detail.type === 'application_fee') platformFeeCents += amount;
  }

  if (platformFeeCents === 0 && t.type === 'application_fee') {
    platformFeeCents = t.fee;
  }

  const stripeFeeCents = isPaymentType(t.type)
    ? estimateStripeProcessingFeeCents(t.amount)
    : (t.fee_details ?? [])
        .filter((d) => d.type === 'stripe_fee')
        .reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);

  if (platformFeeCents === 0 && isPaymentType(t.type)) {
    if (t.fee > 0 && t.fee < stripeFeeCents) {
      platformFeeCents = t.fee;
    } else {
      platformFeeCents = computeChargeBreakdown(Math.abs(t.net), 'tenant').platformProfitCents;
    }
  }

  return { stripeFeeCents, platformFeeCents };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return json({ error: 'Payment not configured' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not authenticated' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  const { data: row } = await supabase
    .from('styld_stripe_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row?.stripe_account_id) {
    return json({
      hasAccount: false,
      status: 'not_started',
      payoutsEnabled: false,
      chargesEnabled: false,
      balanceAvailableCents: 0,
      balancePendingCents: 0,
      balanceLive: false,
      bankAccount: null,
      recentPayouts: [],
      recentTransactions: [],
    });
  }

  const acctId = row.stripe_account_id;
  const checkedAt = new Date().toISOString();

  const [acctResult, balResult, bankResult, payoutResult, txnResult] = await Promise.all([
    stripeGet<{
      payouts_enabled?: boolean;
      charges_enabled?: boolean;
      details_submitted?: boolean;
    }>(`/accounts/${acctId}`, stripeKey),
    stripeGet<{ available?: { currency: string; amount: number }[]; pending?: { currency: string; amount: number }[] }>(
      '/balance',
      stripeKey,
      acctId,
    ),
    stripeGet<{ data?: Record<string, unknown>[] }>(
      `/accounts/${acctId}/external_accounts?object=bank_account&limit=1`,
      stripeKey,
    ),
    stripeGet<{ data?: StripePayout[] }>('/payouts?limit=20', stripeKey, acctId),
    stripeGet<{ data?: StripeBalanceTransaction[] }>(
      '/balance_transactions?limit=25',
      stripeKey,
      acctId,
    ),
  ]);

  let payoutsEnabled = row.payouts_enabled;
  let chargesEnabled = row.charges_enabled;
  let detailsSubmitted = row.details_submitted;

  if (acctResult.ok) {
    payoutsEnabled = acctResult.data.payouts_enabled === true;
    chargesEnabled = acctResult.data.charges_enabled === true;
    detailsSubmitted = acctResult.data.details_submitted === true;
  }

  let availableCents = row.balance_available_cents ?? 0;
  let pendingCents = row.balance_pending_cents ?? 0;
  let balanceLive = false;
  let balanceError: string | undefined;

  if (balResult.ok) {
    availableCents = sumUsdCents(balResult.data.available);
    pendingCents = sumUsdCents(balResult.data.pending);
    balanceLive = true;
  } else {
    balanceError = balResult.error;
  }

  await supabase.from('styld_stripe_accounts').update({
    onboarding_complete: detailsSubmitted,
    payouts_enabled: payoutsEnabled,
    charges_enabled: chargesEnabled,
    details_submitted: detailsSubmitted,
    ...(balanceLive
      ? {
          balance_available_cents: availableCents,
          balance_pending_cents: pendingCents,
        }
      : {}),
    updated_at: checkedAt,
  }).eq('user_id', user.id);

  const bankData = bankResult.ok ? bankResult.data.data?.[0] : null;
  const bankAccount = bankData
    ? {
        id: bankData.id as string,
        bankName: (bankData.bank_name ?? 'Bank') as string,
        last4: bankData.last4 as string,
        routingNumber: bankData.routing_number as string,
        accountHolderName: (bankData.account_holder_name ?? '') as string,
        currency: (bankData.currency ?? 'usd') as string,
      }
    : null;

  const recentPayouts = (payoutResult.ok ? payoutResult.data.data ?? [] : []).map((p: StripePayout) => ({
    id: p.id,
    amountCents: p.amount,
    status: p.status,
    arrivalDate: p.arrival_date,
    createdAt: p.created,
    description: p.description ?? 'Payout',
  }));

  const recentTransactions = (txnResult.ok ? txnResult.data.data ?? [] : []).map(
    (t: StripeBalanceTransaction) => {
      const { stripeFeeCents, platformFeeCents } = parseTransactionFees(t);
      return {
        id: t.id,
        amountCents: t.amount,
        netCents: t.net,
        feeCents: t.fee,
        stripeFeeCents,
        platformFeeCents,
        type: t.type,
        status: t.status,
        createdAt: t.created,
        availableOn: t.available_on,
        reportingCategory: t.reporting_category ?? '',
        sourceId: typeof t.source === 'string' ? t.source : null,
        description: t.description ?? '',
      };
    },
  );

  const status = payoutsEnabled
    ? 'ready'
    : detailsSubmitted
      ? 'pending_review'
      : 'onboarding';

  return json({
    hasAccount: true,
    accountId: acctId,
    status,
    payoutsEnabled,
    chargesEnabled,
    detailsSubmitted,
    balanceAvailableCents: availableCents,
    balancePendingCents: pendingCents,
    balanceLive,
    balanceCheckedAt: checkedAt,
    balanceError,
    bankAccount,
    recentPayouts,
    recentTransactions,
  });
});
