import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { fetchTerminalSession } from '../lib/bookingInPersonPay';
import { TAP_TO_PAY_NATIVE_ENABLED } from '../lib/tapToPayConfig';
import { formatTapToPayError, readFlag, STORAGE_KEYS, writeFlag } from '../lib/tapToPayCompliance';
import { useOnboarding } from './OnboardingContext';

type ConnectPhase = 'idle' | 'initializing' | 'ready' | 'error';

type TapToPayContextValue = {
  isSupported: boolean;
  readerConnected: boolean;
  connectPhase: ConnectPhase;
  connectMessage: string;
  educationCompleted: boolean;
  splashSeen: boolean;
  refreshFlags: () => Promise<void>;
  markEducationCompleted: () => Promise<void>;
  markSplashSeen: () => Promise<void>;
  /** Accept Apple/Stripe T&C and connect Tap to Pay reader (1.6 — via SDK, not local flag). */
  connectTapToPay: (subdomain: string) => Promise<{ ok: boolean; error?: string }>;
  warmUpReader: (subdomain: string) => Promise<void>;
};

const TapToPayContext = createContext<TapToPayContextValue | undefined>(undefined);

export function TapToPayProvider({ children }: { children: ReactNode }) {
  const { sitePublish } = useOnboarding();
  const subdomain = sitePublish.subdomain?.trim() ?? '';
  const {
    initialize,
    easyConnect,
    connectedReader,
    isInitialized,
  } = useStripeTerminal();

  const [connectPhase, setConnectPhase] = useState<ConnectPhase>('idle');
  const [connectMessage, setConnectMessage] = useState('');
  const [educationCompleted, setEducationCompleted] = useState(false);
  const [splashSeen, setSplashSeen] = useState(false);

  const isSupported =
    TAP_TO_PAY_NATIVE_ENABLED && Platform.OS === 'ios' && Boolean(subdomain);

  const refreshFlags = useCallback(async () => {
    setEducationCompleted(await readFlag(STORAGE_KEYS.educationCompleted));
    setSplashSeen(await readFlag(STORAGE_KEYS.splashSeen));
  }, []);

  useEffect(() => {
    void refreshFlags();
  }, [refreshFlags]);

  const warmUpReader = useCallback(
    async (sub: string) => {
      if (!isSupported || !sub) return;
      try {
        if (!isInitialized) {
          const { error } = await initialize();
          if (error) return;
        }
        if (connectedReader) return;
        const session = await fetchTerminalSession(sub);
        await easyConnect({
          discoveryMethod: 'tapToPay',
          locationId: session.locationId,
          merchantDisplayName: 'Styld',
          tosAcceptancePermitted: true,
        });
      } catch {
        // warm-up is best effort (requirement 1.5)
      }
    },
    [connectedReader, easyConnect, initialize, isInitialized, isSupported],
  );

  useEffect(() => {
    if (!isSupported || !subdomain) return;

    void warmUpReader(subdomain);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void warmUpReader(subdomain);
    });

    return () => sub.remove();
  }, [isSupported, subdomain, warmUpReader]);

  const connectTapToPay = useCallback(
    async (sub: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isSupported) {
        return { ok: false, error: 'Tap to Pay on iPhone is not available on this device.' };
      }
      if (!sub) {
        return { ok: false, error: 'Publish your site before enabling Tap to Pay.' };
      }

      setConnectPhase('initializing');
      setConnectMessage('Preparing Tap to Pay on iPhone…');

      try {
        if (!isInitialized) {
          const { error: initError } = await initialize();
          if (initError) throw new Error(initError.message);
        }

        const session = await fetchTerminalSession(sub);
        const { error: connectError } = await easyConnect({
          discoveryMethod: 'tapToPay',
          locationId: session.locationId,
          merchantDisplayName: 'Styld',
          tosAcceptancePermitted: true,
        });

        if (connectError) throw new Error(connectError.message);

        setConnectPhase('ready');
        setConnectMessage('Tap to Pay on iPhone is ready.');
        return { ok: true };
      } catch (err) {
        const message = formatTapToPayError(
          err instanceof Error ? err.message : 'Could not enable Tap to Pay.',
        );
        setConnectPhase('error');
        setConnectMessage(message);
        return { ok: false, error: message };
      }
    },
    [easyConnect, initialize, isInitialized, isSupported],
  );

  const markEducationCompleted = useCallback(async () => {
    await writeFlag(STORAGE_KEYS.educationCompleted, true);
    setEducationCompleted(true);
  }, []);

  const markSplashSeen = useCallback(async () => {
    await writeFlag(STORAGE_KEYS.splashSeen, true);
    setSplashSeen(true);
  }, []);

  const value = useMemo<TapToPayContextValue>(
    () => ({
      isSupported,
      readerConnected: Boolean(connectedReader),
      connectPhase,
      connectMessage,
      educationCompleted,
      splashSeen,
      refreshFlags,
      markEducationCompleted,
      markSplashSeen,
      connectTapToPay,
      warmUpReader,
    }),
    [
      connectMessage,
      connectPhase,
      connectTapToPay,
      connectedReader,
      educationCompleted,
      isSupported,
      markEducationCompleted,
      markSplashSeen,
      refreshFlags,
      warmUpReader,
    ],
  );

  return <TapToPayContext.Provider value={value}>{children}</TapToPayContext.Provider>;
}

export function useTapToPay() {
  const ctx = useContext(TapToPayContext);
  if (!ctx) {
    throw new Error('useTapToPay must be used within TapToPayProvider');
  }
  return ctx;
}
