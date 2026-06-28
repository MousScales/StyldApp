import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTapToPay } from '../../context/TapToPayContext';
import { useSiteData } from '../../context/SiteDataContext';
import { fetchStripeConnectStatus } from '../../lib/stripeConnect';
import { readFlag, STORAGE_KEYS, writeFlag } from '../../lib/tapToPayCompliance';
import MerchantEducationModal from './MerchantEducationModal';
import TapToPaySplashModal from './TapToPaySplashModal';

/** Hero splash (6.2) + one-time in-app notification (6.3). Launch email (6.1) is marketing-side. */
export default function TapToPayCoordinator() {
  const { hasLinkedSite } = useSiteData();
  const { sitePublish } = useOnboarding();
  const subdomain = sitePublish.subdomain?.trim() ?? '';
  const {
    isSupported,
    splashSeen,
    markSplashSeen,
    markEducationCompleted,
    connectTapToPay,
  } = useTapToPay();

  const [stripeReady, setStripeReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  useEffect(() => {
    if (!isSupported || !hasLinkedSite) return;
    void fetchStripeConnectStatus()
      .then((s) => setStripeReady(s.status === 'ready'))
      .catch(() => setStripeReady(false));
  }, [hasLinkedSite, isSupported]);

  useEffect(() => {
    if (!isSupported || !stripeReady || splashSeen) return;
    setShowSplash(true);
  }, [isSupported, splashSeen, stripeReady]);

  useEffect(() => {
    if (!isSupported || !stripeReady) return;
    void (async () => {
      if (await readFlag(STORAGE_KEYS.announcePushSent)) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Tap to Pay on iPhone',
          body: 'Accept contactless payments on your iPhone when you finish appointments.',
        },
        trigger: null,
      });
      await writeFlag(STORAGE_KEYS.announcePushSent, true);
    })();
  }, [isSupported, stripeReady]);

  const finishEnable = async () => {
    if (subdomain) {
      await connectTapToPay(subdomain);
    }
    setShowEducation(true);
  };

  if (Platform.OS !== 'ios' || !isSupported) return null;

  return (
    <>
      <TapToPaySplashModal
        visible={showSplash}
        onDismiss={async () => {
          setShowSplash(false);
          await markSplashSeen();
        }}
        onEnable={async () => {
          setShowSplash(false);
          await markSplashSeen();
          await finishEnable();
        }}
      />
      <MerchantEducationModal
        visible={showEducation}
        onClose={() => setShowEducation(false)}
        onComplete={async () => {
          await markEducationCompleted();
          setShowEducation(false);
        }}
      />
    </>
  );
}
