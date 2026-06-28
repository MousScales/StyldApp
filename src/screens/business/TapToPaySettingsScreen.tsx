import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MerchantEducationModal from '../../components/tapToPay/MerchantEducationModal';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTapToPay } from '../../context/TapToPayContext';
import { fetchStripeConnectStatus } from '../../lib/stripeConnect';
import { TAP_TO_PAY_BUTTON_LABEL } from '../../lib/tapToPayCompliance';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = NativeStackScreenProps<ProfileStackParamList, 'TapToPaySettings'>;

export default function TapToPaySettingsScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { sitePublish } = useOnboarding();
  const subdomain = sitePublish.subdomain?.trim() ?? '';
  const {
    isSupported,
    readerConnected,
    connectPhase,
    connectMessage,
    educationCompleted,
    connectTapToPay,
    markEducationCompleted,
  } = useTapToPay();

  const [stripeReady, setStripeReady] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [showEducation, setShowEducation] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshStripe = useCallback(async () => {
    setLoadingStripe(true);
    try {
      const summary = await fetchStripeConnectStatus();
      setStripeReady(summary.status === 'ready');
    } catch {
      setStripeReady(false);
    } finally {
      setLoadingStripe(false);
    }
  }, []);

  useEffect(() => {
    void refreshStripe();
  }, [refreshStripe]);

  const handleEnable = async () => {
    if (!subdomain) {
      Alert.alert('Publish your site', 'Publish your booking site before enabling Tap to Pay.');
      return;
    }
    if (!stripeReady) {
      Alert.alert(
        'Set up Styld Pay',
        'Complete Stripe Connect setup first.',
        [{ text: 'Open Styld Pay', onPress: () => navigation.navigate('ConnectedAccounts') }],
      );
      return;
    }

    setBusy(true);
    const result = await connectTapToPay(subdomain);
    setBusy(false);

    if (!result.ok) {
      Alert.alert('Could not enable', result.error ?? 'Try again.');
      return;
    }

    setShowEducation(true);
  };

  if (!isSupported) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.muted}>Tap to Pay on iPhone is only available on supported iPhones.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Accept contactless cards and digital wallets on your iPhone when you finish appointments.
        </Text>

        <View style={styles.statusCard}>
          <StatusRow
            label="Styld Pay"
            value={loadingStripe ? '…' : stripeReady ? 'Active' : 'Not set up'}
            ok={stripeReady}
          />
          <StatusRow
            label={TAP_TO_PAY_BUTTON_LABEL}
            value={
              readerConnected
                ? 'Ready'
                : connectPhase === 'initializing'
                  ? 'Preparing…'
                  : 'Not enabled'
            }
            ok={readerConnected}
          />
          <StatusRow
            label="Merchant education"
            value={educationCompleted ? 'Completed' : 'Not viewed'}
            ok={educationCompleted}
          />
        </View>

        {connectPhase === 'initializing' && (
          <View style={styles.progressCard}>
            <ActivityIndicator color={colors.accentPink} />
            <Text style={styles.progressText}>{connectMessage || 'Initializing Tap to Pay…'}</Text>
          </View>
        )}

        {!stripeReady && !loadingStripe ? (
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('ConnectedAccounts')}>
            <Text style={styles.secondaryBtnText}>Set up Styld Pay</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, (busy || readerConnected) && styles.btnDisabled]}
          disabled={busy || readerConnected}
          onPress={() => void handleEnable()}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {readerConnected ? 'Tap to Pay enabled' : 'Enable Tap to Pay on iPhone'}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => setShowEducation(true)}>
          <Ionicons name="book-outline" size={18} color={colors.accentPink} />
          <Text style={styles.linkBtnText}>How to accept payments</Text>
        </Pressable>
      </ScrollView>

      <MerchantEducationModal
        visible={showEducation}
        onClose={() => setShowEducation(false)}
        onComplete={async () => {
          await markEducationCompleted();
          setShowEducation(false);
        }}
      />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Tap to Pay</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: ok ? '#22c55e' : colors.textMuted }]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  lead: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, color: colors.text, fontSize: 15 },
  statusValue: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  progressText: { color: colors.textMuted, flex: 1, fontSize: 14 },
  primaryBtn: {
    backgroundColor: colors.accentPink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  linkBtnText: { color: colors.accentPink, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.55 },
};
