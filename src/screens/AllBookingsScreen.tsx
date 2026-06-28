import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import ServiceImage from '../components/ServiceImage';
import { useSiteData } from '../context/SiteDataContext';
import { usePrivacyMode } from '../context/PrivacyContext';
import { DashboardStackParamList } from '../navigation/DashboardNavigator';
import { getCalendarEventColors } from '../lib/styleEventColors';
import { flatListStyles } from '../theme/flatList';
import { colors, fonts } from '../theme';
import { maskMoney } from '../utils/money';

type Props = NativeStackScreenProps<DashboardStackParamList, 'AllBookings'>;

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function bookingStatusLabel(status: string, depositPaid: boolean): string {
  if (status === 'in_progress') return 'In session';
  if (status === 'pending_approval') return 'Pending approval';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'cancelled' || status === 'canceled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  if (depositPaid) return 'Deposit paid';
  if (status === 'pending_payment') return 'Awaiting payment';
  return 'Pending';
}

function bookingStatusColor(status: string, depositPaid: boolean): string {
  if (status === 'in_progress') return colors.accentPink;
  if (status === 'pending_approval') return '#f59e0b';
  if (status === 'completed') return '#15803d';
  if (status === 'cancelled' || status === 'canceled') return '#dc2626';
  if (depositPaid || status === 'confirmed') return colors.accentPink;
  return colors.textMuted;
}

export default function AllBookingsScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { bookings } = useSiteData();
  const { privacyMode } = usePrivacyMode();

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [bookings],
  );

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>All bookings</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={28} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>No bookings yet.</Text>
            </View>
          ) : (
            <View style={styles.listGroup}>
              {sorted.map((booking, index) => {
                const statusLabel = bookingStatusLabel(booking.bookingStatus, booking.depositPaid);
                const statusColor = bookingStatusColor(booking.bookingStatus, booking.depositPaid);
                const eventColors = getCalendarEventColors({
                  styleId: booking.styleId,
                  title: booking.service,
                  completed: booking.bookingStatus.toLowerCase() === 'completed',
                });
                const apptDateStr = booking.startsAt
                  ? booking.startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                    ' · ' +
                    booking.startsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : timeAgo(booking.createdAt);

                return (
                  <Pressable
                    key={booking.id}
                    style={[
                      styles.row,
                      { borderLeftColor: eventColors.borderColor },
                      index === sorted.length - 1 && styles.rowLast,
                    ]}
                    onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
                  >
                    <ServiceImage
                      styleId={booking.styleId}
                      serviceName={booking.service}
                      size={44}
                      circular
                    />
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={1}>{booking.fullName}</Text>
                      <Text style={styles.service} numberOfLines={1}>{booking.service}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        <Text style={{ color: statusColor }}>{statusLabel}</Text>
                        {' · '}
                        {apptDateStr}
                        {booking.depositPaid ? ' · Deposit paid' : ''}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={styles.amount}>
                        {maskMoney(`$${booking.price.toFixed(2)}`, privacyMode)}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  listGroup: flatListStyles.listGroup,
  row: flatListStyles.row,
  rowLast: flatListStyles.rowLast,
  info: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  service: { color: colors.textMuted, fontSize: 12, fontWeight: '500', marginBottom: 2 },
  meta: flatListStyles.metaText,
  right: { alignItems: 'flex-end', gap: 4 },
  amount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.number,
    letterSpacing: -0.3,
  },
};
