import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type PaymentLinkResult = {
  paymentLinkUrl: string;
  paymentLinkId: string;
  emailSent: boolean;
  fees: {
    balanceCents: number;
    tipCents: number;
    bookingAmountCents: number;
    serviceFeeCents: number;
    totalChargeCents: number;
  };
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

export async function createBookingPaymentLink(input: {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
  customerName?: string;
  serviceName?: string;
  sendEmail?: boolean;
}): Promise<PaymentLinkResult> {
  const { data, error } = await supabase.functions.invoke('stripe-booking-payment-link', {
    body: {
      bookingId: input.bookingId,
      subdomain: input.subdomain,
      balanceCents: input.balanceCents,
      tipCents: input.tipCents,
      customerEmail: input.customerEmail ?? null,
      customerName: input.customerName ?? null,
      serviceName: input.serviceName ?? null,
      sendEmail: input.sendEmail ?? true,
    },
  });

  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? error.message);
  }
  if (data?.error) throw new Error(String(data.error));

  const paymentLinkUrl = String(data.paymentLinkUrl ?? '');
  if (!paymentLinkUrl) throw new Error('Could not create payment link.');

  return {
    paymentLinkUrl,
    paymentLinkId: String(data.paymentLinkId ?? ''),
    emailSent: data.emailSent === true,
    fees: data.fees ?? {
      balanceCents: input.balanceCents,
      tipCents: input.tipCents,
      bookingAmountCents: input.balanceCents + input.tipCents,
      serviceFeeCents: 0,
      totalChargeCents: input.balanceCents + input.tipCents,
    },
  };
}
