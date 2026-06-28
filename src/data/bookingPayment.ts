export type BookingPaymentMode = 'full' | 'deposit' | 'in_person';
export type DepositKind = 'percent' | 'fixed';

export type BookingPaymentSettings = {
  /** full = pay entire estimate online; deposit = partial online; in_person = book free, pay at appointment */
  mode: BookingPaymentMode;
  /** Used when mode is deposit */
  depositKind: DepositKind;
  /** Percent (1–100) or fixed dollar amount */
  depositValue: number;
  /**
   * When true (default), deposit counts toward the service total and reduces the in-person balance.
   * When false, deposit is an additional hold on top of the full service price.
   */
  depositIncludedInPrice: boolean;
  /** Whether clients must upload a current hair photo */
  requireCurrentHairPhoto: boolean;
  /** Whether clients must upload a reference image */
  requireReferencePhoto: boolean;
  /**
   * True only after the stylist explicitly saves deposit/full payment in Form & Payments.
   * Styld Pay setup alone never flips this — live bookings stay pay-in-person until then.
   */
  onlinePaymentsEnabled: boolean;
  /** When true, new site bookings stay pending until you accept them in the app. */
  requireBookingApproval: boolean;
};

export const DEFAULT_BOOKING_PAYMENT: BookingPaymentSettings = {
  mode: 'in_person',
  depositKind: 'percent',
  depositValue: 10,
  depositIncludedInPrice: true,
  requireCurrentHairPhoto: true,
  requireReferencePhoto: false,
  onlinePaymentsEnabled: false,
  requireBookingApproval: false,
};

export function onlinePaymentsRequired(mode: BookingPaymentMode): boolean {
  return mode === 'deposit' || mode === 'full';
}

/** Live + editor display: online modes only when stylist opted in and Styld Pay is ready. */
export function effectiveBookingPayment(
  payment: BookingPaymentSettings,
  onlinePaymentsReady: boolean,
): BookingPaymentSettings {
  if (!payment.onlinePaymentsEnabled || !onlinePaymentsRequired(payment.mode)) {
    return payment.mode === 'in_person' ? payment : { ...payment, mode: 'in_person' };
  }
  if (onlinePaymentsReady) {
    return payment;
  }
  return { ...payment, mode: 'in_person' };
}

/** Persisted shape when saving from Form & Payments. */
export function bookingPaymentToSave(payment: BookingPaymentSettings): BookingPaymentSettings {
  const onlinePaymentsEnabled = onlinePaymentsRequired(payment.mode);
  return {
    ...payment,
    onlinePaymentsEnabled,
    mode: onlinePaymentsEnabled ? payment.mode : 'in_person',
  };
}

export function computeDepositAmount(total: number, payment: BookingPaymentSettings): number {
  if (payment.mode !== 'deposit') return 0;
  const t = Math.max(0, total);
  let deposit =
    payment.depositKind === 'fixed'
      ? payment.depositValue
      : Math.round(t * (payment.depositValue / 100) * 100) / 100;
  if (payment.depositIncludedInPrice !== false) {
    deposit = Math.min(t, Math.max(0, deposit));
  } else {
    deposit = Math.max(0, deposit);
  }
  return deposit;
}

export function computeBalanceDue(total: number, payment: BookingPaymentSettings): number {
  if (payment.mode === 'in_person') return Math.max(0, total);
  if (payment.mode === 'full') return 0;
  const deposit = computeDepositAmount(total, payment);
  if (payment.depositIncludedInPrice !== false) {
    return Math.max(0, total - deposit);
  }
  return Math.max(0, total);
}

const VALID_MODES: BookingPaymentMode[] = ['full', 'deposit', 'in_person'];
const VALID_KINDS: DepositKind[] = ['percent', 'fixed'];

export function normalizeBookingPayment(value: unknown): BookingPaymentSettings {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const mode = VALID_MODES.includes(source.mode as BookingPaymentMode)
    ? (source.mode as BookingPaymentMode)
    : DEFAULT_BOOKING_PAYMENT.mode;

  const depositKind = VALID_KINDS.includes(source.depositKind as DepositKind)
    ? (source.depositKind as DepositKind)
    : DEFAULT_BOOKING_PAYMENT.depositKind;

  let depositValue =
    typeof source.depositValue === 'number' && Number.isFinite(source.depositValue)
      ? source.depositValue
      : DEFAULT_BOOKING_PAYMENT.depositValue;

  if (depositKind === 'percent') {
    depositValue = Math.min(100, Math.max(1, Math.round(depositValue)));
  } else {
    depositValue = Math.max(0, Math.round(depositValue * 100) / 100);
  }

  const requireCurrentHairPhoto =
    typeof source.requireCurrentHairPhoto === 'boolean'
      ? source.requireCurrentHairPhoto
      : DEFAULT_BOOKING_PAYMENT.requireCurrentHairPhoto;

  const requireReferencePhoto =
    typeof source.requireReferencePhoto === 'boolean'
      ? source.requireReferencePhoto
      : DEFAULT_BOOKING_PAYMENT.requireReferencePhoto;

  const depositIncludedInPrice =
    typeof source.depositIncludedInPrice === 'boolean'
      ? source.depositIncludedInPrice
      : DEFAULT_BOOKING_PAYMENT.depositIncludedInPrice;

  const onlinePaymentsEnabled =
    source.onlinePaymentsEnabled === true ||
    (source.onlinePaymentsEnabled == null && onlinePaymentsRequired(mode));

  const requireBookingApproval = source.requireBookingApproval === true;

  return {
    mode,
    depositKind,
    depositValue,
    depositIncludedInPrice,
    requireCurrentHairPhoto,
    requireReferencePhoto,
    onlinePaymentsEnabled,
    requireBookingApproval,
  };
}
