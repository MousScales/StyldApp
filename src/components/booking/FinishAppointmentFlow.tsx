import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrivacyMode } from '../../context/PrivacyContext';
import {
  chargeBookingInPerson,
  collectTapToPayPaymentFallback,
  type InPersonPayResult,
} from '../../lib/bookingInPersonPay';
import { useTapToPayCheckout } from '../../hooks/useTapToPayCheckout';
import { useTapToPay } from '../../context/TapToPayContext';
import { TAP_TO_PAY_NATIVE_ENABLED } from '../../lib/tapToPayConfig';
import { formatTapToPayError, TAP_TO_PAY_BUTTON_LABEL } from '../../lib/tapToPayCompliance';
import {
  completeBooking,
  recordBookingCashPayment,
  updateBookingSessionNotes,
} from '../../lib/siteAdmin';
import { getBalanceDue, SiteBookingRecord } from '../../lib/siteData';
import { requestReviewEmail } from '../../lib/siteReviews';
import { TIP_PERCENT_PRESETS, tipFromPercent } from '../../lib/sessionTimer';
import { LinkedSite } from '../../lib/linkedSites';
import { colors, fonts } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { maskMoney } from '../../utils/money';
import ScreenGradient from '../ScreenGradient';
import TapToPayWaveIcon from '../tapToPay/TapToPayWaveIcon';

type FinishStep = 'review' | 'tipPercent' | 'tipCustom' | 'summary' | 'tapToPay';

const UNPAID_STEPS: FinishStep[] = ['review', 'tipPercent', 'tipCustom', 'summary', 'tapToPay'];
const PAID_STEPS: FinishStep[] = ['review'];

const PHASE_LABELS = ['Review', 'Tip', 'Confirm', 'Pay'] as const;

function phaseIndex(step: FinishStep): number {
  if (step === 'review') return 0;
  if (step === 'tipPercent' || step === 'tipCustom') return 1;
  if (step === 'summary') return 2;
  return 3;
}

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  appointmentId: string;
  clientName: string;
  booking: SiteBookingRecord;
  linkedSite: LinkedSite;
  subdomain: string;
  stripeReady: boolean;
  onRefresh: () => Promise<void>;
  collectTapToPayPayment: (input: {
    bookingId: string;
    subdomain: string;
    balanceCents: number;
    tipCents: number;
    customerEmail?: string;
  }) => Promise<InPersonPayResult>;
  collectCardPayment: (input: {
    bookingId: string;
    subdomain: string;
    balanceCents: number;
    tipCents: number;
    customerEmail?: string;
  }) => Promise<InPersonPayResult>;
  tapToPayCheckout?: {
    readerConnected: boolean;
    connectPhase: 'idle' | 'initializing' | 'ready' | 'error';
    connectMessage: string;
    connectTapToPay: (subdomain: string) => Promise<{ ok: boolean; error?: string }>;
  };
};

