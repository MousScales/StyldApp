import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BookingPromoCodesSection from '../business/BookingPromoCodesSection';
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
  BookingPaymentSettings,
  DEFAULT_BOOKING_PAYMENT,
  bookingPaymentToSave,
} from '../../data/bookingPayment';
import { BookingPromoCode } from '../../data/bookingPromoCodes';
import {
  loadBookingPayment,
  loadBookingPromoCodes,
  loadCancellationPolicy,
  saveBookingPayment,
  saveBookingPromoCodes,
  saveCancellationPolicy,
} from '../../lib/siteServices';
import { handleBookingApprovalToggle } from '../../lib/bookingApproval';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type SiteBookingSubTab = 'requests' | 'promos' | 'policy';

const SUB_TABS: { id: SiteBookingSubTab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'promos', label: 'Promos' },
  { id: 'policy', label: 'Cancellation' },
];

function SectionBlock({
  title,
  lead,
  children,
  styles,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  styles: ReturnType<typeof useResponsiveStyles<typeof BASE_STYLES>>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lead ? <Text style={styles.sectionLead}>{lead}</Text> : null}
      {children}
    </View>
  );
}

export default function SiteBookingEditor() {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { linkedSite, hasLinkedSite, bookings, refresh } = useSiteData();
  const [subTab, setSubTab] = useState<SiteBookingSubTab>('requests');
  const [payment, setPayment] = useState<BookingPaymentSettings>(DEFAULT_BOOKING_PAYMENT);
  const [promoCodes, setPromoCodes] = useState<BookingPromoCode[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicySettings>(
    DEFAULT_CANCELLATION_POLICY,
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const linkedSiteUserId = linkedSite?.user_id ?? null;
  const linkedSiteRef = useRef(linkedSite);
  linkedSiteRef.current = linkedSite;

  const loadSettings = useCallback(async () => {
    const site = linkedSiteRef.current;
    if (!site) return;
    setError(null);
    try {
      const [pd, promoData, policyData] = await Promise.all([
        loadBookingPayment(site),
        loadBookingPromoCodes(site),
        loadCancellationPolicy(site),
      ]);
      setPayment(pd);
      setPromoCodes(promoData);
      setCancellationPolicy(policyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load booking settings.');
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

  const markDirty = () => setSaved(false);

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
          markDirty();
        }
      },
      onAfterAutoAccept: refresh,
    });
  };

  const handlePresetPress = (presetId: CancellationPolicyPreset) => {
    const preset = CANCELLATION_POLICY_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setCancellationPolicy({
      preset: preset.id,
      cancelNoticeHours: 0,
      fullRefundNoticeHours: preset.fullRefundNoticeHours,
      refundAppliesTo: preset.refundAppliesTo,
      policySummary: preset.policySummary,
    });
    markDirty();
  };

  const handleRefundScopePress = (scope: RefundAppliesTo) => {
    setCancellationPolicy({
      ...cancellationPolicy,
      preset: 'custom',
      refundAppliesTo: scope,
      policySummary: buildPolicySummary(cancellationPolicy.fullRefundNoticeHours, scope),
    });
    markDirty();
  };

  const save = async () => {
    if (!linkedSite) return;
    setSaving(true);
    try {
      await Promise.all([
        saveBookingPayment(linkedSite, bookingPaymentToSave(payment)),
        saveBookingPromoCodes(linkedSite, promoCodes),
        saveCancellationPolicy(linkedSite, cancellationPolicy),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasLinkedSite) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Link your site to configure booking settings.</Text>
      </View>
    );
  }

  if (error && !initialLoading) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.subTabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabBar}
        >
          {SUB_TABS.map((tab) => {
            const isActive = subTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.subTabItem, isActive && styles.subTabItemActive]}
                onPress={() => setSubTab(tab.id)}
              >
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {initialLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentPink} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {subTab === 'requests' && (
            <SectionBlock
              title="Booking requests"
              lead="Review new bookings before they appear as confirmed."
              styles={styles}
            >
              <Pressable style={styles.toggleRow} onPress={handleApprovalToggle}>
                <View style={styles.toggleBody}>
                  <Text style={styles.toggleLabel}>Require manual approval</Text>
                  <Text style={styles.toggleSub}>
                    New bookings stay pending until you accept them from the dashboard or a
                    notification
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleBox,
                    payment.requireBookingApproval && styles.toggleBoxOn,
                  ]}
                >
                  {payment.requireBookingApproval ? (
                    <View style={styles.toggleDot} />
                  ) : null}
                </View>
              </Pressable>
            </SectionBlock>
          )}

          {subTab === 'promos' && (
            <BookingPromoCodesSection
              promos={promoCodes}
              onChange={(next) => {
                setPromoCodes(next);
                markDirty();
              }}
            />
          )}

          {subTab === 'policy' && (
            <SectionBlock
              title="Refund window"
              lead="Clients can cancel anytime before the appointment. Refunds depend on how far in advance they cancel."
              styles={styles}
            >
              {CANCELLATION_POLICY_PRESETS.map((preset) => {
                const selected = cancellationPolicy.preset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    style={styles.modeRow}
                    onPress={() => handlePresetPress(preset.id)}
                  >
                    <View style={styles.modeBody}>
                      <Text style={styles.modeTitle}>{preset.label}</Text>
                      <Text style={styles.modeSub}>{preset.description}</Text>
                    </View>
                    <View style={[styles.check, selected && styles.checkSelected]}>
                      {selected ? <View style={styles.checkDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}

              {cancellationPolicy.preset !== 'no_refunds' ? (
              <View style={styles.innerBlock}>
                <Text style={styles.subsectionTitle}>What gets refunded</Text>
                <Text style={styles.subsectionLead}>
                  Which online payments follow your refund window.
                </Text>
                {REFUND_APPLIES_TO_OPTIONS.filter((option) => option.id !== 'none').map((option) => {
                  const selected = cancellationPolicy.refundAppliesTo === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={styles.modeRow}
                      onPress={() => handleRefundScopePress(option.id)}
                    >
                      <View style={styles.modeBody}>
                        <Text style={styles.modeTitle}>{option.label}</Text>
                        <Text style={styles.modeSub}>{option.description}</Text>
                      </View>
                      <View style={[styles.check, selected && styles.checkSelected]}>
                        {selected ? <View style={styles.checkDot} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              ) : null}

              <View style={styles.innerBlock}>
                <Text style={styles.subsectionTitle}>Policy text</Text>
                <Text style={styles.subsectionLead}>
                  Shown at checkout and in cancellation emails.
                </Text>
                <TextInput
                  style={styles.policyInput}
                  multiline
                  value={cancellationPolicy.policySummary}
                  onChangeText={(text) => {
                    setCancellationPolicy({
                      ...cancellationPolicy,
                      preset: 'custom',
                      policySummary: text,
                    });
                    markDirty();
                  }}
                  placeholder="Describe your cancellation and refund rules…"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </SectionBlock>
          )}
        </ScrollView>
      )}

      {!initialLoading && (
        <View style={styles.saveBar}>
          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save booking settings'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const BASE_STYLES = {
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    padding: 20,
  },
  subTabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  subTabBar: {
    paddingHorizontal: 12,
    gap: 4,
  },
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
  subTabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: colors.text,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionLead: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  subsectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  subsectionLead: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  innerBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  modeBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  modeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPink,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  toggleBody: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
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
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  policyInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
};
