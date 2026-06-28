import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MerchantEducationModal from '../../components/tapToPay/MerchantEducationModal';
import TapToPayPostConnectPrompt from '../../components/tapToPay/TapToPayPostConnectPrompt';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTapToPay } from '../../context/TapToPayContext';
import { readFlag, STORAGE_KEYS, writeFlag } from '../../lib/tapToPayCompliance';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';

type Props = {
  stripeReady: boolean;
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ConnectedAccounts'>;
};

/** Requirement 3.4 — prompt to enable Tap to Pay after Stripe Connect onboarding. */
export default function ConnectedAccountsTapToPayPrompt({ stripeReady, navigation }: Props) {
  const { sitePublish } = useOnboarding();
  const subdomain = sitePublish.subdomain?.trim() ?? '';
  const { connectTapToPay } = useTapToPay();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !stripeReady) return;
    void readFlag(STORAGE_KEYS.onboardingPromptSeen).then((seen) => {
      if (!seen) setShowPrompt(true);
    });
  }, [stripeReady]);

  const dismissPrompt = async () => {
    setShowPrompt(false);
    await writeFlag(STORAGE_KEYS.onboardingPromptSeen, true);
  };

  const handleEnable = async () => {
    await writeFlag(STORAGE_KEYS.onboardingPromptSeen, true);
    setShowPrompt(false);

    if (!subdomain) {
      navigation.navigate('TapToPaySettings');
      return;
    }

    await connectTapToPay(subdomain);
    setShowEducation(true);
  };

  return (
    <>
      <TapToPayPostConnectPrompt
        visible={showPrompt}
        onDismiss={() => void dismissPrompt()}
        onEnable={() => void handleEnable()}
      />
      <MerchantEducationModal
        visible={showEducation}
        onClose={() => setShowEducation(false)}
        onComplete={() => setShowEducation(false)}
      />
    </>
  );
}
