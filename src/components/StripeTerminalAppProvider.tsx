import { StripeTerminalProvider, useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { TapToPayProvider } from '../context/TapToPayContext';
import { useOnboarding } from '../context/OnboardingContext';
import { fetchTerminalSession } from '../lib/bookingInPersonPay';

function StripeTerminalInitializer({ children }: { children: React.ReactElement }) {
  const { initialize } = useStripeTerminal();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return children;
}

export default function StripeTerminalAppProvider({ children }: { children: React.ReactElement }) {
  const { sitePublish } = useOnboarding();
  const subdomainRef = useRef(sitePublish.subdomain ?? '');
  subdomainRef.current = sitePublish.subdomain ?? '';

  const tokenProvider = useCallback(async () => {
    const subdomain = subdomainRef.current;
    if (!subdomain) throw new Error('Publish your site before using Tap to Pay.');
    const session = await fetchTerminalSession(subdomain);
    return session.secret;
  }, []);

  if (Platform.OS === 'web') {
    return children;
  }

  return (
    <StripeTerminalProvider tokenProvider={tokenProvider}>
      <StripeTerminalInitializer>
        <TapToPayProvider>
          <View style={{ flex: 1 }}>{children}</View>
        </TapToPayProvider>
      </StripeTerminalInitializer>
    </StripeTerminalProvider>
  );
}
