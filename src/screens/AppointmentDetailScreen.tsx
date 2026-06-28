import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookingPhotoGallery from '../components/BookingPhotoGallery';
import ScreenGradient from '../components/ScreenGradient';
import ServiceImage from '../components/ServiceImage';
import { useSiteData } from '../context/SiteDataContext';
import { usePrivacyMode } from '../context/PrivacyContext';
import { cancelBooking, completeBooking, approveBooking, declinePendingBooking, startBookingSession } from '../lib/siteAdmin';
import StartAppointmentCard from '../components/booking/StartAppointmentCard';
import { requestReviewEmail } from '../lib/siteReviews';
import { CalendarStackParamList } from '../navigation/CalendarNavigator';
import { DashboardStackParamList } from '../navigation/DashboardNavigator';
import { getCalendarEventColors } from '../lib/styleEventColors';
import { flatListStyles } from '../theme/flatList';
import { colors, fonts } from '../theme';
import { maskMoney } from '../utils/money';

function refundStatusLabel(status: string): string | null {
  const s = status.toLowerCase();
  if (s === 'succeeded') return 'Refunded';
  if (s === 'pending') return 'Refund processing';
  if (s === 'failed') return 'Refund failed';
  if (s === 'skipped') return 'No refund issued';
  return null;
}

type Props = NativeStackScreenProps<
  DashboardStackParamList | CalendarStackParamList,
  'AppointmentDetail'
>;

// ─── helpers ─────────────────────────────────────────────────────────────────

function bookingStatusColor(status: string, depositPaid: boolean): string {
  if (status === 'in_progress') return colors.accentPink;
  if (status === 'pending_approval') return '#f59e0b';
  if (status === 'completed') return '#15803d';
  if (status === 'cancelled' || status === 'canceled') return '#dc2626';
  if (depositPaid || status === 'confirmed') return colors.accentPink;
  return '#f59e0b';
}

