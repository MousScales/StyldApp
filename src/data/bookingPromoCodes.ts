export type PromoDiscountKind = 'percent' | 'fixed';

export type BookingPromoCode = {
  id: string;
  /** Client-facing code, stored uppercase */
  code: string;
  /** Optional label for the stylist (e.g. "Instagram launch") */
  label: string;
  discountKind: PromoDiscountKind;
  /** Percent 1–100 or fixed USD amount */
  discountValue: number;
  enabled: boolean;
  /** ISO date string — optional expiry (end of that calendar day, UTC) */
  expiresAt: string | null;
  /** Optional max redemptions across all bookings */
  maxUses: number | null;
};

export function normalizePromoCode(raw: unknown): BookingPromoCode | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : '';
  const code = typeof source.code === 'string' ? source.code.trim().toUpperCase() : '';
  if (!id || !code) return null;

  const discountKind: PromoDiscountKind =
    source.discountKind === 'fixed' ? 'fixed' : 'percent';

  let discountValue =
    typeof source.discountValue === 'number' && Number.isFinite(source.discountValue)
      ? source.discountValue
      : 10;

  if (discountKind === 'percent') {
    discountValue = Math.min(100, Math.max(1, Math.round(discountValue)));
  } else {
    discountValue = Math.max(0.01, Math.round(discountValue * 100) / 100);
  }

  const expiresAt =
    typeof source.expiresAt === 'string' && source.expiresAt.trim()
      ? source.expiresAt.trim()
      : null;

  const maxUses =
    typeof source.maxUses === 'number' && Number.isFinite(source.maxUses) && source.maxUses > 0
      ? Math.round(source.maxUses)
      : null;

  return {
    id,
    code,
    label: typeof source.label === 'string' ? source.label.trim() : '',
    discountKind,
    discountValue,
    enabled: source.enabled !== false,
    expiresAt,
    maxUses,
  };
}

export function normalizeBookingPromoCodes(value: unknown): BookingPromoCode[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: BookingPromoCode[] = [];
  for (const item of value) {
    const promo = normalizePromoCode(item);
    if (!promo || seen.has(promo.code)) continue;
    seen.add(promo.code);
    out.push(promo);
  }
  return out;
}

export function createBookingPromoCode(partial?: Partial<BookingPromoCode>): BookingPromoCode {
  return {
    id: partial?.id ?? `promo-${Date.now()}`,
    code: (partial?.code ?? '').trim().toUpperCase(),
    label: partial?.label?.trim() ?? '',
    discountKind: partial?.discountKind ?? 'percent',
    discountValue: partial?.discountValue ?? 10,
    enabled: partial?.enabled !== false,
    expiresAt: partial?.expiresAt ?? null,
    maxUses: partial?.maxUses ?? null,
  };
}

export function computePromoDiscountUsd(subtotalUsd: number, promo: BookingPromoCode): number {
  const subtotal = Math.max(0, subtotalUsd);
  if (subtotal <= 0) return 0;
  if (promo.discountKind === 'fixed') {
    return Math.min(subtotal, Math.round(promo.discountValue * 100) / 100);
  }
  const pct = Math.min(100, Math.max(1, promo.discountValue));
  return Math.round(subtotal * (pct / 100) * 100) / 100;
}

export function formatPromoDiscountLabel(promo: BookingPromoCode): string {
  if (promo.discountKind === 'fixed') {
    return `$${promo.discountValue.toFixed(2)} off`;
  }
  return `${Math.round(promo.discountValue)}% off`;
}
