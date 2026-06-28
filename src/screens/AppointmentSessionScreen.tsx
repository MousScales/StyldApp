import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
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
import { getBalanceDue } from '../lib/siteData';
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

  const [stripeReady, setStripeReady] = useState(false);
  const [showFinishFlow, setShowFinishFlow] = useState(false);

  useEffect(() => {
    void fetchStripeConnectStatus()
      .then((s) => setStripeReady(s.status === 'ready' || s.status === 'pending_review'))
      .catch(() => setStripeReady(false));
  }, []);

  useEffect(() => {
    if (!booking) return;
    if (booking.bookingStatus.toLowerCase() !== 'in_progress') {
      navigation.replace('AppointmentDetail', { appointmentId });
    }
  }, [appointmentId, booking, navigation]);

  const balanceDue = booking ? getBalanceDue(booking) : 0;
  const isPaid = !booking || balanceDue <= 0 || booking.paymentStatus.toLowerCase() === 'paid';
  const subdomain = sitePublish.subdomain ?? '';

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

        <View style={styles.hero}>
          <Text style={styles.serviceName} numberOfLines={2}>
            {appointment.service}
          </Text>
          <SessionTimer
            startedAt={booking.sessionStartedAt}
            endedAt={booking.sessionEndedAt}
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
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 220,
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
