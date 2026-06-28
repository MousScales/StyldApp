import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

export type InPersonPayResult = {
  clientSecret: string;
  paymentIntentId: string;
  balanceCents: number;
  tipCents: number;
};

export type TerminalSession = {
  secret: string;
  locationId: string;
  stripeAccountId?: string;
};

export async function createInPersonPaymentIntent(input: {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
  tapToPay?: boolean;
}): Promise<InPersonPayResult> {
  const { data: payData, error: payError } = await supabase.functions.invoke(
    'stripe-booking-inperson-pay',
    {
      body: {
        bookingId: input.bookingId,
        subdomain: input.subdomain,
        balanceCents: input.balanceCents,
        tipCents: input.tipCents,
        customerEmail: input.customerEmail ?? null,
        tapToPay: input.tapToPay ?? false,
      },
    },
  );

  if (payError) throw new Error(payError.message);
  if (payData?.error) throw new Error(String(payData.error));

  const clientSecret = String(payData.clientSecret ?? '');
  const paymentIntentId = String(payData.paymentIntentId ?? '');
  if (!clientSecret || !paymentIntentId) {
    throw new Error('Could not start payment.');
  }

  return {
    clientSecret,
    paymentIntentId,
    balanceCents: input.balanceCents,
    tipCents: input.tipCents,
  };
}

export async function confirmInPersonPayment(input: {
  bookingId: string;
  subdomain: string;
  paymentIntentId: string;
  paymentMethod?: 'card' | 'tap_to_pay';
}): Promise<void> {
  const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
    'stripe-booking-inperson-confirm',
    {
      body: {
        bookingId: input.bookingId,
        subdomain: input.subdomain,
        paymentIntentId: input.paymentIntentId,
        paymentMethod: input.paymentMethod ?? 'card',
      },
    },
  );

  if (confirmError) throw new Error(confirmError.message);
  if (confirmData?.error) throw new Error(String(confirmData.error));
}

async function presentPaymentSheetForIntent(clientSecret: string): Promise<void> {
  const { error: initError } = await initPaymentSheet({
    merchantDisplayName: 'Styld',
    paymentIntentClientSecret: clientSecret,
    allowsDelayedPaymentMethods: false,
  });
  if (initError) throw new Error(initError.message);

  const { error: presentError } = await presentPaymentSheet();
  if (presentError) {
    if (presentError.code === 'Canceled') {
      throw new Error('Payment cancelled.');
    }
    throw new Error(presentError.message);
  }
}

export async function chargeBookingInPerson(input: {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
  paymentMethod?: 'card' | 'tap_to_pay';
}): Promise<InPersonPayResult> {
  const intent = await createInPersonPaymentIntent({
    ...input,
    tapToPay: false,
  });

  await presentPaymentSheetForIntent(intent.clientSecret);

  await confirmInPersonPayment({
    bookingId: input.bookingId,
    subdomain: input.subdomain,
    paymentIntentId: intent.paymentIntentId,
    paymentMethod: input.paymentMethod ?? 'card',
  });

  return intent;
}

export async function fetchTerminalSession(subdomain: string): Promise<TerminalSession> {
  const { data, error } = await supabase.functions.invoke('stripe-terminal-connection-token', {
    body: { subdomain },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  const secret = String(data?.secret ?? '');
  const locationId = String(data?.locationId ?? '');
  if (!secret || !locationId) {
    throw new Error('Tap to Pay is not available yet.');
  }
  return {
    secret,
    locationId,
    stripeAccountId: data?.stripeAccountId ? String(data.stripeAccountId) : undefined,
  };
}

/** @deprecated Use fetchTerminalSession */
export async function fetchTerminalConnectionToken(subdomain: string): Promise<string> {
  const session = await fetchTerminalSession(subdomain);
  return session.secret;
}

/** Payment sheet fallback when Terminal native module is unavailable (web / no rebuild). */
export async function collectTapToPayPaymentFallback(input: {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
}): Promise<InPersonPayResult> {
  const intent = await createInPersonPaymentIntent({
    ...input,
    tapToPay: true,
  });

  await presentPaymentSheetForIntent(intent.clientSecret);

  await confirmInPersonPayment({
    bookingId: input.bookingId,
    subdomain: input.subdomain,
    paymentIntentId: intent.paymentIntentId,
    paymentMethod: 'tap_to_pay',
  });

  return intent;
}

/** @deprecated Use useTapToPayCheckout hook inside StripeTerminalAppProvider */
export async function collectTapToPayPayment(input: {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
}): Promise<InPersonPayResult> {
  return collectTapToPayPaymentFallback(input);
}
