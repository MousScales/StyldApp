import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveBankDomain } from '../lib/institutionDomains';
import { useFocusEffect } from '@react-navigation/native';
import { usePrivacyMode } from '../context/PrivacyContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  fetchStripeConnectStatus,
  formatUsdFromCents,
  openStripeConnectDashboard,
  requestStripeConnectPayout,
  resolveStripeConnectUrl,
  startStripeConnectOnboarding,
  syncStripeConnect,
  type StripeConnectSummary,
} from '../lib/stripeConnect';
import { colors, fonts } from '../theme';
import MoneyAmountLoader from './MoneyAmountLoader';
import StripeBalanceSubline from './stripe/StripeBalanceSubline';
import StripeConnectWebModal from './stripe/StripeConnectWebModal';

const LOGOKIT_TOKEN = process.env.EXPO_PUBLIC_LOGOKIT_TOKEN ?? '';
function bankLogoUrl(bankName?: string): string | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase();
  const domain = lower.includes('stripe') ? 'stripe.com' : (resolveBankDomain(bankName) ?? null);
  if (!domain || !LOGOKIT_TOKEN) return null;
  return `https://img.logokit.com/${domain}?token=${LOGOKIT_TOKEN}`;
}

type Props = {
  onSummaryChange?: (summary: StripeConnectSummary | null) => void;
  /** When true, show a setup banner until Stripe Connect is ready; then show earnings UI */
  showOnlyWhenActive?: boolean;
  /** Navigate to the full payouts screen (activity, history, etc.) */
  onOpenPayouts?: () => void;
};

