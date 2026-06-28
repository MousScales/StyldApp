export type PromoDiscountKind = 'percent' | 'fixed';

export type BookingPromoCode = {
  id: string;
  code: string;
  label: string;
  discountKind: PromoDiscountKind;
  discountValue: number;
  enabled: boolean;
  expiresAt: string | null;
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

export function computePromoDiscountUsd(subtotalUsd: number, promo: BookingPromoCode): number {
  const subtotal = Math.max(0, subtotalUsd);
  if (subtotal <= 0) return 0;
  if (promo.discountKind === 'fixed') {
    return Math.min(subtotal, Math.round(promo.discountValue * 100) / 100);
  }
  const pct = Math.min(100, Math.max(1, promo.discountValue));
  return Math.round(subtotal * (pct / 100) * 100) / 100;
}

export type PromoValidationResult = {
  ok: boolean;
  code?: string;
  promoId?: string;
  discountCents?: number;
  discountedSubtotalCents?: number;
  message?: string;
};

function promoExpired(promo: BookingPromoCode): boolean {
  if (!promo.expiresAt) return false;
  const end = new Date(promo.expiresAt);
  if (Number.isNaN(end.getTime())) return false;
  end.setUTCHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

export function findEnabledPromo(codes: BookingPromoCode[], rawCode: string): BookingPromoCode | null {
  const normalized = String(rawCode ?? '').trim().toUpperCase();
  if (!normalized) return null;
  return codes.find((item) => item.enabled && item.code === normalized) ?? null;
}

export async function countPromoUses(
  supabase: {
    from: (table: string) => {
      select: (
        columns: string,
        opts: { count: 'exact'; head: boolean },
      ) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            filter: (col: string, op: string, val: string) => Promise<{ count: number | null }>;
          };
        };
      };
    };
  },
  userId: string,
  code: string,
): Promise<number> {
  const { count } = await supabase
    .from('styld_site_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('record_type', 'booking')
    .filter('data->>promo_code', 'eq', code);

  return count ?? 0;
}

export async function validateBookingPromo(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              maybeSingle: () => Promise<{
                data: { data?: { value?: unknown } } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  },
  userId: string,
  rawCode: string,
  subtotalCents: number,
): Promise<PromoValidationResult> {
  const subtotal = Math.max(0, Math.round(subtotalCents));
  if (subtotal < 1) {
    return { ok: false, message: 'Add a service before applying a promo code.' };
  }

  const { data: row, error } = await supabase
    .from('styld_site_records')
    .select('data')
    .eq('user_id', userId)
    .eq('record_type', 'site_setting')
    .eq('record_key', 'booking_promo_codes')
    .maybeSingle();

  if (error) {
    return { ok: false, message: 'Could not validate promo code.' };
  }

  const value =
    row?.data && typeof row.data === 'object' && 'value' in row.data
      ? (row.data as { value?: unknown }).value
      : row?.data;
  const codes = normalizeBookingPromoCodes(value);
  const promo = findEnabledPromo(codes, rawCode);

  if (!promo) {
    return { ok: false, message: 'That promo code is not valid.' };
  }
  if (promoExpired(promo)) {
    return { ok: false, message: 'That promo code has expired.' };
  }

  if (promo.maxUses != null) {
    const used = await countPromoUses(supabase, userId, promo.code);
    if (used >= promo.maxUses) {
      return { ok: false, message: 'That promo code has reached its usage limit.' };
    }
  }

  const subtotalUsd = subtotal / 100;
  const discountUsd = computePromoDiscountUsd(subtotalUsd, promo);
  const discountCents = Math.round(discountUsd * 100);
  const discountedSubtotalCents = Math.max(0, subtotal - discountCents);

  if (discountCents < 1) {
    return { ok: false, message: 'That promo code does not apply to this booking.' };
  }

  return {
    ok: true,
    code: promo.code,
    promoId: promo.id,
    discountCents,
    discountedSubtotalCents,
    message: 'Promo applied.',
  };
}

export function computeOnlineChargeCents(
  payment: {
    mode?: string;
    depositKind?: string;
    depositValue?: number;
    depositIncludedInPrice?: boolean;
  },
  subtotalCents: number,
  houseCallExtraCents = 0,
): number {
  const mode = payment.mode === 'full' || payment.mode === 'deposit' ? payment.mode : 'in_person';
  const subtotalUsd = subtotalCents / 100;
  if (mode === 'in_person') return 0;
  if (mode === 'full') return Math.max(50, subtotalCents);

  let depositUsd =
    payment.depositKind === 'fixed'
      ? Number(payment.depositValue) || 0
      : subtotalUsd * ((Math.min(100, Math.max(0, Number(payment.depositValue) || 10))) / 100);

  if (houseCallExtraCents > 0) {
    depositUsd += houseCallExtraCents / 100;
  }

  if (payment.depositIncludedInPrice !== false) {
    depositUsd = Math.min(subtotalUsd, Math.max(0, depositUsd));
  } else {
    depositUsd = Math.max(0, depositUsd);
  }

  return Math.max(0, Math.round(depositUsd * 100));
}
