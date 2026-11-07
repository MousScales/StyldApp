import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BusinessScreenLayout from '../../components/business/BusinessScreenLayout';
import BookingSettingsEditor from '../../components/business/BookingSettingsEditor';
import ScreenGradient from '../../components/ScreenGradient';
import { useSiteData } from '../../context/SiteDataContext';
import {
  fetchStripeConnectStatus,
  formatUsdFromCents,
  openStripeConnectDashboard,
  requestStripeConnectPayout,
  resolveStripeConnectUrl,
  startStripeConnectOnboarding,
  syncStripeConnect,
  type StripeBalanceTransaction,
  type StripeConnectSummary,
  type StripePayout,
} from '../../lib/stripeConnect';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { colors, fonts } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { resolveBankDomain } from '../../lib/institutionDomains';
import { flatListStyles } from '../../theme/flatList';
import StripeBalanceSplit from '../../components/stripe/StripeBalanceSplit';
import StripeConnectWebModal from '../../components/stripe/StripeConnectWebModal';
import StripeStatusBadge from '../../components/stripe/StripeStatusBadge';
import {
  computeChargeBreakdown,
  estimateStripeProcessingFeeCents,
  PLATFORM_FEE_LABEL,
} from '../../lib/bookingServiceFee';
import {
  balanceTransactionStatusColor,
  balanceTransactionStatusLabel,
  creditAmountColorForTransaction,
  payoutStatusColor,
  payoutStatusLabel,
} from '../../lib/stripeBalanceDisplay';

const LOGOKIT_TOKEN = process.env.EXPO_PUBLIC_LOGOKIT_TOKEN ?? '';
function bankLogoUrl(bankName?: string): string | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase();
  const domain = lower.includes('stripe') ? 'stripe.com' : (resolveBankDomain(bankName) ?? null);
  if (!domain || !LOGOKIT_TOKEN) return null;
  return `https://img.logokit.com/${domain}?token=${LOGOKIT_TOKEN}`;
}

export type PaymentsTab = 'booking' | 'payouts';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Payments'>;

// ─── Tab bars ─────────────────────────────────────────────────────────────────

const TABS: { id: PaymentsTab; label: string }[] = [
  { id: 'booking', label: 'Form' },
  { id: 'payouts', label: 'Payouts' },
];

