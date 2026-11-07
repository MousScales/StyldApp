/** Matches STYLD_PLATFORM_FEE_PERCENT default (1%) in stripe-booking-pay + templatesite/js/booking.js */
export const STYLD_PLATFORM_RATE = 0.01;

export const PLATFORM_FEE_LABEL = 'Platform fee';

/** Stripe card processing: 2.9% + $0.30 (matches computeChargeBreakdown). */
export function estimateStripeProcessingFeeCents(chargeCents: number): number {
  return Math.round(Math.abs(chargeCents) * 0.029 + 30);
}

export type PlatformFeePayer = 'client' | 'tenant';

export function normalizePlatformFeePayer(value: unknown): PlatformFeePayer {
  return value === 'tenant' ? 'tenant' : 'client';
}

export type ChargeBreakdown = {
  baseCents: number;
  chargeCents: number;
  applicationFeeCents: number;
  displayPlatformFeeCents: number;
  stylistNetCents: number;
  platformFeePayer: PlatformFeePayer;
  platformProfitCents: number;
  stripeFeeCents: number;
};

export function computeChargeBreakdown(
  baseCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
  platformRate = STYLD_PLATFORM_RATE,
): ChargeBreakdown {
  const base = Math.max(0, Math.round(baseCents));
  const platformProfitCents = Math.round(base * platformRate);

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

  const chargeCents = Math.round((base * (1 + platformRate) + 30) / (1 - 0.029));
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

export function computeServiceFeeCents(
  amountCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
): number {
  return computeChargeBreakdown(amountCents, platformFeePayer).displayPlatformFeeCents;
}

/** @alias computeServiceFeeCents */
export const computePlatformFeeCents = computeServiceFeeCents;

export function computeServiceFee(
  amountDollars: number,
  platformFeePayer: PlatformFeePayer = 'client',
): number {
  return computeServiceFeeCents(Math.round(amountDollars * 100), platformFeePayer) / 100;
}

/** @alias computeServiceFee */
export const computePlatformFee = computeServiceFee;

export function totalChargeWithServiceFee(
  amountDollars: number,
  platformFeePayer: PlatformFeePayer = 'client',
): number {
  if (!amountDollars || amountDollars <= 0) return 0;
  return (
    computeChargeBreakdown(Math.round(amountDollars * 100), platformFeePayer).chargeCents / 100
  );
}

/** @alias totalChargeWithServiceFee */
export const totalChargeWithPlatformFee = totalChargeWithServiceFee;

export function totalChargeCentsWithPlatformFee(
  amountCents: number,
  platformFeePayer: PlatformFeePayer = 'client',
): number {
  return computeChargeBreakdown(amountCents, platformFeePayer).chargeCents;
}

export function clientPaysPlatformFee(platformFeePayer: PlatformFeePayer): boolean {
  return platformFeePayer !== 'tenant';
}