function FinishAppointmentFlowContent({
  visible,
  onClose,
  onComplete,
  appointmentId,
  clientName,
  booking,
  linkedSite,
  subdomain,
  stripeReady,
  onRefresh,
  collectTapToPayPayment,
  collectCardPayment,
  tapToPayCheckout,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { privacyMode } = usePrivacyMode();
  const insets = useSafeAreaInsets();
  const topChromePadding = Math.max(insets.top, 12) + 8;

  const balanceDue = getBalanceDue(booking);
  const isPaid =
    balanceDue <= 0 || booking.paymentStatus.toLowerCase() === 'paid';
  const steps = isPaid ? PAID_STEPS : UNPAID_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const [notes, setNotes] = useState(booking.stylistNotes ?? '');
  const [sendReview, setSendReview] = useState(true);
  const [tipAmount, setTipAmount] = useState(booking.tipAmount ?? 0);
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [paying, setPaying] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [usedCustomTipStep, setUsedCustomTipStep] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const step = steps[stepIndex] ?? 'review';
  const totalCharge = useMemo(() => balanceDue + tipAmount, [balanceDue, tipAmount]);
  const tipBase = balanceDue > 0 ? balanceDue : booking.price;
  const currentPhase = phaseIndex(step);

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setNotes(booking.stylistNotes ?? '');
    setSendReview(true);
    setTipAmount(booking.tipAmount ?? 0);
    setSelectedPercent(null);
    setCustomTip('');
    setUsedCustomTipStep(false);
    setShowThankYou(false);
  }, [visible, booking.stylistNotes, booking.tipAmount, isPaid]);

  useEffect(() => {
    if (!showThankYou) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 2400);
    return () => clearTimeout(timer);
  }, [showThankYou, onComplete]);

  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 1;

  const goToStep = useCallback(
    (target: FinishStep) => {
      const index = steps.indexOf(target);
      if (index >= 0) setStepIndex(index);
    },
    [steps],
  );

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const skipToSummary = useCallback(() => {
    setUsedCustomTipStep(false);
    goToStep('summary');
  }, [goToStep]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    if (step === 'summary') {
      goToStep(usedCustomTipStep ? 'tipCustom' : 'tipPercent');
      return;
    }
    if (step === 'tapToPay') {
      goToStep('summary');
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }, [goToStep, onClose, step, stepIndex, usedCustomTipStep]);

  const persistNotes = async () => {
    if (notes.trim() !== (booking.stylistNotes ?? '').trim()) {
      await updateBookingSessionNotes(linkedSite, appointmentId, notes);
    }
  };

  const finalizeAppointment = async () => {
    await persistNotes();
    await completeBooking(linkedSite, appointmentId);
    if (sendReview) {
      try {
        await requestReviewEmail(appointmentId);
      } catch {
        // best effort
      }
    }
    await onRefresh();
  };

  const finishAppointment = async () => {
    setFinishing(true);
    try {
      await finalizeAppointment();
      setShowThankYou(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not finish appointment.');
    } finally {
      setFinishing(false);
    }
  };

  const handleReviewContinue = async () => {
    try {
      await persistNotes();
    } catch {
      // continue anyway
    }
    if (isPaid) {
      void finishAppointment();
      return;
    }
    goNext();
  };

  const handlePercentSelect = (percent: number) => {
    setSelectedPercent(percent);
    setCustomTip('');
    setTipAmount(tipFromPercent(tipBase, percent));
  };

  const handleCustomContinue = () => {
    const parsed = parseFloat(customTip.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setTipAmount(Math.round(parsed * 100) / 100);
      setSelectedPercent(null);
    }
    goToStep('summary');
  };

  const runTapToPay = async () => {
    if (!subdomain) {
      Alert.alert('Site not published', 'Publish your site before collecting card payments.');
      return;
    }
    if (!stripeReady) {
      Alert.alert('Styld Pay required', 'Set up Styld Pay in Form & Payments first.');
      return;
    }
    if (totalCharge < 0.5) {
      Alert.alert('Nothing to charge', 'Use Cash for amounts under $0.50.');
      return;
    }

    if (tapToPayCheckout?.connectPhase === 'initializing') {
      goToStep('tapToPay');
      return;
    }

    if (tapToPayCheckout && !tapToPayCheckout.readerConnected) {
      const result = await tapToPayCheckout.connectTapToPay(subdomain);
      if (!result.ok) {
        Alert.alert('Tap to Pay', formatTapToPayError(result.error ?? 'Could not enable Tap to Pay.'));
        return;
      }
    }

    setPaying(true);
    try {
      await collectTapToPayPayment({
        bookingId: booking.id,
        subdomain,
        balanceCents: Math.round(balanceDue * 100),
        tipCents: Math.round(tipAmount * 100),
        customerEmail: booking.email || undefined,
      });
      await onRefresh();
      await finalizeAppointment();
      setShowThankYou(true);
    } catch (err) {
      const message = formatTapToPayError(err instanceof Error ? err.message : 'Payment failed');
      if (message !== 'Payment cancelled.') {
        Alert.alert('Payment failed', message, [
          { text: 'Try card instead', onPress: () => void runCardPayment() },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } finally {
      setPaying(false);
    }
  };

  const runCardPayment = async () => {
    if (!subdomain || !stripeReady) return;
    setPaying(true);
    try {
      await collectCardPayment({
        bookingId: booking.id,
        subdomain,
        balanceCents: Math.round(balanceDue * 100),
        tipCents: Math.round(tipAmount * 100),
        customerEmail: booking.email || undefined,
      });
      await onRefresh();
      await finalizeAppointment();
      setShowThankYou(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      if (message !== 'Payment cancelled.') Alert.alert('Payment failed', message);
    } finally {
      setPaying(false);
    }
  };

  const handleCashCheckout = async () => {
    setPaying(true);
    try {
      await recordBookingCashPayment(linkedSite, booking.id, {
        balanceAmount: balanceDue,
        tipAmount,
      });
      await finalizeAppointment();
      setShowThankYou(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not record cash payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleCardCheckout = () => {
    if (!subdomain) {
      Alert.alert('Site not published', 'Publish your site before collecting card payments.');
      return;
    }
    if (!stripeReady) {
      Alert.alert('Styld Pay required', 'Set up Styld Pay in Form & Payments first.');
      return;
    }
    void runCardPayment();
  };

  const handleTapToPayCheckout = () => {
    if (!subdomain) {
      Alert.alert('Site not published', 'Publish your site before collecting card payments.');
      return;
    }
    if (!stripeReady) {
      Alert.alert('Styld Pay required', 'Set up Styld Pay in Form & Payments first.');
      return;
    }
    if (tapToPayCheckout?.connectPhase === 'initializing') {
      goToStep('tapToPay');
      return;
    }
    goToStep('tapToPay');
  };

  const showNativeTapToPay = Platform.OS === 'ios' && TAP_TO_PAY_NATIVE_ENABLED;
  const isTapToPayInitializing = tapToPayCheckout?.connectPhase === 'initializing';

  const stepTitle: Record<FinishStep, string> = {
    review: 'Request a review',
    tipPercent: 'Add a tip',
    tipCustom: 'Custom tip amount',
    summary: 'Choose payment',
    tapToPay: TAP_TO_PAY_BUTTON_LABEL,
  };

  const stepSubtitle: Record<FinishStep, string> = {
    review: `Send ${clientName} a link to share feedback after this visit.`,
    tipPercent: `Tip on ${maskMoney('$' + tipBase.toFixed(2), privacyMode)} service total`,
    tipCustom: 'Enter any amount you prefer',
    summary: 'How would your client like to pay?',
    tapToPay: isTapToPayInitializing
      ? 'Tap to Pay is preparing on this iPhone'
      : 'Hold the top of your iPhone near your client\'s card or device',
  };

  const renderFooter = () => {
    if (step === 'review') {
      return (
        <Pressable
          style={[styles.primaryBtn, finishing && styles.btnDisabled]}
          disabled={finishing}
          onPress={() => void handleReviewContinue()}
        >
          {finishing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.primaryBtnText}>{isPaid ? 'Finish appointment' : 'Continue'}</Text>
          )}
        </Pressable>
      );
    }

    if (step === 'tipPercent') {
      return (
        <View style={styles.footerRow}>
          <Pressable
            style={styles.textBtn}
            onPress={() => {
              setTipAmount(0);
              setSelectedPercent(null);
              setCustomTip('');
              skipToSummary();
            }}
          >
            <Text style={styles.textBtnLabel}>No tip</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, styles.primaryBtnFlex, selectedPercent == null && styles.btnDisabled]}
            disabled={selectedPercent == null}
            onPress={skipToSummary}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        </View>
      );
    }

    if (step === 'tipCustom') {
      return (
        <Pressable style={styles.primaryBtn} onPress={handleCustomContinue}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      );
    }

    if (step === 'summary') {
      return (
        <View style={styles.footerStack}>
          {showNativeTapToPay ? (
            <Pressable
              style={[styles.tapToPayBtn, (paying || finishing) && styles.btnDisabled]}
              disabled={paying || finishing}
              onPress={handleTapToPayCheckout}
            >
              <TapToPayWaveIcon size={20} color={colors.background} />
              <Text style={styles.tapToPayBtnText}>{TAP_TO_PAY_BUTTON_LABEL}</Text>
            </Pressable>
          ) : null}
          <View style={styles.footerRow}>
            <Pressable
              style={[styles.secondaryBtn, styles.secondaryBtnFlex, (paying || finishing) && styles.btnDisabled]}
              disabled={paying || finishing}
              onPress={() => void handleCashCheckout()}
            >
              {paying ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={18} color={colors.text} />
                  <Text style={styles.secondaryBtnText}>Cash</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.primaryBtnFlex, (paying || finishing) && styles.btnDisabled]}
              disabled={paying || finishing}
              onPress={handleCardCheckout}
            >
              <Ionicons name="card-outline" size={18} color={colors.background} />
              <Text style={styles.primaryBtnText}>Card</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (step === 'tapToPay') {
      return (
        <Pressable
          style={[styles.tapToPayBtn, (paying || isTapToPayInitializing) && styles.btnDisabled]}
          disabled={paying || isTapToPayInitializing}
          onPress={() => void runTapToPay()}
        >
          {paying || isTapToPayInitializing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <TapToPayWaveIcon size={20} color={colors.background} />
              <Text style={styles.tapToPayBtnText}>
                {TAP_TO_PAY_BUTTON_LABEL} · {maskMoney('$' + totalCharge.toFixed(2), privacyMode)}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (showThankYou) onComplete();
        else onClose();
      }}
    >
      <View style={styles.root}>
        <ScreenGradient />
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          {showThankYou ? (
            <View style={styles.thankYouScreen}>
              <View style={styles.thankYouIcon}>
                <Ionicons name="checkmark" size={44} color="#15803d" />
              </View>
              <Text style={styles.thankYouTitle}>Thank you!</Text>
              <Text style={styles.thankYouBody}>Appointment complete</Text>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
            <View style={[styles.topChrome, { paddingTop: topChromePadding }]}>
              <View style={styles.header}>
                <Pressable style={styles.headerBtn} onPress={goBack} hitSlop={12}>
                  <Ionicons
                    name={stepIndex === 0 ? 'close' : 'chevron-back'}
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={styles.headerBtn} />
              </View>

              {!isPaid && (
                <View style={styles.phaseRow}>
                  {PHASE_LABELS.map((label, index) => {
                    const done = index < currentPhase;
                    const active = index === currentPhase;
                    return (
                      <View key={label} style={styles.phaseItem}>
                        <View
                          style={[
                            styles.phaseDot,
                            done && styles.phaseDotDone,
                            active && styles.phaseDotActive,
                          ]}
                        >
                          {done ? (
                            <Ionicons name="checkmark" size={10} color={colors.background} />
                          ) : (
                            <Text style={[styles.phaseDotText, active && styles.phaseDotTextActive]}>
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(6, progress * 100)}%` }]} />
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{stepTitle[step]}</Text>
                <Text style={styles.stepSubtitle}>{stepSubtitle[step]}</Text>

                {step === 'review' && (
                  <View style={styles.block}>
                    <View style={styles.clientCard}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{clientInitials(clientName)}</Text>
                      </View>
                      <View style={styles.clientMeta}>
                        <Text style={styles.clientName}>{clientName}</Text>
                        <Text style={styles.clientService} numberOfLines={1}>
                          {booking.service}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.settingsCard}>
                      <View style={styles.settingsRow}>
                        <View style={styles.settingsIconWrap}>
                          <Ionicons name="mail-outline" size={18} color={colors.accentPink} />
                        </View>
                        <View style={styles.settingsCopy}>
                          <Text style={styles.settingsTitle}>Review request email</Text>
                          <Text style={styles.settingsBody}>
                            Sent after you finish this appointment
                          </Text>
                        </View>
                        <Switch
                          value={sendReview}
                          onValueChange={setSendReview}
                          trackColor={{ false: colors.progressTrack, true: colors.accentPinkMuted }}
                          thumbColor={sendReview ? colors.accentPink : colors.textMuted}
                        />
                      </View>

                      <View style={styles.settingsDivider} />

                      <View style={styles.notesSection}>
                        <Text style={styles.sectionLabel}>Session notes</Text>
                        <TextInput
                          style={styles.notesInput}
                          multiline
                          placeholder="Private notes for your records…"
                          placeholderTextColor={colors.textMuted}
                          value={notes}
                          onChangeText={setNotes}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {step === 'tipPercent' && (
                  <View style={styles.block}>
                    <View style={styles.percentGrid}>
                      {TIP_PERCENT_PRESETS.map((percent) => {
                        const amount = tipFromPercent(tipBase, percent);
                        const active = selectedPercent === percent;
                        const recommended = percent === 20;
                        return (
                          <Pressable
                            key={percent}
                            style={[styles.percentChip, active && styles.percentChipActive]}
                            onPress={() => handlePercentSelect(percent)}
                          >
                            {recommended && (
                              <Text style={[styles.recommendedBadge, active && styles.recommendedBadgeActive]}>
                                Popular
                              </Text>
                            )}
                            <Text style={[styles.percentValue, active && styles.percentValueActive]}>
                              {percent}%
                            </Text>
                            <Text style={[styles.percentAmount, active && styles.percentAmountActive]}>
                              {maskMoney(`$${amount.toFixed(2)}`, privacyMode)}
                            </Text>
                            {active && (
                              <View style={styles.percentCheck}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.accentPink} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable
                      style={styles.linkRow}
                      onPress={() => {
                        setSelectedPercent(null);
                        setCustomTip(tipAmount > 0 ? tipAmount.toFixed(2) : '');
                        setUsedCustomTipStep(true);
                        goToStep('tipCustom');
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.accentPink} />
                      <Text style={styles.linkRowText}>Enter a custom amount</Text>
                    </Pressable>
                  </View>
                )}

                {step === 'tipCustom' && (
                  <View style={styles.block}>
                    <View style={styles.currencyCard}>
                      <Text style={styles.sectionLabel}>Tip amount</Text>
                      <View style={styles.currencyRow}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.currencyInput}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          value={customTip}
                          onChangeText={setCustomTip}
                          autoFocus
                        />
                      </View>
                      <Text style={styles.hint}>
                        Based on {maskMoney(`$${tipBase.toFixed(2)}`, privacyMode)} service total
                      </Text>
                    </View>
                  </View>
                )}

                {step === 'summary' && (
                  <View style={styles.block}>
                    <View style={styles.receiptCard}>
                      <View style={styles.receiptHeader}>
                        <Text style={styles.receiptTitle}>Receipt</Text>
                        <Text style={styles.receiptClient}>{clientName}</Text>
                      </View>
                      <View style={styles.receiptDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{booking.service}</Text>
                        <Text style={styles.summaryValue}>
                          {maskMoney(`$${balanceDue.toFixed(2)}`, privacyMode)}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tip</Text>
                        <Text style={styles.summaryValue}>
                          {maskMoney(`$${tipAmount.toFixed(2)}`, privacyMode)}
                        </Text>
                      </View>
                      <View style={styles.receiptDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryTotalLabel}>Total due</Text>
                        <Text style={styles.summaryTotalValue}>
                          {maskMoney(`$${totalCharge.toFixed(2)}`, privacyMode)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {step === 'tapToPay' && (
                  <View style={styles.block}>
                    {isTapToPayInitializing ? (
                      <View style={styles.initializingCard}>
                        <ActivityIndicator color={colors.accentPink} size="large" />
                        <Text style={styles.initializingTitle}>Initializing Tap to Pay</Text>
                        <Text style={styles.initializingBody}>
                          {tapToPayCheckout?.connectMessage ||
                            'Tap to Pay on iPhone will be available shortly on this device.'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.tapCard}>
                        <View style={styles.tapIconRing}>
                          {showNativeTapToPay ? (
                            <TapToPayWaveIcon size={36} color={colors.accentPink} />
                          ) : (
                            <Ionicons name="radio-outline" size={36} color={colors.accentPink} />
                          )}
                        </View>
                        <Text style={styles.tapAmount}>
                          {maskMoney(`$${totalCharge.toFixed(2)}`, privacyMode)}
                        </Text>
                        <Text style={styles.tapHint}>
                          {Platform.OS === 'ios'
                            ? 'Hold the top of your iPhone near the client\'s card or digital wallet'
                            : Platform.OS === 'web'
                              ? 'Charge the card using the payment sheet'
                              : 'Hold the back of your phone near the client\'s card'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {renderFooter()}
            </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const BASE_STYLES = {
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topChrome: {
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  phaseItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  phaseDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  phaseDotDone: {
    backgroundColor: colors.accentPink,
    borderColor: colors.accentPink,
  },
  phaseDotActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  phaseDotText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  phaseDotTextActive: {
    color: colors.accentPink,
  },
  phaseLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  phaseLabelActive: {
    color: colors.text,
  },
  progressTrack: {
    height: 2,
    marginHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accentPink,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  stepContent: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  stepTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
    fontFamily: fonts.number,
    marginBottom: 8,
  },
  stepSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 340,
  },
  block: { gap: 14 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
  },
  avatarText: {
    color: colors.accentPink,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: fonts.number,
  },
  clientMeta: { flex: 1, gap: 2 },
  clientName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  clientService: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  settingsCard: {
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtleTintBg,
  },
  settingsCopy: { flex: 1, gap: 2 },
  settingsTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  settingsBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 16,
  },
  notesSection: { padding: 16, gap: 8 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  notesInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  percentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  percentChip: {
    width: '47%',
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 4,
    position: 'relative',
  },
  percentChipActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  recommendedBadgeActive: { color: colors.accentPink },
  percentValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.number,
  },
  percentValueActive: { color: colors.accentPink },
  percentAmount: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  percentAmountActive: { color: colors.accentPink },
  percentCheck: { position: 'absolute', bottom: 10, right: 10 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  linkRowText: { color: colors.accentPink, fontSize: 14, fontWeight: '600' },
  currencyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 8,
  },
  currencySymbol: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: '600',
    marginRight: 4,
    fontFamily: fonts.number,
  },
  currencyInput: {
    flex: 1,
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    paddingVertical: 4,
    fontFamily: fonts.number,
  },
  hint: { color: colors.textMuted, fontSize: 13 },
  receiptCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  receiptHeader: { gap: 2 },
  receiptTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  receiptClient: { color: colors.text, fontSize: 16, fontWeight: '700' },
  receiptDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 15, flex: 1 },
  summaryValue: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.number },
  summaryTotalLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  summaryTotalValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.number,
  },
  tapCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  tapIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tapAmount: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    fontFamily: fonts.number,
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  thankYouScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  thankYouIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  thankYouTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: fonts.number,
  },
  thankYouBody: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(10,10,10,0.92)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerStack: { gap: 10 },
  tapToPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tapToPayBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  initializingCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 28,
  },
  initializingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  initializingBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnFlex: { flex: 1 },
  primaryBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  secondaryBtnFlex: { flex: 1 },
  secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  textBtn: {
    paddingHorizontal: 4,
    paddingVertical: 14,
    minWidth: 72,
    alignItems: 'center',
  },
  textBtnLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
};

function FinishAppointmentFlowNative(props: Omit<Props, 'collectTapToPayPayment' | 'collectCardPayment' | 'tapToPayCheckout'>) {
  const { collectTapToPayPayment, collectCardPayment } = useTapToPayCheckout();
  const { readerConnected, connectPhase, connectMessage, connectTapToPay } = useTapToPay();

  return (
    <FinishAppointmentFlowContent
      {...props}
      collectTapToPayPayment={collectTapToPayPayment}
      collectCardPayment={collectCardPayment}
      tapToPayCheckout={{
        readerConnected,
        connectPhase,
        connectMessage,
        connectTapToPay,
      }}
    />
  );
}

export default function FinishAppointmentFlow(
  props: Omit<Props, 'collectTapToPayPayment' | 'collectCardPayment'>,
) {
  if (Platform.OS === 'web' || !TAP_TO_PAY_NATIVE_ENABLED) {
    return (
      <FinishAppointmentFlowContent
        {...props}
        collectTapToPayPayment={collectTapToPayPaymentFallback}
        collectCardPayment={chargeBookingInPerson}
      />
    );
  }
  return <FinishAppointmentFlowNative {...props} />;
}
