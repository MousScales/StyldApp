import { colors } from '../theme';

/** Stripe balance / balance-transaction status colors — use consistently across the app. */
export const STRIPE_BALANCE_COLORS = {
  available: '#15803d',
  processing: '#f59e0b',
  failed: '#dc2626',
  inTransit: '#92400e',
} as const;

export function balanceTransactionStatusLabel(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === 'available') return 'Available';
  if (s === 'pending') return 'Processing';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function balanceTransactionStatusColor(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === 'available') return STRIPE_BALANCE_COLORS.available;
  if (s === 'pending') return STRIPE_BALANCE_COLORS.processing;
  return colors.textMuted;
}

export function payoutStatusLabel(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === 'paid') return 'Paid';
  if (s === 'in_transit') return 'In transit';
  if (s === 'pending') return 'Pending';
  if (s === 'failed') return 'Failed';
  return status;
}

export function payoutStatusColor(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === 'paid') return STRIPE_BALANCE_COLORS.available;
  if (s === 'in_transit') return STRIPE_BALANCE_COLORS.inTransit;
  if (s === 'pending') return colors.textMuted;
  if (s === 'failed') return STRIPE_BALANCE_COLORS.failed;
  return colors.textMuted;
}

export function creditAmountColorForTransaction(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === 'pending') return STRIPE_BALANCE_COLORS.processing;
  return STRIPE_BALANCE_COLORS.available;
}
