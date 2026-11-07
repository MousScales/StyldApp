import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FinishAppointmentFlow from '../components/booking/FinishAppointmentFlow';
import ScreenGradient from '../components/ScreenGradient';
import SessionTimer from '../components/booking/SessionTimer';
import { useOnboarding } from '../context/OnboardingContext';
import { usePrivacyMode } from '../context/PrivacyContext';
import { useSiteData } from '../context/SiteDataContext';
import { getBalanceDue, isBookingAssumedFinished, isBookingLiveSession, isBookingScheduledToday } from '../lib/siteData';
import { markSessionLiveEngaged } from '../lib/siteAdmin';
import { loadBookingPayment } from '../lib/siteServices';
import { fetchStripeConnectStatus } from '../lib/stripeConnect';
import { CalendarStackParamList } from '../navigation/CalendarNavigator';
import { DashboardStackParamList } from '../navigation/DashboardNavigator';
import { colors } from '../theme';
import { maskMoney } from '../utils/money';

type Props = NativeStackScreenProps<
  DashboardStackParamList | CalendarStackParamList,
  'AppointmentSession'
>;

export default function AppointmentSessionScreen({ navigation, route }: Props) {
  const { appointmentId } = route.params;
  const { privacyMode } = usePrivacyMode();
  const { sitePublish } = useOnboarding();
  const { getAppointmentById, bookings, refresh, linkedSite } = useSiteData();

  const appointment = getAppointmentById(appointmentId);
  const booking = bookings.find((b) => b.id === appointmentId);
  const assumedFinished = booking ? isBookingAssumedFinished(booking) : false;

  const otherAssumedFinished = useMemo(
    () =>
      bookings.filter(
        (row) =>
          row.id !== appointmentId &&
          isBookingAssumedFinished(row) &&
          isBookingScheduledToday(row),
      ),
    [appointmentId, bookings],
  );

  const [stripeReady, setStripeReady] = useState(false);
  const [showFinishFlow, setShowFinishFlow] = useState(false);
  const [platformFeePayer, setPlatformFeePayer] = useState<'client' | 'tenant'>('client');

  useEffect(() => {
    void fetchStripeConnectStatus()
      .then((s) => setStripeReady(s.chargesEnabled === true))
      .catch(() => setStripeReady(false));
  }, []);

  useEffect(() => {
    if (!linkedSite) return;
    void loadBookingPayment(linkedSite)
      .then((payment) => setPlatformFeePayer(payment.platformFeePayer))
      .catch(() => setPlatformFeePayer('client'));
  }, [linkedSite]);

  useEffect(() => {
    if (!booking || !linkedSite) return;
    if (!isBookingLiveSession(booking)) {
      navigation.replace('AppointmentDetail', { appointmentId });
      return;
    }
    void markSessionLiveEngaged(linkedSite, appointmentId).then(() => refresh({ silent: true }));
  }, [appointmentId, booking, linkedSite, navigation, refresh]);

  const balanceDue = booking ? getBalanceDue(booking) : 0;
  const isPaid = !booking || balanceDue <= 0 || booking.paymentStatus.toLowerCase() === 'paid';
  const subdomain = sitePublish.subdomain ?? '';
  const sessionStart = booking?.sessionStartedAt ?? booking?.startsAt ?? null;

  if (!appointment || !booking || !linkedSite) {
    return (
      <View style={styles.root}>
        <ScreenGradient />
        <SafeAreaView style={styles.safe}>
          <Text style={styles.errorText}>Appointment not found.</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-down" size={24} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {appointment.clientName}
          </Text>
          <Pressable
            style={styles.headerBtn}
            onPress={() => navigation.navigate('AppointmentDetail', { appointmentId })}
            hitSlop={12}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {otherAssumedFinished.length > 0 ? (
          <View style={styles.overlayStack}>
            {otherAssumedFinished.map((row) => (
              <Pressable
                key={row.id}
                style={styles.overlayCard}
                onPress={() => navigation.replace('AppointmentSession', { appointmentId: row.id })}
              >
                <Text style={styles.overlayTitle}>Appointment assumed finished</Text>
                <Text style={styles.overlayBody} numberOfLines={1}>
                  {row.fullName} · {row.service}
                </Text>
                <Text style={styles.overlayCta}>Tap to finish checkout →</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.hero}>
          {assumedFinished ? (
            <View style={styles.assumedBanner}>
              <Text style={styles.assumedBannerTitle}>Appointment assumed finished</Text>
              <Text style={styles.assumedBannerBody}>
                The scheduled time ended while you weren&apos;t in live view. Finish checkout when
                you&apos;re ready.
              </Text>
            </View>
          ) : null}
          <Text style={styles.serviceName} numberOfLines={2}>
            {appointment.service}
          </Text>
          <SessionTimer
            startedAt={sessionStart}
            endedAt={booking.sessionEndedAt}
            live={!assumedFinished}
            hero
          />
          {isPaid ? (
            <Text style={styles.paidHint}>Payment collected</Text>
          ) : (
            <Text style={styles.dueHint}>
              {maskMoney(`$${balanceDue.toFixed(2)}`, privacyMode)} due — collect at checkout
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.finishBtn} onPress={() => setShowFinishFlow(true)}>
            <Text style={styles.finishBtnText}>Finish appointment</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <FinishAppointmentFlow
        visible={showFinishFlow}
        onClose={() => setShowFinishFlow(false)}
        onComplete={() => {
          setShowFinishFlow(false);
          navigation.popToTop();
        }}
        appointmentId={appointmentId}
        clientName={appointment.clientName}
        booking={booking}
        linkedSite={linkedSite}
        subdomain={subdomain}
        stripeReady={stripeReady}
        platformFeePayer={platformFeePayer}
        onRefresh={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  errorText: { color: colors.text, fontSize: 16, padding: 24, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  overlayStack: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  overlayCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  overlayTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  overlayBody: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  overlayCta: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 220,
  },
  assumedBanner: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    marginBottom: 4,
  },
  assumedBannerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  assumedBannerBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  serviceName: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  paidHint: { color: '#15803d', fontSize: 14, fontWeight: '600' },
  dueHint: { color: colors.textMuted, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  finishBtn: {
    backgroundColor: colors.text,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  finishBtnText: { color: colors.background, fontSize: 17, fontWeight: '700' },
});