function bookingStatusLabel(status: string, depositPaid: boolean): string {
  if (status === 'in_progress') return 'In session';
  if (status === 'pending_approval') return 'Pending approval';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled' || status === 'canceled') return 'Cancelled';
  if (status === 'confirmed') return 'Confirmed';
  if (depositPaid) return 'Deposit paid';
  if (status === 'pending_payment') return 'Awaiting payment';
  return 'Upcoming';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  tappable,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tappable?: boolean;
  onPress?: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={colors.textMuted} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, tappable && styles.infoValueLink]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {tappable && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
    </View>
  );
  if (tappable && onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PaymentBreakdown({
  price,
  depositAmount,
  depositPaid,
  bookingStatus,
  privacyMode,
}: {
  price: number;
  depositAmount: number;
  depositPaid: boolean;
  bookingStatus: string;
  privacyMode: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const isFullyPaid =
    bookingStatus === 'completed' ||
    (depositPaid && depositAmount >= price);
  const remaining = price - (depositPaid ? depositAmount : 0);

  return (
    <View style={styles.paymentGrid}>
      {/* Total */}
      <View style={styles.paymentCell}>
        <Text style={styles.paymentCellAmount}>
          {maskMoney(`$${price.toFixed(2)}`, privacyMode)}
        </Text>
        <Text style={styles.paymentCellLabel}>Total</Text>
      </View>

      <View style={styles.paymentDivider} />

      {/* Deposit */}
      <View style={styles.paymentCell}>
        {depositPaid ? (
          <>
            <View style={styles.paymentPaidRow}>
              <Text style={styles.paymentCellAmount}>
                {maskMoney(`$${depositAmount.toFixed(2)}`, privacyMode)}
              </Text>
            </View>
            <Text style={[styles.paymentCellLabel, styles.paymentPaidLabel]}>Deposit paid</Text>
          </>
        ) : (
          <>
            <Text style={[styles.paymentCellAmount, styles.paymentUnpaid]}>—</Text>
            <Text style={styles.paymentCellLabel}>No deposit</Text>
          </>
        )}
      </View>

      <View style={styles.paymentDivider} />

      {/* Remaining / Paid in full */}
      <View style={styles.paymentCell}>
        {isFullyPaid ? (
          <>
            <View style={styles.paymentPaidRow}>
              <Ionicons name="checkmark-circle" size={18} color="#15803d" />
              <Text style={[styles.paymentCellAmount, { color: '#15803d' }]}>Full</Text>
            </View>
            <Text style={styles.paymentCellLabel}>Paid in full</Text>
          </>
        ) : (
          <>
            <Text style={[styles.paymentCellAmount, styles.paymentDue]}>
              {maskMoney(`$${remaining.toFixed(2)}`, privacyMode)}
            </Text>
            <Text style={styles.paymentCellLabel}>Due at service</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function AppointmentDetailScreen({ navigation, route }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { appointmentId } = route.params;
  const { privacyMode } = usePrivacyMode();
  const { getAppointmentById, bookings, refresh, linkedSite } = useSiteData();
  const appointment = getAppointmentById(appointmentId);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Raw booking record gives us email + bookingStatus
  const rawBooking = bookings.find((b) => b.id === appointmentId);

  if (!appointment) {
    return (
      <View style={styles.container}>
        <ScreenGradient />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.errorText}>Appointment not found.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const bookingStatus = rawBooking?.bookingStatus ?? appointment.status;
  const statusLabel = bookingStatusLabel(bookingStatus, appointment.depositPaid);
  const statusColor = bookingStatusColor(bookingStatus, appointment.depositPaid);
  const eventColors = getCalendarEventColors({
    styleId: appointment.styleId,
    title: appointment.service,
    completed: bookingStatus === 'completed',
  });
  const email = rawBooking?.email ?? '';

  const handleCall = () => Linking.openURL(`tel:${appointment.clientPhone}`);
  const handleEmail = () => email && Linking.openURL(`mailto:${email}`);
  const handleMarkComplete = () => {
    if (!linkedSite) {
      Alert.alert('No linked site', 'Connect your site before completing appointments.');
      return;
    }

    Alert.alert('Mark as Complete', `Mark "${appointment.service}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Complete',
        style: 'default',
        onPress: async () => {
          setCompleting(true);
          try {
            await completeBooking(linkedSite, appointmentId);
            try {
              await requestReviewEmail(appointmentId);
            } catch {
              // Review email is best-effort — completion still succeeded.
            }
            await refresh();
            Alert.alert('Completed', 'Appointment marked complete. A review request email was sent if reviews are enabled.');
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not complete booking');
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };
  const handleCancel = () => {
    if (!linkedSite) {
      Alert.alert('No linked site', 'Connect your site before cancelling appointments.');
      return;
    }

    Alert.alert(
      'Cancel Appointment',
      `Cancel "${appointment?.service}" for ${appointment?.clientName}? The client will be emailed and any eligible refund will be processed automatically.`,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelBooking(linkedSite, appointmentId);
              await refresh();
              navigation.goBack();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Could not cancel booking';
              Alert.alert('Error', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const isCompleted = bookingStatus === 'completed';
  const isCancelled = bookingStatus === 'cancelled' || bookingStatus === 'canceled';
  const isPendingApproval = bookingStatus === 'pending_approval';
  const isInProgress = bookingStatus === 'in_progress';
  const canStartSession =
    !isCompleted &&
    !isCancelled &&
    !isPendingApproval &&
    bookingStatus === 'confirmed';

  const openSession = () => {
    navigation.navigate('AppointmentSession', { appointmentId });
  };

  const handleStartSession = async () => {
    if (!linkedSite) return;
    setStarting(true);
    try {
      await startBookingSession(linkedSite, appointmentId);
      await refresh();
      openSession();
    } catch (err) {
      Alert.alert('Could not start', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleApprove = async () => {
    if (!linkedSite) return;
    setApproving(true);
    try {
      await approveBooking(linkedSite, appointmentId);
      await refresh();
      Alert.alert('Accepted', 'The client will receive a confirmation email.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not accept booking');
    } finally {
      setApproving(false);
    }
  };

  const handleDecline = () => {
    if (!linkedSite) return;
    Alert.alert('Decline booking', `Decline ${appointment.clientName}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await declinePendingBooking(linkedSite, appointmentId);
            await refresh();
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not decline booking');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Appointment</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={[styles.heroSection, { borderLeftColor: eventColors.borderColor }]}>
            <View style={styles.heroTop}>
              <ServiceImage
                styleId={appointment.styleId}
                serviceName={appointment.service}
                size={72}
                circular
                style={styles.heroImage}
              />
              <View style={styles.heroMeta}>
                <Text style={styles.heroService} numberOfLines={2}>{appointment.service}</Text>
                <Text style={styles.heroClient}>{appointment.clientName}</Text>
                <Text style={[styles.heroStatus, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <Text style={styles.heroPrice}>
                {maskMoney(`$${appointment.price.toFixed(2)}`, privacyMode)}
              </Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={styles.heroStatText}>{appointment.date}</Text>
              </View>
              <View style={styles.heroStatDot} />
              <View style={styles.heroStat}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.heroStatText}>{appointment.time.split(' – ')[0]}</Text>
              </View>
              <View style={styles.heroStatDot} />
              <View style={styles.heroStat}>
                <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
                <Text style={styles.heroStatText}>{appointment.duration}</Text>
              </View>
            </View>
          </View>

          {isInProgress ? (
            <Pressable style={styles.sessionBanner} onPress={openSession}>
              <View style={styles.sessionBannerDot} />
              <View style={styles.sessionBannerBody}>
                <Text style={styles.sessionBannerTitle}>Session in progress</Text>
                <Text style={styles.sessionBannerSub}>Tap to open timer</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accentPink} />
            </Pressable>
          ) : canStartSession && linkedSite ? (
            <StartAppointmentCard onStart={handleStartSession} starting={starting} />
          ) : null}

          {/* ── Payment breakdown ── */}
          <SectionCard title="Payment">
            <PaymentBreakdown
              price={appointment.price}
              depositAmount={appointment.depositAmount}
              depositPaid={appointment.depositPaid}
              bookingStatus={bookingStatus}
              privacyMode={privacyMode}
            />
            {isCancelled && rawBooking?.refundStatus && rawBooking.refundStatus !== 'none' ? (
              <View style={styles.refundBanner}>
                <Text style={styles.refundBannerLabel}>
                  {refundStatusLabel(rawBooking.refundStatus) ?? 'Refund'}
                </Text>
                {rawBooking.refundAmountCents > 0 ? (
                  <Text style={styles.refundBannerAmount}>
                    {maskMoney(
                      `$${(rawBooking.refundAmountCents / 100).toFixed(2)}`,
                      privacyMode,
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </SectionCard>

          {rawBooking?.orderProducts?.length ? (
            <SectionCard title="Products">
              {rawBooking.orderProducts.map((line) => (
                <InfoRow
                  key={`${line.product_id}-${line.title}`}
                  icon="bag-outline"
                  label={`${line.qty}× ${line.title}`}
                  value={maskMoney(`$${(line.qty * line.unit_price).toFixed(2)}`, privacyMode)}
                />
              ))}
              {rawBooking.fulfillmentMethod ? (
                <InfoRow
                  icon="car-outline"
                  label="Fulfillment"
                  value={
                    rawBooking.fulfillmentMethod === 'at_appointment'
                      ? 'With appointment'
                      : rawBooking.fulfillmentMethod === 'shipping'
                        ? 'Ship to client'
                        : 'Pickup'
                  }
                />
              ) : null}
              {rawBooking.shippingAmount > 0 ? (
                <InfoRow
                  icon="airplane-outline"
                  label="Shipping"
                  value={maskMoney(`$${rawBooking.shippingAmount.toFixed(2)}`, privacyMode)}
                />
              ) : null}
            </SectionCard>
          ) : null}

          {/* ── Client info ── */}
          <SectionCard title="Client">
            <InfoRow icon="person-outline" label="Name" value={appointment.clientName} />
            {appointment.clientPhone && appointment.clientPhone !== '—' && (
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={privacyMode ? '••••••••' : appointment.clientPhone}
                tappable
                onPress={handleCall}
              />
            )}
            {email ? (
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={privacyMode ? '••••••••' : email}
                tappable
                onPress={handleEmail}
              />
            ) : null}
            {appointment.hairType ? (
              <InfoRow icon="cut-outline" label="Hair type" value={appointment.hairType} />
            ) : null}
          </SectionCard>

          {/* ── Client photos ── */}
          <SectionCard title="Photos">
            <BookingPhotoGallery
              photoHairPath={rawBooking?.photoHairPath}
              photoRefPath={rawBooking?.photoRefPath}
              storageBookingId={rawBooking?.storageBookingId}
            />
          </SectionCard>

          {/* ── Notes ── */}
          {rawBooking?.stylistNotes ? (
            <SectionCard title="Session notes">
              <Text style={styles.notesText}>{rawBooking.stylistNotes}</Text>
            </SectionCard>
          ) : null}

          {appointment.notes && appointment.notes !== 'No notes added.' ? (
            <SectionCard title="Notes">
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </SectionCard>
          ) : null}

          {/* ── Action buttons ── */}
          <View style={styles.actionsRow}>
            {appointment.clientPhone && appointment.clientPhone !== '—' && (
              <Pressable style={styles.actionBtn} onPress={handleCall}>
                <Ionicons name="call-outline" size={18} color={colors.text} />
                <Text style={styles.actionBtnText}>Call</Text>
              </Pressable>
            )}
            {email ? (
              <Pressable style={styles.actionBtn} onPress={handleEmail}>
                <Ionicons name="mail-outline" size={18} color={colors.text} />
                <Text style={styles.actionBtnText}>Email</Text>
              </Pressable>
            ) : null}
          </View>

          {isPendingApproval ? (
            <View style={styles.managementRow}>
              <Pressable style={styles.completeBtn} onPress={handleApprove} disabled={approving || cancelling}>
                {approving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.background} />
                )}
                <Text style={styles.completeBtnText}>{approving ? 'Accepting…' : 'Accept booking'}</Text>
              </Pressable>
              <Pressable style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]} onPress={handleDecline} disabled={cancelling || approving}>
                {cancelling ? (
                  <ActivityIndicator size="small" color="#f87171" />
                ) : (
                  <Ionicons name="close-circle-outline" size={18} color="#f87171" />
                )}
                <Text style={styles.cancelBtnText}>{cancelling ? 'Declining…' : 'Decline'}</Text>
              </Pressable>
            </View>
          ) : null}

          {!isCompleted && !isCancelled && !isPendingApproval && !canStartSession && !isInProgress && (
            <View style={styles.managementRow}>
              <Pressable style={styles.completeBtn} onPress={handleMarkComplete} disabled={completing}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.background} />
                <Text style={styles.completeBtnText}>{completing ? 'Saving…' : 'Mark as complete'}</Text>
              </Pressable>
              <Pressable style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]} onPress={handleCancel} disabled={cancelling}>
                {cancelling
                  ? <ActivityIndicator size="small" color="#f87171" />
                  : <Ionicons name="close-circle-outline" size={18} color="#f87171" />}
                <Text style={styles.cancelBtnText}>{cancelling ? 'Cancelling…' : 'Cancel'}</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  errorText: { color: colors.text, fontSize: 16, padding: 24 },

  content: { paddingHorizontal: 20, paddingBottom: 48 },

  heroSection: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroImage: { flexShrink: 0, marginTop: 2 },
  heroMeta: { flex: 1, gap: 4 },
  heroService: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 22 },
  heroClient: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  heroStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroPrice: {
    color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5, flexShrink: 0,
    fontFamily: fonts.number,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.calendarGridLine,
    marginVertical: 14,
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  heroStatDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted },

  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 10,
    marginBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  sessionBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentPink,
  },
  sessionBannerBody: { flex: 1, gap: 2 },
  sessionBannerTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sessionBannerSub: { color: colors.textMuted, fontSize: 13 },

  /* Sections */
  section: flatListStyles.section,
  sectionTitle: flatListStyles.sectionTitle,

  /* Payment */
  paymentGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  paymentCell: { flex: 1, alignItems: 'center', gap: 4 },
  paymentDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.calendarGridLine,
    marginHorizontal: 4,
  },
  paymentCellAmount: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: fonts.number },
  paymentCellLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  paymentPaidLabel: { color: '#15803d', fontWeight: '600' },
  paymentPaidRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentUnpaid: { color: colors.textMuted },
  paymentDue: { color: '#f59e0b' },
  refundBanner: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.calendarGridLine,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundBannerLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  refundBannerAmount: { color: colors.text, fontSize: 15, fontWeight: '700' },

  /* Info rows */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  infoIconWrap: { width: 28, alignItems: 'center', marginRight: 10 },
  infoContent: { flex: 1 },
  infoLabel: {
    color: colors.textMuted, fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1,
  },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  infoValueLink: { color: colors.accentPink },

  /* Notes */
  notesText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, paddingLeft: 10 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  actionBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  managementRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.profileBlue,
    borderRadius: 8,
    paddingVertical: 14,
  },
  completeBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  cancelBtnText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  cancelBtnDisabled: { opacity: 0.5 },
};
