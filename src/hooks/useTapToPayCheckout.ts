import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  chargeBookingInPerson,
  collectTapToPayPaymentFallback,
  confirmInPersonPayment,
  createInPersonPaymentIntent,
  fetchTerminalSession,
  type InPersonPayResult,
} from '../lib/bookingInPersonPay';
import { formatTapToPayError } from '../lib/tapToPayCompliance';

type TapToPayInput = {
  bookingId: string;
  subdomain: string;
  balanceCents: number;
  tipCents: number;
  customerEmail?: string;
};

export function useTapToPayCheckout() {
  const {
    initialize,
    easyConnect,
    retrievePaymentIntent,
    processPaymentIntent,
    connectedReader,
    isInitialized,
  } = useStripeTerminal();

  const collectTapToPayPayment = useCallback(
    async (input: TapToPayInput): Promise<InPersonPayResult> => {
      if (Platform.OS === 'web') {
        return collectTapToPayPaymentFallback(input);
      }

      const intent = await createInPersonPaymentIntent({
        ...input,
        tapToPay: true,
      });

      const session = await fetchTerminalSession(input.subdomain);

      if (!isInitialized) {
        const { error: initError } = await initialize();
        if (initError) throw new Error(initError.message);
      }

      if (!connectedReader) {
        const { error: connectError } = await easyConnect({
          discoveryMethod: 'tapToPay',
          locationId: session.locationId,
          merchantDisplayName: 'Styld',
          tosAcceptancePermitted: true,
        });
        if (connectError) throw new Error(formatTapToPayError(connectError.message));
      }

      const { paymentIntent, error: retrieveError } = await retrievePaymentIntent(
        intent.clientSecret,
      );
      if (retrieveError) throw new Error(retrieveError.message);
      if (!paymentIntent) throw new Error('Could not load payment.');

      const { error: processError } = await processPaymentIntent({
        paymentIntent,
        skipTipping: true,
      });
      if (processError) {
        if (processError.code === 'Canceled') throw new Error('Payment cancelled.');
        throw new Error(formatTapToPayError(processError.message));
      }

      await confirmInPersonPayment({
        bookingId: input.bookingId,
        subdomain: input.subdomain,
        paymentIntentId: intent.paymentIntentId,
        paymentMethod: 'tap_to_pay',
      });

      return intent;
    },
    [
      connectedReader,
      easyConnect,
      initialize,
      isInitialized,
      processPaymentIntent,
      retrievePaymentIntent,
    ],
  );

  const collectCardPayment = useCallback(
    async (input: TapToPayInput): Promise<InPersonPayResult> =>
      chargeBookingInPerson({
        ...input,
        paymentMethod: 'card',
      }),
    [],
  );

  return { collectTapToPayPayment, collectCardPayment };
}