export default function WalletBalanceSection({ onSummaryChange, showOnlyWhenActive, onOpenPayouts }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { hasLinkedSite } = useSiteData();
  const { privacyMode } = usePrivacyMode();
  const [summary, setSummary] = useState<StripeConnectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectModalTitle, setConnectModalTitle] = useState('Styld Pay');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasLinkedSite) return;
    setLoading(true);
    setBalanceError(null);
    try {
      const data = await fetchStripeConnectStatus();
      setSummary(data);
      onSummaryChange?.(data);
      if (data.hasAccount && data.balanceLive === false) {
        setBalanceError(data.balanceError ?? 'Could not verify balance with Stripe');
      }
    } catch {
      setSummary(null);
      setBalanceError('Could not load payout account');
      onSummaryChange?.(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [hasLinkedSite, onSummaryChange]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const isReady = summary?.status === 'ready';
  const isPending = summary?.status === 'pending_review' || summary?.status === 'onboarding';
  const needsOnboarding = !summary?.hasAccount || summary?.status === 'not_started';
  const canPayout = isReady && summary?.balanceLive !== false && (summary?.balanceAvailableCents ?? 0) >= 100;

  async function handleSetupPayments() {
    setBusy(true);
    try {
      const result = await startStripeConnectOnboarding();
      const url = resolveStripeConnectUrl(result);
      if (!url) throw new Error('Could not open Stripe Connect');
      setConnectModalTitle('Styld Pay');
      setConnectUrl(url);
    } catch (err) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncAfterOnboarding() {
    setBusy(true);
    try {
      for (let i = 0; i < 4; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 2500));
        const result = await syncStripeConnect();
        if (result.status === 'ready' || result.status === 'pending_review') {
          await refresh();
          if (result.status === 'pending_review') {
            Alert.alert(
              'Almost there',
              'We\'re verifying your account. Payouts will be enabled shortly — check back in a few minutes.',
            );
          }
          return;
        }
      }
      await refresh();
    } catch (err) {
      Alert.alert('Sync error', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenStripeDashboard() {
    setBusy(true);
    try {
      const url = await openStripeConnectDashboard();
      setConnectModalTitle('Stripe account');
      setConnectUrl(url);
    } catch (err) {
      Alert.alert('Could not open Stripe', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  function handlePayoutPress() {
    if (canPayout && summary?.balanceLive !== false) {
      void handlePayout();
      return;
    }
    onOpenPayouts?.();
  }

  async function handlePayout() {
    const cents = summary?.balanceAvailableCents ?? 0;
    if (summary?.balanceLive === false) {
      Alert.alert('Balance unavailable', 'We could not verify your live balance with Stripe. Tap the amount to refresh and try again.');
      return;
    }
    if (cents < 100) {
      Alert.alert('Nothing to withdraw', 'Available balance must be at least $1.00.');
      return;
    }
    Alert.alert(
      'Withdraw?',
      `${formatUsdFromCents(cents)} will be sent to your bank account (1–2 business days).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: () =>
            void (async () => {
              setBusy(true);
              try {
                const result = await requestStripeConnectPayout();
                await refresh();
                Alert.alert(
                  'Payout started!',
                  `${formatUsdFromCents(result.amountCents)} is on its way to your bank. Usually arrives within 1–2 business days.`,
                );
              } catch (err) {
                Alert.alert('Payout failed', err instanceof Error ? err.message : 'Try again');
              } finally {
                setBusy(false);
              }
            })(),
        },
      ],
    );
  }

  function handleAmountPress() {
    if (loading || !initialized) return;
    if (isReady && onOpenPayouts) {
      onOpenPayouts();
      return;
    }
    void refresh();
  }

  if (!hasLinkedSite) {
    if (showOnlyWhenActive) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Link your booking site to start collecting payments.</Text>
      </View>
    );
  }

  const showSetupOnly = Boolean(showOnlyWhenActive && !isReady);
  const showSetupLoader = showSetupOnly && (loading || !initialized);

  if (showSetupOnly) {
    return (
      <>
        <View style={styles.setupBanner}>
          {showSetupLoader ? (
            <ActivityIndicator color={colors.accentPink} style={styles.setupBannerLoader} />
          ) : (
            <>
              <View style={styles.setupBannerIcon}>
                <Ionicons name="wallet-outline" size={22} color={colors.accentPink} />
              </View>
              <Text style={styles.setupBannerTitle}>
                {needsOnboarding ? 'Set up Styld Pay' : 'Finish Styld Pay setup'}
              </Text>
              <Text style={styles.setupBannerSub}>
                {needsOnboarding
                  ? 'Connect your bank to accept online deposits and receive payouts.'
                  : 'Complete verification in Stripe to start receiving payouts.'}
              </Text>
              <Pressable
                style={[styles.setupBannerBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => void handleSetupPayments()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.setupBannerBtnText}>
                    {summary?.hasAccount ? 'Continue in Stripe' : 'Set up Styld Pay'}
                  </Text>
                )}
              </Pressable>
              {isPending ? (
                <Pressable style={styles.statusLink} disabled={busy} onPress={() => void handleSyncAfterOnboarding()}>
                  <Text style={styles.statusLinkText}>Refresh status</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <StripeConnectWebModal
          visible={!!connectUrl}
          url={connectUrl}
          title={connectModalTitle}
          onClose={() => setConnectUrl(null)}
          onDone={() => {
            setConnectUrl(null);
            void handleSyncAfterOnboarding();
          }}
        />
      </>
    );
  }

  const showLoader = loading || !initialized;

  const bank = summary?.bankAccount;
  const totalUnpaid = (summary?.balanceAvailableCents ?? 0) + (summary?.balancePendingCents ?? 0);

  return (
    <>
      <View style={styles.wrap}>
        {/* Big centred amount */}
        <Pressable onPress={handleAmountPress} hitSlop={16} disabled={showLoader} style={styles.amountWrap}>
          {showLoader ? (
            <MoneyAmountLoader size="profile" showSubtitle />
          ) : (
            <Text style={styles.amount}>
              {privacyMode ? '••••' : formatUsdFromCents(totalUnpaid)}
            </Text>
          )}
        </Pressable>

        {/* Small muted sub-line */}
        {isReady && !showLoader && (
          <StripeBalanceSubline
            availableCents={summary?.balanceAvailableCents ?? 0}
            pendingCents={summary?.balancePendingCents ?? 0}
            privacyMode={privacyMode}
            style={styles.subLine}
          />
        )}
        {isReady && !showLoader && balanceError ? (
          <Text style={styles.balanceErrorText}>Could not verify · tap amount to refresh</Text>
        ) : null}

        {/* Bank tag + payout inline row */}
        {isReady ? (
          <View style={styles.inlineRow}>
            {bank && (
              <View style={styles.bankTag}>
                {bankLogoUrl(bank.bankName) ? (
                  <Image source={{ uri: bankLogoUrl(bank.bankName)! }} style={styles.bankTagLogo} resizeMode="contain" />
                ) : (
                  <Ionicons name="business-outline" size={11} color={colors.textMuted} />
                )}
                <Text style={styles.bankTagText}>{bank.bankName ?? 'Bank'} ••{bank.last4}</Text>
              </View>
            )}
            <Pressable
              style={[styles.payoutBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={handlePayoutPress}
            >
              {busy
                ? <ActivityIndicator color={colors.accentPink} size="small" />
                : <Text style={styles.payoutBtnText}>{canPayout ? 'Pay out' : 'View payouts'}</Text>
              }
            </Pressable>
          </View>
        ) : !isReady ? (
          <View style={styles.pendingActions}>
            <Pressable style={[styles.actionBtn, busy && styles.btnDisabled]} disabled={busy} onPress={() => void handleSetupPayments()}>
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.actionBtnText}>{summary?.hasAccount ? 'Continue in Stripe' : 'Set up Styld Pay'}</Text>
              }
            </Pressable>
            {isPending && (
              <Pressable style={styles.statusLink} disabled={busy} onPress={() => void handleSyncAfterOnboarding()}>
                <Text style={styles.statusLinkText}>Refresh status</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {isReady && !showLoader ? (
          <Pressable
            style={styles.stripeManageLink}
            disabled={busy}
            onPress={() => void handleOpenStripeDashboard()}
          >
            <Ionicons name="open-outline" size={14} color={colors.accentPink} />
            <Text style={styles.stripeManageLinkText}>Manage in Stripe</Text>
          </Pressable>
        ) : null}
      </View>

      <StripeConnectWebModal
        visible={!!connectUrl}
        url={connectUrl}
        title={connectModalTitle}
        onClose={() => setConnectUrl(null)}
        onDone={() => {
          setConnectUrl(null);
          void handleSyncAfterOnboarding();
        }}
      />
    </>
  );
}

const BASE_STYLES = {
  wrap: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
    gap: 6,
  },
  amountWrap: { alignItems: 'center' },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: fonts.number,
    color: colors.text,
    letterSpacing: -2,
  },
  subLine: {
    marginTop: 0,
  },
  balanceErrorText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bankTagLogo: { width: 14, height: 14, borderRadius: 3 },
  bankTagText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  payoutBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.accentPink,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  payoutBtnText: { color: colors.accentPink, fontSize: 13, fontWeight: '700' },
  stripeManageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginTop: 2,
  },
  stripeManageLinkText: { color: colors.accentPink, fontSize: 13, fontWeight: '600' },

  actionBtn: {
    marginTop: 10,
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  actionBtnMuted: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pendingActions: { alignItems: 'center', gap: 6 },
  statusLink: { paddingVertical: 6, paddingHorizontal: 10 },
  statusLinkText: { color: colors.accentPink, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },

  emptyText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  setupBanner: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
    gap: 8,
  },
  setupBannerLoader: {
    paddingVertical: 12,
  },
  setupBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  setupBannerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  setupBannerSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  setupBannerBtn: {
    marginTop: 4,
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  setupBannerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
};
