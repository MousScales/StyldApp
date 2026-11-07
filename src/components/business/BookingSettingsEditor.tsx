import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BookingPromoCodesSection from './BookingPromoCodesSection';
import PlatformFeePayerEditor from './PlatformFeePayerEditor';
import TravelStylistEditor from './TravelStylistEditor';
import { useServiceCatalog } from '../../context/ServiceCatalogContext';
import { useSiteData } from '../../context/SiteDataContext';
import {
  CancellationPolicyPreset,
  CancellationPolicySettings,
  CANCELLATION_POLICY_PRESETS,
  DEFAULT_CANCELLATION_POLICY,
  REFUND_APPLIES_TO_OPTIONS,
  RefundAppliesTo,
  buildPolicySummary,
} from '../../data/cancellationPolicy';
import {
  BookingPaymentMode,
  BookingPaymentSettings,
  DEFAULT_BOOKING_PAYMENT,
  DepositKind,
  computeBalanceDue,
  computeDepositAmount,
  effectiveBookingPayment,
  bookingPaymentToSave,
} from '../../data/bookingPayment';
import { BookingPromoCode } from '../../data/bookingPromoCodes';
import {
  computePlatformFee,
  PLATFORM_FEE_LABEL,
  totalChargeWithPlatformFee,
} from '../../lib/bookingServiceFee';
import {
  loadBookingPayment,
  loadBookingPromoCodes,
  loadCancellationPolicy,
  loadTravelStylistSettings,
  saveBookingPayment,
  saveBookingPromoCodes,
  saveCancellationPolicy,
  saveTravelStylistSettings,
} from '../../lib/siteServices';
import {
  TravelStylistSettings,
  DEFAULT_TRAVEL_STYLIST,
  travelStylistReady,
} from '../../data/travelStylist';
import { fetchStripeConnectStatus } from '../../lib/stripeConnect';
import { handleBookingApprovalToggle } from '../../lib/bookingApproval';
import { colors, fonts } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

const APP_ICON = require('../../../assets/icon.png') as ImageSourcePropType;

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

const PAYMENT_MODES: { id: BookingPaymentMode; label: string; subtitle: string; badge?: string }[] = [
  { id: 'in_person', label: 'Pay in person', subtitle: 'Book for free — pay when they arrive', badge: 'Default' },
  { id: 'deposit', label: 'Deposit online', subtitle: 'Hold the slot with a partial payment — balance due in person' },
  { id: 'full', label: 'Full price online', subtitle: 'Clients pay the full estimate when they book' },
];

const DEPOSIT_PRESETS_PERCENT = [10, 20, 25, 50];

type BookingSubTab = 'payments' | 'form' | 'travel' | 'requests' | 'promos' | 'policy' | 'preview';

const BOOKING_SUB_TABS: { id: BookingSubTab; label: string }[] = [
  { id: 'payments', label: 'Payments' },
  { id: 'form', label: 'Form' },
  { id: 'travel', label: 'Travel' },
  { id: 'requests', label: 'Requests' },
  { id: 'promos', label: 'Promos' },
  { id: 'policy', label: 'Cancellation' },
  { id: 'preview', label: 'Preview' },
];

function paymentModeLabel(mode: BookingPaymentMode) {
  return PAYMENT_MODES.find((item) => item.id === mode)?.label ?? 'Payment';
}

function formFieldsSummary(payment: BookingPaymentSettings) {
  const required = [
    payment.requireCurrentHairPhoto && 'Hair photo',
    payment.requireReferencePhoto && 'Reference photo',
  ].filter(Boolean) as string[];
  if (required.length === 0) return 'No photos required';
  return required.join(' · ');
}

function policyPresetLabel(policy: CancellationPolicySettings) {
  if (policy.preset === 'custom') return 'Custom policy';
  return CANCELLATION_POLICY_PRESETS.find((item) => item.id === policy.preset)?.label ?? 'Policy';
}

