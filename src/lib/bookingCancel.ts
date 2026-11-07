import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type BookingCancelResult = {
  ok: boolean;
  refundStatus?: string;
  refundAmountCents?: number;
  error?: string;
};

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const body = await error.context.json();
    if (body && typeof body === 'object') {
      if ('error' in body && body.error) return String(body.error);
      if ('message' in body && body.message) return String(body.message);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function cancelBookingViaEdge(
  bookingId: string,
  subdomain: string,
  cancelledBy: 'client' | 'stylist',
  contact?: string,
): Promise<BookingCancelResult> {
  const slug = subdomain.trim();
  if (!slug) {
    return { ok: false, error: 'Site subdomain is not configured.' };
  }

  const body: Record<string, string> = {
    bookingId,
    subdomain: slug,
    cancelledBy,
  };
  if (cancelledBy === 'client' && contact?.trim()) {
    body.contact = contact.trim();
  }

  const { data, error } = await supabase.functions.invoke<
    BookingCancelResult & { error?: string }
  >('booking-cancel', { body });

  if (error) {
    const detail = await readFunctionError(error);
    return { ok: false, error: detail || error.message || 'Cancellation failed' };
  }
  if (!data?.ok) {
    return { ok: false, error: data?.error || 'Cancellation failed' };
  }
  return data;
}
