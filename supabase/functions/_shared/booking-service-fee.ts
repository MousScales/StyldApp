/** Matches STYLD_PLATFORM_FEE_PERCENT default (1%) + Stripe gross-up in edge pay functions. */

export type PlatformFeePayer = 'client' | 'tenant';

export function normalizePlatformFeePayer(value: unknown): PlatformFeePayer {
  return value === 'tenant' ? 'tenant' : 'client';
}

export function resolvePlatformRatePercent(): number {
  return parseFloat(Deno.env.get('STYLD_PLATFORM_FEE_PERCENT') ?? '1') / 100;
}

/** Stripe card processing: 2.9% + $0.30 (matches computeChargeBreakdown). */
export function estimateStripeProcessingFeeCents(chargeCents: number): number {
  return Math.round(Math.abs(chargeCents) * 0.029 + 30);
}

export type ChargeBreakdown = {
  baseCents: number;
  chargeCents: number;
  applicationFeeCents: number;
  /** Amount shown to clients as "Platform fee" (0 when stylist pays). */
  displayPlatformFeeCents: number;
  stylistNetCents: number;
  platformFeePayer: PlatformFeePayer;
  platformProfitCents: number;
  stripeFeeCents: number;
};

export function computeChargeBreakdown(
  baseCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
  platformRate?: number,
): ChargeBreakdown {
  const rate = platformRate ?? resolvePlatformRatePercent();
  const base = Math.max(0, Math.round(baseCents));
  const platformProfitCents = Math.round(base * rate);

  if (base < 1) {
    return {
      baseCents: 0,
      chargeCents: 0,
      applicationFeeCents: 0,
      displayPlatformFeeCents: 0,
      stylistNetCents: 0,
      platformFeePayer,
      platformProfitCents: 0,
      stripeFeeCents: 0,
    };
  }

  if (platformFeePayer === 'tenant') {
    const chargeCents = base;
    const stripeFeeCents = Math.round(chargeCents * 0.029 + 30);
    const applicationFeeCents = Math.max(
      0,
      Math.min(platformProfitCents + stripeFeeCents, chargeCents - 50),
    );
    return {
      baseCents: base,
      chargeCents,
      applicationFeeCents,
      displayPlatformFeeCents: 0,
      stylistNetCents: chargeCents - applicationFeeCents,
      platformFeePayer: 'tenant',
      platformProfitCents,
      stripeFeeCents,
    };
  }

  const chargeCents = Math.round((base * (1 + rate) + 30) / (1 - 0.029));
  const stripeFeeCents = Math.round(chargeCents * 0.029 + 30);
  const applicationFeeCents = Math.max(0, Math.min(chargeCents - base, chargeCents - 50));

  return {
    baseCents: base,
    chargeCents,
    applicationFeeCents,
    displayPlatformFeeCents: chargeCents - base,
    stylistNetCents: base,
    platformFeePayer: 'client',
    platformProfitCents,
    stripeFeeCents,
  };
}

export function computePlatformFeeCents(
  baseCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
  platformRate?: number,
): number {
  return computeChargeBreakdown(baseCents, platformFeePayer, platformRate).displayPlatformFeeCents;
}

export function totalChargeCentsWithPlatformFee(
  baseCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
  platformRate?: number,
): number {
  return computeChargeBreakdown(baseCents, platformFeePayer, platformRate).chargeCents;
}

export async function loadPlatformFeePayer(
  supabase: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>,
  userId: string,
): Promise<PlatformFeePayer> {
  const { data } = await supabase
    .from('styld_site_records')
    .select('data')
    .eq('user_id', userId)
    .eq('record_type', 'site_setting')
    .eq('record_key', 'booking_payment')
    .maybeSingle();

  const wrap = data?.data as { value?: Record<string, unknown> } | undefined;
  const value = wrap?.value ?? wrap ?? {};
  return normalizePlatformFeePayer(
    value && typeof value === 'object' ? (value as Record<string, unknown>).platformFeePayer : null,
  );
}