function FormOverviewStrip({
  payment,
  cancellationPolicy,
  previewDueNow,
}: {
  payment: BookingPaymentSettings;
  cancellationPolicy: CancellationPolicySettings;
  previewDueNow: number;
}) {
  const bStyles = useResponsiveStyles(BASE_B_STYLES);

  const rows = [
    { label: 'Payment', value: paymentModeLabel(payment.mode) },
    { label: 'Form', value: formFieldsSummary(payment) },
    {
      label: 'Requests',
      value: payment.requireBookingApproval ? 'Manual approval' : 'Auto-confirm',
    },
    { label: 'Cancellation', value: policyPresetLabel(cancellationPolicy) },
    {
      label: 'Due at booking',
      value: payment.mode === 'in_person' ? 'Free' : formatMoney(previewDueNow),
    },
  ];

  return (
    <View style={bStyles.overviewStrip}>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[bStyles.overviewRow, index < rows.length - 1 && bStyles.overviewRowBorder]}
        >
          <Text style={bStyles.overviewRowLabel}>{row.label}</Text>
          <Text style={bStyles.overviewRowValue} numberOfLines={2}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BookingSubTabBar({
  active,
  onChange,
}: {
  active: BookingSubTab;
  onChange: (tab: BookingSubTab) => void;
}) {
  const bStyles = useResponsiveStyles(BASE_B_STYLES);

  return (
    <View style={bStyles.subTabBarWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={bStyles.subTabBar}
      >
        {BOOKING_SUB_TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[bStyles.subTabItem, isActive && bStyles.subTabItemActive]}
              onPress={() => onChange(tab.id)}
            >
              <Text style={[bStyles.subTabText, isActive && bStyles.subTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FormSection({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  const bStyles = useResponsiveStyles(BASE_B_STYLES);

  return (
    <View style={bStyles.section}>
      <Text style={bStyles.sectionTitle}>{title}</Text>
      {lead ? <Text style={bStyles.sectionLead}>{lead}</Text> : null}
      {children}
    </View>
  );
}

function SubsectionTitle({ title, lead }: { title: string; lead?: string }) {
  const bStyles = useResponsiveStyles(BASE_B_STYLES);

  return (
    <View style={bStyles.subsectionHead}>
      <Text style={bStyles.subsectionTitle}>{title}</Text>
      {lead ? <Text style={bStyles.subsectionLead}>{lead}</Text> : null}
    </View>
  );
}

function computePreview(payment: BookingPaymentSettings, total: number) {
  const t = Math.max(0, total);
  if (payment.mode === 'in_person') {
    return { dueNow: 0, dueLater: t, dueNowLabel: 'Due when booking', dueLaterLabel: 'Due at appointment' };
  }
  if (payment.mode === 'full') {
    return { dueNow: t, dueLater: 0, dueNowLabel: 'Due when booking', dueLaterLabel: 'At appointment' };
  }
  const deposit = computeDepositAmount(t, payment);
  const dueLater = computeBalanceDue(t, payment);
  const included = payment.depositIncludedInPrice !== false;
  return {
    dueNow: deposit,
    dueLater,
    dueNowLabel: 'Deposit today',
    dueLaterLabel: included ? 'Balance in person' : 'Full price in person',
  };
}

export type BookingSettingsEditorProps = {
  onGoToPayouts?: () => void;
};

export default function BookingSettingsEditor({ onGoToPayouts = () => {} }: BookingSettingsEditorProps) {
  const bStyles = useResponsiveStyles(BASE_B_STYLES);
  const { linkedSite, hasLinkedSite, bookings, refresh } = useSiteData();
  const { catalogServices, getPrice, getStyleMeta } = useServiceCatalog();
  const [subTab, setSubTab] = useState<BookingSubTab>('payments');
  const [payment, setPayment] = useState<BookingPaymentSettings>(DEFAULT_BOOKING_PAYMENT);
  const [promoCodes, setPromoCodes] = useState<BookingPromoCode[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicySettings>(
    DEFAULT_CANCELLATION_POLICY,
  );
  const [travelStylist, setTravelStylist] = useState<TravelStylistSettings>(DEFAULT_TRAVEL_STYLIST);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollHomeBaseIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
  }, []);

  const linkedSiteUserId = linkedSite?.user_id ?? null;
  const linkedSiteRef = useRef(linkedSite);
  linkedSiteRef.current = linkedSite;

  const loadSettings = useCallback(async () => {
    const site = linkedSiteRef.current;
    if (!site) return;
    setError(null);
    try {
      const [pd, promoData, policyData, travelData, ss] = await Promise.all([
        loadBookingPayment(site),
        loadBookingPromoCodes(site),
        loadCancellationPolicy(site),
        loadTravelStylistSettings(site),
        fetchStripeConnectStatus().catch(() => null),
      ]);
      const stripeReadyNow = ss?.status === 'ready' || ss?.status === 'pending_review';
      setStripeReady(stripeReadyNow);
      setPayment({ ...pd, ...effectiveBookingPayment(pd, stripeReadyNow) });
      setPromoCodes(promoData);
      setCancellationPolicy(policyData);
      setTravelStylist(travelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings.');
    } finally {
      setInitialLoading(false);
    }
  }, [linkedSiteUserId]);

  useEffect(() => {
    if (!linkedSiteUserId) {
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    void loadSettings();
  }, [linkedSiteUserId, loadSettings]);

  const updatePayment = (next: BookingPaymentSettings) => { setPayment(next); setSaved(false); };

  const updatePromoCodes = (next: typeof promoCodes) => {
    setPromoCodes(next);
    setSaved(false);
  };

  const updateCancellationPolicy = (next: CancellationPolicySettings) => {
    setCancellationPolicy(next);
    setSaved(false);
  };

  const updateTravelStylist = (next: TravelStylistSettings) => {
    setTravelStylist(next);
    setSaved(false);
  };

  const handleApprovalToggle = () => {
    handleBookingApprovalToggle({
      enabled: payment.requireBookingApproval,
      bookings,
      linkedSite,
      onSetEnabled: async (requireBookingApproval) => {
        const next = { ...payment, requireBookingApproval };
        setPayment(next);
        if (!requireBookingApproval && linkedSite) {
          await saveBookingPayment(linkedSite, bookingPaymentToSave(next));
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        } else {
          setSaved(false);
        }
      },
      onAfterAutoAccept: refresh,
    });
  };

  const handlePresetPress = (presetId: CancellationPolicyPreset) => {
    const preset = CANCELLATION_POLICY_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    updateCancellationPolicy({
      preset: preset.id,
      cancelNoticeHours: 0,
      fullRefundNoticeHours: preset.fullRefundNoticeHours,
      refundAppliesTo: preset.refundAppliesTo,
      policySummary: preset.policySummary,
    });
  };

  const handleRefundScopePress = (scope: RefundAppliesTo) => {
    updateCancellationPolicy({
      ...cancellationPolicy,
      preset: 'custom',
      refundAppliesTo: scope,
      policySummary: buildPolicySummary(cancellationPolicy.fullRefundNoticeHours, scope),
    });
  };

  const handleModePress = (modeId: BookingPaymentMode) => {
    if ((modeId === 'deposit' || modeId === 'full') && !stripeReady) {
      Alert.alert('Styld Pay required', 'Set up Styld Pay to accept online payments.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set up Styld Pay', onPress: onGoToPayouts },
      ]);
      return;
    }
    updatePayment({ ...payment, mode: modeId });
  };

  const save = async (): Promise<boolean> => {
    if (!linkedSite) return false;
    if ((payment.mode === 'deposit' || payment.mode === 'full') && !stripeReady) {
      Alert.alert('Styld Pay required', 'Set up Styld Pay before enabling online payments.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set up Styld Pay', onPress: onGoToPayouts },
      ]);
      return false;
    }
    if (payment.mode === 'deposit' && payment.depositKind === 'fixed' && payment.depositValue < 0.5) {
      Alert.alert('Invalid deposit', 'Fixed deposit must be at least $0.50.');
      return false;
    }
    if (payment.mode === 'deposit' && payment.depositKind === 'percent' && payment.depositValue < 1) {
      Alert.alert('Invalid deposit', 'Choose a percentage of at least 1%.');
      return false;
    }
    if (travelStylist.enabled && !travelStylistReady(travelStylist)) {
      Alert.alert('Travel setup incomplete', 'Add your home base address before enabling travel bookings.');
      return false;
    }
    setSaving(true);
    try {
      await Promise.all([
        saveBookingPayment(linkedSite, bookingPaymentToSave(payment)),
        saveBookingPromoCodes(linkedSite, promoCodes),
        saveCancellationPolicy(linkedSite, cancellationPolicy),
        saveTravelStylistSettings(linkedSite, travelStylist),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const previewService = useMemo(() => {
    const first = catalogServices[0];
    if (!first) return { title: 'Your service', price: 0 };
    const meta = getStyleMeta(first.id);
    return {
      title: meta?.title ?? first.name,
      price: getPrice(first.id) || 0,
    };
  }, [catalogServices, getPrice, getStyleMeta]);

  const preview = useMemo(
    () => computePreview(payment, previewService.price),
    [payment, previewService.price],
  );
  const previewPlatformFee =
    payment.mode === 'in_person'
      ? 0
      : computePlatformFee(preview.dueNow, payment.platformFeePayer);
  const previewChargeTotal =
    payment.mode === 'in_person'
      ? 0
      : totalChargeWithPlatformFee(preview.dueNow, payment.platformFeePayer);

  if (!hasLinkedSite) {
    return (
      <View style={bStyles.emptyWrap}>
        <Text style={bStyles.emptyText}>Link your site to configure booking payments.</Text>
      </View>
    );
  }

  if (error && !initialLoading) {
    return <Text style={bStyles.errorText}>{error}</Text>;
  }

  return (
    <View style={bStyles.tabRoot}>
      <FormOverviewStrip
        payment={payment}
        cancellationPolicy={cancellationPolicy}
        previewDueNow={preview.dueNow}
      />
      <BookingSubTabBar active={subTab} onChange={setSubTab} />

      {initialLoading ? (
        <View style={bStyles.loadingWrap}>
          <ActivityIndicator color={colors.accentPink} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={bStyles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
        <ScrollView
          ref={scrollRef}
          style={bStyles.scroll}
          contentContainerStyle={bStyles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode="interactive"
        >
          {subTab === 'payments' && (
            <View>
            <FormSection title="Payment method" lead="Choose when clients pay — you can change this anytime.">
              {!stripeReady && (
                <Text style={bStyles.gateBannerText}>
                  Set up{' '}
                  <Text style={bStyles.gateBannerLink} onPress={onGoToPayouts}>Styld Pay</Text>
                  {' '}to unlock online payments.
                </Text>
              )}
              {PAYMENT_MODES.map((option) => {
                const locked = !stripeReady && (option.id === 'deposit' || option.id === 'full');
                const selected = payment.mode === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[bStyles.modeRow, locked && bStyles.modeRowLocked]}
                    onPress={() => handleModePress(option.id)}
                  >
                    <View style={bStyles.modeBody}>
                      <View style={bStyles.modeTitleRow}>
                        <Text style={[bStyles.modeTitle, locked && bStyles.modeTitleLocked]}>
                          {option.label}
                        </Text>
                        {locked ? (
                          <Text style={bStyles.lockedText}>Requires Styld Pay</Text>
                        ) : option.badge ? (
                          <Text style={bStyles.popularText}>{option.badge}</Text>
                        ) : null}
                      </View>
                      <Text style={[bStyles.modeSub, locked && bStyles.modeSubLocked]}>
                        {option.subtitle}
                      </Text>
                    </View>
                    {!locked && (
                      <View style={[bStyles.check, selected && bStyles.checkSelected]}>
                        {selected ? <View style={bStyles.checkDot} /> : null}
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {payment.mode === 'deposit' && (
                <View style={bStyles.innerBlock}>
                  <SubsectionTitle title="Deposit amount" lead="How much clients pay when they book." />
                  <Text style={bStyles.depositKindLead}>How does the deposit work?</Text>
                  <View style={bStyles.segmented}>
                    {(
                      [
                        { included: true, label: 'Part of price', subtitle: 'Counts toward the service total' },
                        { included: false, label: 'Additional hold', subtitle: 'On top of the full service price' },
                      ] as const
                    ).map((option) => {
                      const active = payment.depositIncludedInPrice === option.included;
                      return (
                        <Pressable
                          key={option.label}
                          style={[bStyles.segment, bStyles.segmentTall, active && bStyles.segmentActive]}
                          onPress={() => updatePayment({ ...payment, depositIncludedInPrice: option.included })}
                        >
                          <Text style={[bStyles.segmentText, active && bStyles.segmentTextActive]}>
                            {option.label}
                          </Text>
                          <Text style={[bStyles.segmentSubtext, active && bStyles.segmentSubtextActive]}>
                            {option.subtitle}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={bStyles.segmented}>
                    {(['percent', 'fixed'] as DepositKind[]).map((kind) => {
                      const active = payment.depositKind === kind;
                      return (
                        <Pressable
                          key={kind}
                          style={[bStyles.segment, active && bStyles.segmentActive]}
                          onPress={() => updatePayment({ ...payment, depositKind: kind })}
                        >
                          <Text style={[bStyles.segmentText, active && bStyles.segmentTextActive]}>
                            {kind === 'percent' ? 'Percentage' : 'Fixed amount'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {payment.depositKind === 'percent' && (
                    <View style={bStyles.presetRow}>
                      {DEPOSIT_PRESETS_PERCENT.map((pct) => {
                        const active = payment.depositValue === pct;
                        return (
                          <Pressable
                            key={pct}
                            style={[bStyles.presetChip, active && bStyles.presetChipActive]}
                            onPress={() => updatePayment({ ...payment, depositValue: pct })}
                          >
                            <Text style={[bStyles.presetText, active && bStyles.presetTextActive]}>
                              {pct}%
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <View style={bStyles.amountRow}>
                    {payment.depositKind === 'fixed' && <Text style={bStyles.amountPrefix}>$</Text>}
                    <TextInput
                      style={bStyles.amountInput}
                      keyboardType="number-pad"
                      value={String(payment.depositValue)}
                      onChangeText={(t) => {
                        const n = Number(t.replace(/[^\d]/g, ''));
                        if (Number.isFinite(n)) updatePayment({ ...payment, depositValue: n });
                      }}
                    />
                    {payment.depositKind === 'percent' && <Text style={bStyles.amountSuffix}>%</Text>}
                  </View>
                </View>
              )}
            </FormSection>

            <FormSection
              title="Platform fee"
              lead="Applies to online booking checkout and payment links sent from the app."
            >
              <PlatformFeePayerEditor
                value={payment.platformFeePayer ?? 'client'}
                onChange={(platformFeePayer) => updatePayment({ ...payment, platformFeePayer })}
              />
            </FormSection>
            </View>
          )}

          {subTab === 'requests' && (
            <FormSection
              title="Booking requests"
              lead="Review new bookings before they appear as confirmed."
            >
              <Pressable style={bStyles.toggleRow} onPress={handleApprovalToggle}>
                <View style={bStyles.toggleBody}>
                  <Text style={bStyles.toggleLabel}>Require manual approval</Text>
                  <Text style={bStyles.toggleSub}>
                    New bookings stay pending until you accept them from the dashboard or a notification
                  </Text>
                </View>
                <View style={[bStyles.toggleBox, payment.requireBookingApproval && bStyles.toggleBoxOn]}>
                  {payment.requireBookingApproval ? <View style={bStyles.toggleDot} /> : null}
                </View>
              </Pressable>
            </FormSection>
          )}

          {subTab === 'promos' && (
            <BookingPromoCodesSection promos={promoCodes} onChange={updatePromoCodes} />
          )}

          {subTab === 'form' && (
            <FormSection
              title="Required photos"
              lead="Choose which photos clients must upload on the booking form."
            >
              <Pressable
                style={bStyles.toggleRow}
                onPress={() =>
                  updatePayment({ ...payment, requireCurrentHairPhoto: !payment.requireCurrentHairPhoto })
                }
              >
                <View style={bStyles.toggleBody}>
                  <Text style={bStyles.toggleLabel}>Require current hair photo</Text>
                  <Text style={bStyles.toggleSub}>Clients upload a photo of their hair before booking</Text>
                </View>
                <View style={[bStyles.toggleBox, payment.requireCurrentHairPhoto && bStyles.toggleBoxOn]}>
                  {payment.requireCurrentHairPhoto ? <View style={bStyles.toggleDot} /> : null}
                </View>
              </Pressable>
              <Pressable
                style={bStyles.toggleRow}
                onPress={() =>
                  updatePayment({ ...payment, requireReferencePhoto: !payment.requireReferencePhoto })
                }
              >
                <View style={bStyles.toggleBody}>
                  <Text style={bStyles.toggleLabel}>Require reference photo</Text>
                  <Text style={bStyles.toggleSub}>Clients must upload an inspiration or reference image</Text>
                </View>
                <View style={[bStyles.toggleBox, payment.requireReferencePhoto && bStyles.toggleBoxOn]}>
                  {payment.requireReferencePhoto ? <View style={bStyles.toggleDot} /> : null}
                </View>
              </Pressable>
            </FormSection>
          )}

          {subTab === 'travel' && (
            <FormSection
              title="Travel stylist"
              lead="Offer on-location appointments with travel fees and extra buffer time."
            >
              <TravelStylistEditor
                settings={travelStylist}
                onChange={updateTravelStylist}
                onHomeBaseFocus={scrollHomeBaseIntoView}
              />
            </FormSection>
          )}

          {subTab === 'policy' && (
            <FormSection
              title="Refund window"
              lead="Clients can cancel anytime before the appointment. Refunds depend on how far in advance they cancel."
            >
              {CANCELLATION_POLICY_PRESETS.map((preset) => {
                const selected = cancellationPolicy.preset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    style={bStyles.modeRow}
                    onPress={() => handlePresetPress(preset.id)}
                  >
                    <View style={bStyles.modeBody}>
                      <Text style={bStyles.modeTitle}>{preset.label}</Text>
                      <Text style={bStyles.modeSub}>{preset.description}</Text>
                    </View>
                    <View style={[bStyles.check, selected && bStyles.checkSelected]}>
                      {selected ? <View style={bStyles.checkDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}

              {cancellationPolicy.preset !== 'no_refunds' ? (
              <View style={bStyles.innerBlock}>
                <SubsectionTitle title="What gets refunded" lead="Which online payments follow your refund window." />
                {REFUND_APPLIES_TO_OPTIONS.filter((option) => option.id !== 'none').map((option) => {
                  const selected = cancellationPolicy.refundAppliesTo === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={bStyles.modeRow}
                      onPress={() => handleRefundScopePress(option.id)}
                    >
                      <View style={bStyles.modeBody}>
                        <Text style={bStyles.modeTitle}>{option.label}</Text>
                        <Text style={bStyles.modeSub}>{option.description}</Text>
                      </View>
                      <View style={[bStyles.check, selected && bStyles.checkSelected]}>
                        {selected ? <View style={bStyles.checkDot} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              ) : null}

              <View style={bStyles.innerBlock}>
                <SubsectionTitle title="Policy text" lead="Shown at checkout and in cancellation emails." />
                <TextInput
                  style={bStyles.policySummaryInput}
                  multiline
                  value={cancellationPolicy.policySummary}
                  onChangeText={(text) =>
                    updateCancellationPolicy({
                      ...cancellationPolicy,
                      preset: 'custom',
                      policySummary: text,
                    })
                  }
                  placeholder="Describe your cancellation and refund rules…"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </FormSection>
          )}

          {subTab === 'preview' && (
            <FormSection title="Checkout preview" lead="What clients see on your booking page.">
              <SubsectionTitle title="Sample service" lead="Pricing preview for one of your services." />
              <View style={bStyles.previewCard}>
                <Image source={APP_ICON} style={bStyles.previewImg} resizeMode="cover" />
                <View style={bStyles.previewBody}>
                  <Text style={bStyles.previewTitle}>{previewService.title}</Text>
                  <View style={bStyles.previewMid}>
                    <Text style={bStyles.previewMeta}>ESTIMATE</Text>
                    <Text style={bStyles.previewPrice}>{formatMoney(previewService.price)}</Text>
                  </View>
                  <View style={bStyles.previewPayRow}>
                    <Text style={bStyles.previewPayLabel}>{preview.dueNowLabel}</Text>
                    <Text style={bStyles.previewPayAccent}>{formatMoney(preview.dueNow)}</Text>
                  </View>
                  {previewPlatformFee > 0 ? (
                    <View style={bStyles.previewPayRow}>
                      <Text style={bStyles.previewPayLabel}>{PLATFORM_FEE_LABEL}</Text>
                      <Text style={bStyles.previewPayValue}>{formatMoney(previewPlatformFee)}</Text>
                    </View>
                  ) : null}
                  {previewChargeTotal > 0 ? (
                    <View style={bStyles.previewPayRow}>
                      <Text style={bStyles.previewPayLabel}>Total due now</Text>
                      <Text style={bStyles.previewPayAccent}>{formatMoney(previewChargeTotal)}</Text>
                    </View>
                  ) : null}
                  {preview.dueLater > 0 && (
                    <View style={bStyles.previewPayRow}>
                      <Text style={bStyles.previewPayLabel}>{preview.dueLaterLabel}</Text>
                      <Text style={bStyles.previewPayValue}>{formatMoney(preview.dueLater)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </FormSection>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!initialLoading && (
        <View style={bStyles.saveBar}>
          <Pressable style={[bStyles.saveBtn, saving && { opacity: 0.65 }]} onPress={save} disabled={saving}>
            <Text style={bStyles.saveBtnText}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const BASE_B_STYLES = {
  tabRoot: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  content: { paddingBottom: 220, paddingHorizontal: 20, paddingTop: 8 },
  emptyWrap: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  errorText: { color: '#f87171', fontSize: 14, padding: 20 },
  overviewStrip: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  overviewRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  overviewRowLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500', width: 108 },
  overviewRowValue: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18, textAlign: 'right' },
  subTabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  subTabBar: { paddingHorizontal: 16, gap: 4, paddingVertical: 0 },
  subTabItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  subTabItemActive: {
    borderBottomColor: colors.accentPink,
  },
  subTabText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  subTabTextActive: { color: colors.text },
  section: { paddingTop: 4, gap: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  sectionLead: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  subsectionHead: { marginTop: 8, marginBottom: 12 },
  subsectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subsectionLead: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  innerBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  gateBannerText: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 12 },
  gateBannerLink: { color: colors.accentPink, fontWeight: '600' },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  modeRowLocked: { opacity: 0.55 },
  modeBody: { flex: 1, minWidth: 0, paddingRight: 8 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  modeTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modeTitleLocked: { color: colors.textMuted },
  modeSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  modeSubLocked: { opacity: 0.7 },
  lockedText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  popularText: { color: colors.accentPink, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { borderColor: colors.accentPink, backgroundColor: colors.accentPink },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.background },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  previewImg: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.background },
  previewBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 6 },
  previewTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  previewMid: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  previewMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  previewPrice: { color: colors.accentPink, fontSize: 17, fontWeight: '700' },
  previewPayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewPayLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  previewPayAccent: { color: colors.accentPink, fontSize: 13, fontWeight: '700' },
  previewPayValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  depositKindLead: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  segmentTall: { paddingVertical: 10, gap: 2 },
  segmentActive: { borderColor: colors.accentPink, backgroundColor: colors.accentPinkMuted },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  segmentSubtext: { color: colors.textMuted, fontSize: 11, lineHeight: 14, textAlign: 'center', opacity: 0.85 },
  segmentSubtextActive: { color: colors.text, opacity: 0.75 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  presetChipActive: { borderColor: colors.accentPink, backgroundColor: colors.accentPink },
  presetText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  presetTextActive: { color: colors.background },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  amountPrefix: { color: colors.textMuted, fontSize: 22, fontWeight: '600', fontFamily: fonts.numberMedium, marginRight: 4 },
  amountInput: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '700', fontFamily: fonts.number, paddingVertical: 14 },
  amountSuffix: { color: colors.textMuted, fontSize: 22, fontWeight: '600', fontFamily: fonts.numberMedium, marginLeft: 4 },
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'transparent',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: colors.accentPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  policySummaryInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  toggleBody: { flex: 1, gap: 2 },
  toggleLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxOn: {
    backgroundColor: colors.accentPink,
    borderColor: colors.accentPink,
  },
  toggleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
};