function TabBar({ active, onChange }: { active: PaymentsTab; onChange: (t: PaymentsTab) => void }) {
  const tabStyles = useResponsiveStyles(BASE_TAB_STYLES);

  return (
    <View style={tabStyles.wrap}>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[tabStyles.item, isActive && tabStyles.itemActive]}
            onPress={() => onChange(tab.id)}
          >
            <Text style={[tabStyles.itemText, isActive && tabStyles.itemTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BASE_TAB_STYLES = {
  wrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  itemActive: {
    borderBottomColor: colors.accentPink,
  },
  itemText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  itemTextActive: { color: colors.text },
};

type ActivityTab = 'transactions' | 'payouts';

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'payouts', label: 'Payout history' },
];

function transactionTypeLabel(type: string): string {
  switch (type) {
    case 'charge':
    case 'payment':
      return 'Payment';
    case 'payout':
      return 'Payout';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    case 'stripe_fee':
      return 'Stripe fee';
    case 'application_fee':
      return 'Platform fee';
    case 'transfer':
      return 'Transfer';
    default:
      return type.replace(/_/g, ' ');
  }
}

function formatActivityDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatActivityDateTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function shortStripeId(id: string | null | undefined): string {
  if (!id) return '';
  const tail = id.length > 10 ? id.slice(-8) : id;
  return `#${tail}`;
}

function isPaymentTransaction(txn: StripeBalanceTransaction): boolean {
  return txn.type === 'charge' || txn.type === 'payment';
}

function resolvePaymentDisplay(txn: StripeBalanceTransaction): {
  checkoutTotalCents: number;
  youReceiveCents: number;
  platformFeeCents: number;
  stripeFeeDeductedCents: number;
  stripeFeeInfoCents: number;
} {
  const youReceiveCents = Math.abs(txn.netCents);
  const amountCents = Math.abs(txn.amountCents);
  const totalDeducted = Math.max(0, amountCents - youReceiveCents);
  const estimatedCheckout = computeChargeBreakdown(youReceiveCents, 'client').chargeCents;
  const checkoutTotalCents = totalDeducted > 0 ? amountCents : estimatedCheckout;
  const stripeEstimate = estimateStripeProcessingFeeCents(checkoutTotalCents);

  let platformFeeCents = Math.max(0, txn.platformFeeCents ?? 0);
  if (platformFeeCents === 0 && txn.feeCents > 0 && txn.feeCents <= totalDeducted + 1) {
    platformFeeCents = txn.feeCents;
  }
  if (platformFeeCents === 0 && totalDeducted > 0) {
    platformFeeCents = Math.min(
      totalDeducted,
      computeChargeBreakdown(youReceiveCents, 'tenant').platformProfitCents,
    );
  }
  if (totalDeducted > 0) {
    platformFeeCents = Math.min(platformFeeCents, totalDeducted);
  }

  const stripeFeeDeductedCents =
    totalDeducted > platformFeeCents ? totalDeducted - platformFeeCents : 0;

  return {
    checkoutTotalCents,
    youReceiveCents,
    platformFeeCents,
    stripeFeeDeductedCents,
    stripeFeeInfoCents: stripeFeeDeductedCents > 0 ? 0 : stripeEstimate,
  };
}

function transactionHeadline(txn: StripeBalanceTransaction): string {
  const desc = txn.description?.trim();
  if (desc) return desc;
  return transactionTypeLabel(txn.type);
}

function transactionDetailLine(txn: StripeBalanceTransaction): string {
  if (isPaymentTransaction(txn)) {
    const display = resolvePaymentDisplay(txn);
    const parts = [`Client paid ${formatUsdFromCents(display.checkoutTotalCents)}`];
    if (display.stripeFeeDeductedCents > 0) {
      parts.push(
        `Stripe processing fee −${formatUsdFromCents(display.stripeFeeDeductedCents)}`,
      );
    }
    if (display.platformFeeCents > 0) {
      parts.push(`${PLATFORM_FEE_LABEL} −${formatUsdFromCents(display.platformFeeCents)}`);
    }
    return parts.join(' · ');
  }

  if (txn.amountCents !== txn.netCents || txn.feeCents > 0) {
    const parts: string[] = [`Amount ${formatUsdFromCents(Math.abs(txn.amountCents))}`];
    if (txn.feeCents > 0) parts.push(`Fees −${formatUsdFromCents(txn.feeCents)}`);
    return parts.join(' · ');
  }

  return `Amount ${formatUsdFromCents(Math.abs(txn.amountCents))}`;
}

function transactionReceiveLine(txn: StripeBalanceTransaction): string | null {
  if (isPaymentTransaction(txn)) {
    const { youReceiveCents } = resolvePaymentDisplay(txn);
    return `You receive ${formatUsdFromCents(youReceiveCents)}`;
  }
  if (txn.amountCents === txn.netCents && txn.feeCents === 0) {
    return null;
  }
  return `You receive ${formatUsdFromCents(Math.abs(txn.netCents))}`;
}

function transactionMetaLine(txn: StripeBalanceTransaction): string {
  const parts = [formatActivityDateTime(txn.createdAt)];
  if (txn.availableOn && txn.status === 'pending') {
    parts.push(`Available ${formatActivityDate(txn.availableOn)}`);
  }
  if (isPaymentTransaction(txn)) {
    const { stripeFeeInfoCents } = resolvePaymentDisplay(txn);
    if (stripeFeeInfoCents > 0) {
      parts.push(
        `Stripe card processing (~${formatUsdFromCents(stripeFeeInfoCents)}) covered at checkout`,
      );
    }
  }
  if (txn.sourceId) parts.push(shortStripeId(txn.sourceId));
  return parts.join(' · ');
}

function ActivityTabBar({
  active,
  onChange,
}: {
  active: ActivityTab;
  onChange: (tab: ActivityTab) => void;
}) {
  const tabStyles = useResponsiveStyles(BASE_ACTIVITY_TAB_STYLES);

  return (
    <View style={tabStyles.wrap}>
      {ACTIVITY_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[tabStyles.item, isActive && tabStyles.itemActive]}
            onPress={() => onChange(tab.id)}
          >
            <Text style={[tabStyles.itemText, isActive && tabStyles.itemTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BASE_ACTIVITY_TAB_STYLES = {
  wrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  itemActive: {
    borderBottomColor: colors.accentPink,
  },
  itemText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  itemTextActive: { color: colors.text },
};

function TransactionsList({ items }: { items: StripeBalanceTransaction[] }) {
  const pStyles = useResponsiveStyles(BASE_P_STYLES);

  if (!items.length) {
    return (
      <Text style={pStyles.activityInlineEmpty}>
        No transactions yet. Client payments, fees, and refunds will appear here.
      </Text>
    );
  }

  return (
    <View style={flatListStyles.listGroup}>
      {items.map((txn, index) => {
        const isCredit = txn.netCents >= 0;
        const receiveLine = transactionReceiveLine(txn);
        const statusColor = balanceTransactionStatusColor(txn.status);
        const showTxnStatus = isPaymentTransaction(txn);
        const amountColor = isCredit
          ? creditAmountColorForTransaction(txn.status)
          : colors.text;
        return (
          <View
            key={txn.id}
            style={[flatListStyles.row, index === items.length - 1 && flatListStyles.rowLast]}
          >
            <View style={pStyles.activityRowBody}>
              <View style={pStyles.activityRowTop}>
                <Text style={pStyles.activityTitle} numberOfLines={2}>
                  {transactionHeadline(txn)}
                </Text>
                <Text style={[pStyles.activityAmount, { color: amountColor }, !isCredit && pStyles.activityAmountDebit]}>
                  {isCredit ? '+' : '−'}
                  {formatUsdFromCents(Math.abs(txn.netCents))}
                </Text>
              </View>
              <Text style={pStyles.activityDetail}>{transactionDetailLine(txn)}</Text>
              {receiveLine ? (
                <Text style={[pStyles.activityReceive, { color: amountColor }]}>{receiveLine}</Text>
              ) : null}
              <Text style={pStyles.activityMeta}>{transactionMetaLine(txn)}</Text>
            </View>
            {showTxnStatus ? (
              <StripeStatusBadge
                label={balanceTransactionStatusLabel(txn.status)}
                color={statusColor}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function PayoutHistoryList({
  items,
  bankLast4,
}: {
  items: StripePayout[];
  bankLast4?: string;
}) {
  const pStyles = useResponsiveStyles(BASE_P_STYLES);

  if (!items.length) {
    return (
      <Text style={pStyles.activityInlineEmpty}>
        No payouts yet. Tap Pay out above when you have an available balance.
      </Text>
    );
  }

  const bankLabel = bankLast4 ? `Bank ••${bankLast4}` : 'Your bank';

  return (
    <View style={flatListStyles.listGroup}>
      {items.map((payout, index) => (
        <View
          key={payout.id}
          style={[flatListStyles.row, index === items.length - 1 && flatListStyles.rowLast]}
        >
          <View style={pStyles.activityRowBody}>
            <View style={pStyles.activityRowTop}>
              <Text style={pStyles.activityTitle}>Payout to {bankLabel}</Text>
              <Text style={pStyles.activityAmount}>
                {formatUsdFromCents(payout.amountCents)}
              </Text>
            </View>
            <Text style={pStyles.activityDetail}>
              Requested {formatActivityDateTime(payout.createdAt)}
              {payout.description?.trim() ? ` · ${payout.description.trim()}` : ''}
            </Text>
            <Text style={pStyles.activityMeta}>
              Arrives {formatActivityDate(payout.arrivalDate)}
              {' · '}
              {shortStripeId(payout.id)}
            </Text>
          </View>
          <StripeStatusBadge
            label={payoutStatusLabel(payout.status)}
            color={payoutStatusColor(payout.status)}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Payouts tab ──────────────────────────────────────────────────────────────

function PayoutsTab() {
  const pStyles = useResponsiveStyles(BASE_P_STYLES);
  const [summary, setSummary] = useState<StripeConnectSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectModalTitle, setConnectModalTitle] = useState('Styld Pay');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>('transactions');
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else if (!hasLoadedRef.current) setInitialLoading(true);
    setRefreshError(null);
    try {
      const data = await fetchStripeConnectStatus();
      setSummary(data);
      if (data.hasAccount && data.balanceLive === false) {
        setRefreshError(data.balanceError ?? 'Could not verify balance with Stripe. Showing last known amounts.');
      }
    } catch (err) {
      if (!silent) setSummary(null);
      setRefreshError(err instanceof Error ? err.message : 'Could not load payout account');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      void refreshRef.current(hasLoadedRef.current);
    }, []),
  );

  async function handleOpenOnboarding() {
    setBusy(true);
    try {
      const result = await startStripeConnectOnboarding();
      const url = resolveStripeConnectUrl(result);
      if (!url) throw new Error('Could not open Stripe Connect');
      setConnectModalTitle('Styld Pay Setup');
      setConnectUrl(url);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Try again');
    } finally { setBusy(false); }
  }

  async function handleOpenStripeDashboard() {
    setBusy(true);
    try {
      const url = await openStripeConnectDashboard();
      setConnectModalTitle('Stripe account');
      setConnectUrl(url);
    } catch (err) {
      Alert.alert('Could not open Stripe', err instanceof Error ? err.message : 'Try again');
    } finally { setBusy(false); }
  }

  async function handleSyncAfterReturn() {
    setBusy(true);
    try {
      for (let i = 0; i < 4; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 2500));
        const result = await syncStripeConnect();
        if (result.status === 'ready' || result.status === 'pending_review') { await refresh(true); return; }
      }
      await refresh(true);
    } catch { await refresh(true); }
    finally { setBusy(false); }
  }

  function handlePayout() {
    const avail = summary?.balanceAvailableCents ?? 0;
    if (summary?.balanceLive === false) {
      Alert.alert('Balance unavailable', 'We could not verify your live balance with Stripe. Pull to refresh and try again.');
      return;
    }
    if (avail < 100) {
      Alert.alert(
        'Nothing to pay out yet',
        'Your available balance is below $1.00. Once funds finish processing, you can pay out from here.',
      );
      return;
    }
    Alert.alert(
      'Request payout',
      `Pay out ${formatUsdFromCents(avail)} to your linked bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay out',
          onPress: () =>
            void (async () => {
              setBusy(true);
              try {
                const result = await requestStripeConnectPayout();
                await refresh(true);
                Alert.alert(
                  'Payout started',
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

  const isReady = summary?.status === 'ready';
  const isPending = summary?.status === 'onboarding' || summary?.status === 'pending_review';
  const bank = summary?.bankAccount;
  const totalUnpaid = (summary?.balanceAvailableCents ?? 0) + (summary?.balancePendingCents ?? 0);
  const transactions = summary?.recentTransactions ?? [];
  const payouts = summary?.recentPayouts ?? [];

  return (
    <>
      <ScrollView
        contentContainerStyle={pStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
            tintColor={colors.accentPink}
          />
        }
      >
        {initialLoading && !summary ? (
          <ActivityIndicator color={colors.accentPink} style={{ marginTop: 60 }} />
        ) : isReady ? (
          <>
            <View style={pStyles.heroSection}>
              <View style={pStyles.heroTopRow}>
                <Text style={pStyles.heroLabel}>Unpaid balance</Text>
                <Pressable onPress={() => void refresh(true)} hitSlop={10} disabled={refreshing}>
                  <Text style={pStyles.refreshLinkText}>{refreshing ? 'Updating…' : 'Refresh'}</Text>
                </Pressable>
              </View>
              <Text style={pStyles.heroAmount}>{formatUsdFromCents(totalUnpaid)}</Text>
              <Text style={pStyles.balanceFootnote}>
                Your available balance after fees — ready to pay out to your bank.
              </Text>

              {refreshError ? (
                <Text style={pStyles.balanceWarn}>{refreshError}</Text>
              ) : summary?.balanceLive ? (
                <Text style={pStyles.balanceOk}>Verified with Stripe</Text>
              ) : null}

              <StripeBalanceSplit
                availableCents={summary?.balanceAvailableCents ?? 0}
                pendingCents={summary?.balancePendingCents ?? 0}
                style={pStyles.splitRowOverride}
              />

              {/* Bank tag + Stripe settings */}
              <View style={pStyles.bankRow}>
                <View style={pStyles.bankTag}>
                  {bank && bankLogoUrl(bank.bankName) ? (
                    <Image source={{ uri: bankLogoUrl(bank.bankName)! }} style={pStyles.bankTagLogo} resizeMode="contain" />
                  ) : (
                    <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                  )}
                  <Text style={pStyles.bankTagText}>
                    {bank
                      ? `${bank.bankName ?? 'Bank'} ••${bank.last4}`
                      : 'No bank linked'}
                  </Text>
                </View>
                <Pressable
                  style={pStyles.stripeManageBtn}
                  disabled={busy}
                  onPress={() => void handleOpenStripeDashboard()}
                >
                  <Ionicons name="open-outline" size={14} color={colors.accentPink} />
                  <Text style={pStyles.stripeManageBtnText}>Manage in Stripe</Text>
                </Pressable>
              </View>

              {/* Payout button */}
              <Pressable
                style={[pStyles.payoutBtn, (busy || summary?.balanceLive === false) && { opacity: 0.45 }]}
                onPress={handlePayout}
                disabled={busy || summary?.balanceLive === false}
              >
                {busy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={pStyles.payoutBtnText}>Pay out</Text>
                }
              </Pressable>
            </View>

            <Text style={pStyles.sectionLabel}>Activity</Text>
            <ActivityTabBar active={activityTab} onChange={setActivityTab} />
            {activityTab === 'transactions' ? (
              <TransactionsList items={transactions} />
            ) : (
              <PayoutHistoryList items={payouts} bankLast4={bank?.last4} />
            )}

            <Text style={[pStyles.sectionLabel, { marginTop: 20 }]}>How payouts work</Text>
            {[
              { title: 'Customer pays on your site', body: 'Stripe deducts card processing fees before the rest lands in your balance.' },
              { title: 'Funds become available', body: 'Usually 2–3 business days after a payment.' },
              { title: 'Pay out to your bank', body: 'Use Pay out above to send your available balance.' },
            ].map((item) => (
              <View key={item.title} style={pStyles.howRow}>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.howTitle}>{item.title}</Text>
                  <Text style={pStyles.howBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          /* ── Not yet set up ── */
          <View style={pStyles.setupWrap}>
            <Text style={pStyles.setupHeading}>
              {summary?.status === 'pending_review'
                ? 'Almost there'
                : summary?.hasAccount
                  ? 'Finish Styld Pay setup'
                  : 'Set up Styld Pay'}
            </Text>
            <Text style={pStyles.setupSub}>
              {summary?.status === 'pending_review'
                ? 'Stripe may still need a few details from you. Open Stripe below to finish your profile or check what\'s left.'
                : summary?.hasAccount
                  ? 'Pick up where you left off in Stripe to complete your payout profile.'
                  : 'Accept online payments and pay out directly to your bank.'}
            </Text>
            <Pressable
              style={[pStyles.setupBtn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => void handleOpenOnboarding()}
            >
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={pStyles.setupBtnText}>
                    {summary?.hasAccount ? 'Continue in Stripe' : 'Get started'}
                  </Text>
              }
            </Pressable>
            {isPending && (
              <Pressable
                style={[pStyles.refreshLink, busy && { opacity: 0.5 }]}
                disabled={busy}
                onPress={() => void handleSyncAfterReturn()}
              >
                <Text style={pStyles.refreshLinkText}>Refresh status</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <StripeConnectWebModal
        visible={!!connectUrl}
        url={connectUrl}
        title={connectModalTitle}
        onClose={() => setConnectUrl(null)}
        onDone={() => {
          setConnectUrl(null);
          void handleSyncAfterReturn();
        }}
      />
    </>
  );
}

const BASE_P_STYLES = {
  content: { padding: 20, paddingBottom: 48 },

  // Balance section
  heroSection: {
    paddingBottom: 24,
    marginBottom: 8,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  heroAmount: { fontSize: 42, fontWeight: '700', fontFamily: fonts.number, color: colors.text, letterSpacing: -1.5, marginTop: -4 },
  balanceFootnote: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -8,
  },
  balanceOk: { fontSize: 12, color: '#15803d', fontWeight: '500', marginTop: -4 },
  balanceWarn: { fontSize: 12, color: '#b45309', fontWeight: '500', marginTop: -8, lineHeight: 17 },

  splitRowOverride: { borderTopWidth: 0, paddingTop: 0 },

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 4,
  },
  bankTagLogo: { width: 16, height: 16, borderRadius: 3 },
  bankTagText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  stripeManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  stripeManageBtnText: { fontSize: 13, fontWeight: '600', color: colors.accentPink },

  payoutBtn: {
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.accentPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  payoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Not set up state
  setupWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  setupHeading: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  setupSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  setupBtn: { backgroundColor: colors.accentPink, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  setupBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  refreshLink: { paddingVertical: 8, paddingHorizontal: 12 },
  refreshLinkText: { color: colors.accentPink, fontSize: 14, fontWeight: '600' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  howRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  howIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.progressTrack, alignItems: 'center', justifyContent: 'center' },
  howTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  howBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  activityInlineEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  activityRowBody: { flex: 1, minWidth: 0, gap: 4 },
  activityRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
  activityDetail: { fontSize: 13, color: colors.text, fontWeight: '500', lineHeight: 18 },
  activityReceive: { fontSize: 13, color: '#15803d', fontWeight: '700', lineHeight: 18 },
  activityMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '500', lineHeight: 17 },
  activityAmount: { fontSize: 15, fontWeight: '700', fontFamily: fonts.number },
  activityAmountDebit: { color: colors.text },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentsScreen({ navigation, route }: Props) {
  const screenStyles = useResponsiveStyles(BASE_SCREEN_STYLES);
  const { hasLinkedSite } = useSiteData();
  const [activeTab, setActiveTab] = useState<PaymentsTab>(route.params?.tab ?? 'booking');

  const titleMap: Record<PaymentsTab, string> = {
    booking: 'Form & payments',
    payouts: 'Payments & payouts',
  };

  return (
    <View style={screenStyles.root}>
      <View style={screenStyles.gradientLayer}>
        <ScreenGradient />
      </View>
      <View style={screenStyles.contentLayer}>
        <BusinessScreenLayout
          title={titleMap[activeTab]}
          onBack={() => navigation.goBack()}
          hasLinkedSite={activeTab === 'payouts' ? true : hasLinkedSite}
          linkMessage="Link your site to configure booking payments."
          scroll={false}
          contentStyle={{ flex: 1, paddingHorizontal: 0 }}
        >
          <TabBar active={activeTab} onChange={setActiveTab} />
          {activeTab === 'booking' && <BookingSettingsEditor onGoToPayouts={() => setActiveTab('payouts')} />}
          {activeTab === 'payouts' && <PayoutsTab />}
        </BusinessScreenLayout>
      </View>
    </View>
  );
}

const BASE_SCREEN_STYLES = {
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
  },
};
