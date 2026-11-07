import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import ServiceImage from '../components/ServiceImage';
import ClientAvatar from '../components/clients/ClientAvatar';
import { Booking, getClientEmails, getClientPhones } from '../data/clients';
import { useSiteData } from '../context/SiteDataContext';
import { usePrivacyMode } from '../context/PrivacyContext';
import { ClientStackParamList } from '../navigation/ClientNavigator';
import { getCalendarEventColors } from '../lib/styleEventColors';
import { flatListStyles } from '../theme/flatList';
import { colors, fonts } from '../theme';
import { maskMoney } from '../utils/money';

type Props = NativeStackScreenProps<ClientStackParamList, 'ClientDetail'>;

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: Booking['status']): string {
  if (status === 'completed') return '#22c55e';
  if (status === 'cancelled') return '#ef4444';
  if (status === 'pending') return '#f59e0b';
  if (status === 'in_progress') return colors.accentPink;
  return colors.accentPink;
}

function statusLabel(status: Booking['status'], bookingStatus?: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'pending') return 'Pending approval';
  if (status === 'in_progress') return 'In session';
  if (bookingStatus === 'confirmed') return 'Confirmed';
  if (bookingStatus === 'pending_payment') return 'Awaiting payment';
  return 'Upcoming';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <Ionicons name={icon as any} size={16} color={colors.textMuted} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
  disabled,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
  isLast?: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Pressable
      style={[styles.detailRow, disabled && styles.contactRowDisabled, isLast && styles.detailRowLast]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon as any} size={18} color={disabled ? colors.textMuted : colors.textMuted} />
      <View style={styles.contactText}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={[styles.contactValue, !disabled && styles.contactValueActive]} numberOfLines={1}>
          {value || '—'}
        </Text>
      </View>
      {!disabled ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return <Text style={styles.sectionTitle}>{title}</Text>;
}

type HistoryFilter = 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled';

const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function HistoryFilterBar({
  active,
  onChange,
}: {
  active: HistoryFilter;
  onChange: (f: HistoryFilter) => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.filterBar}>
      {HISTORY_FILTERS.map((f) => (
        <Pressable
          key={f.id}
          style={[styles.filterPill, active === f.id && styles.filterPillActive]}
          onPress={() => onChange(f.id)}
        >
          <Text style={[styles.filterPillText, active === f.id && styles.filterPillTextActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function ClientDetailScreen({ navigation, route }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { getClientById } = useSiteData();
  const client = getClientById(route.params.clientId);
  const { privacyMode } = usePrivacyMode();
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  if (!client) {
    return (
      <View style={styles.container}>
        <ScreenGradient />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Client not found.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const averageSpend =
    client.totalBookings > 0 ? Math.round(client.totalSpent / client.totalBookings) : 0;

  const emails = getClientEmails(client);
  const phones = getClientPhones(client);

  const handleEmail = (email: string) => Linking.openURL(`mailto:${email}`);
  const handleCall = (phone: string) => Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);

  const openBooking = (bookingId: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Dashboard',
        params: {
          screen: 'AppointmentDetail',
          params: { appointmentId: bookingId },
        },
      }),
    );
  };

  const statRows = [
    { icon: 'calendar-outline', label: 'Bookings', value: String(client.totalBookings) },
    { icon: 'cash-outline', label: 'Total spent', value: maskMoney(client.totalSpent, privacyMode) },
    { icon: 'trending-up-outline', label: 'Avg. spend', value: maskMoney(averageSpend, privacyMode) },
    { icon: 'time-outline', label: 'Client since', value: client.memberSince },
    ...(client.avgSessionMinutes > 0
      ? [{ icon: 'hourglass-outline', label: 'Avg. session', value: `${client.avgSessionMinutes} min` }]
      : []),
    ...(client.totalTips > 0
      ? [{ icon: 'heart-outline', label: 'Total tips', value: maskMoney(client.totalTips, privacyMode) }]
      : []),
  ];

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          {/* ── Hero ───────────────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <ClientAvatar
              name={client.name}
              photoHairPath={client.photoHairPath}
              storageBookingId={client.photoStorageBookingId}
              size={72}
              style={styles.heroAvatar}
            />
            <Text style={styles.heroName}>{client.name}</Text>
            <Text style={styles.heroSub}>
              {client.totalBookings} booking{client.totalBookings === 1 ? '' : 's'}
              {client.hairTypes.length > 0 ? ` · ${client.hairTypes[0]}` : ''}
            </Text>
          </View>

          {/* ── Stats ──────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionHeader title="Overview" />
            <View style={styles.listGroup}>
              {statRows.map((row, index) => (
                <StatRow
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  isLast={index === statRows.length - 1}
                />
              ))}
            </View>
          </View>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionHeader title="Contact" />
            <View style={styles.listGroup}>
              {emails.length ? (
                emails.map((email, index) => (
                  <ContactRow
                    key={`email-${email}`}
                    icon="mail-outline"
                    label={emails.length > 1 ? `Email ${index + 1}` : 'Email'}
                    value={email}
                    onPress={() => handleEmail(email)}
                    isLast={!phones.length && index === emails.length - 1}
                  />
                ))
              ) : (
                <ContactRow
                  icon="mail-outline"
                  label="Email"
                  value="—"
                  disabled
                  isLast={!phones.length}
                />
              )}
              {phones.length ? (
                phones.map((phone, index) => (
                  <ContactRow
                    key={`phone-${phone}`}
                    icon="call-outline"
                    label={phones.length > 1 ? `Phone ${index + 1}` : 'Phone'}
                    value={phone}
                    onPress={() => handleCall(phone)}
                    isLast={index === phones.length - 1}
                  />
                ))
              ) : (
                <ContactRow icon="call-outline" label="Phone" value="—" disabled isLast />
              )}
            </View>
          </View>

          {/* ── Favorite services ──────────────────────────────────────── */}
          {client.favoriteOrders.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Favorite services" />
              <View style={styles.listGroup}>
                {client.favoriteOrders.map((order, i) => (
                  <View
                    key={order.service}
                    style={[styles.favRow, i === client.favoriteOrders.length - 1 && styles.detailRowLast]}
                  >
                    <ServiceImage
                      styleId={order.styleId}
                      serviceName={order.service}
                      size={36}
                      circular
                      style={styles.favServiceImage}
                    />
                    <Text style={styles.favService} numberOfLines={1}>{order.service}</Text>
                    <Text style={styles.favCount}>×{order.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Hair profile ───────────────────────────────────────────── */}
          {client.hairTypes.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Hair profile" />
              <View style={styles.listGroup}>
                <View style={[styles.detailRow, styles.detailRowLast]}>
                  <Ionicons name="cut-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.hairProfileText}>{client.hairTypes.join(' · ')}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Booking history ────────────────────────────────────────── */}
          {client.pastBookings.length > 0 ? (() => {
            const filtered = historyFilter === 'all'
              ? client.pastBookings
              : client.pastBookings.filter((b) => {
                  if (historyFilter === 'cancelled') return b.status === 'cancelled';
                  if (historyFilter === 'pending') return b.status === 'pending';
                  if (historyFilter === 'upcoming') {
                    return b.status === 'upcoming' || b.status === 'in_progress';
                  }
                  return b.status === historyFilter;
                });

            return (
              <View style={styles.section}>
                <SectionHeader title="Booking history" />
                <HistoryFilterBar active={historyFilter} onChange={setHistoryFilter} />
                {filtered.length === 0 ? (
                  <View style={styles.emptyFilter}>
                    <Text style={styles.emptyFilterText}>No {historyFilter} bookings</Text>
                  </View>
                ) : (
                  <View style={styles.listGroup}>
                    {filtered.map((booking, index) => {
                      const sColor = statusColor(booking.status);
                      const eventColors = getCalendarEventColors({
                        styleId: booking.styleId,
                        title: booking.service,
                        completed: booking.status === 'completed',
                      });
                      const timeLabel = booking.time?.split(' – ')[0] ?? '';
                      const metaParts = [
                        formatDate(booking.date),
                        timeLabel,
                        booking.hairType && booking.hairType !== '—' ? booking.hairType : '',
                        booking.productCount ? `${booking.productCount} product${booking.productCount === 1 ? '' : 's'}` : '',
                      ].filter(Boolean);

                      return (
                        <Pressable
                          key={booking.id}
                          style={[
                            styles.historyRow,
                            { borderLeftColor: eventColors.borderColor },
                            index === filtered.length - 1 && styles.rowLast,
                          ]}
                          onPress={() => openBooking(booking.id)}
                        >
                          <ServiceImage
                            styleId={booking.styleId}
                            serviceName={booking.service}
                            size={44}
                            circular
                          />
                          <View style={styles.historyInfo}>
                            <Text style={styles.historyService} numberOfLines={1}>
                              {booking.service}
                            </Text>
                            <Text style={styles.historyMeta} numberOfLines={2}>
                              <Text style={{ color: sColor }}>{statusLabel(booking.status, booking.bookingStatus)}</Text>
                              {' · '}
                              {metaParts.join(' · ')}
                            </Text>
                          </View>
                          <View style={styles.historyRight}>
                            <Text style={styles.historyAmount}>
                              {maskMoney(booking.amount, privacyMode)}
                            </Text>
                            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })() : null}

          {/* ── Notes ─────────────────────────────────────────────────── */}
          {client.notes ? (
            <View style={styles.section}>
              <SectionHeader title="Notes" />
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const BASE_STYLES = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    marginTop: 2,
    marginBottom: 8,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 20,
  },
  heroAvatar: {
    marginBottom: 12,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },

  section: flatListStyles.section,
  sectionTitle: flatListStyles.sectionTitle,
  listGroup: flatListStyles.listGroup,
  detailRow: flatListStyles.detailRow,
  detailRowLast: flatListStyles.detailRowLast,
  rowLast: flatListStyles.rowLast,

  statLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.number,
    color: colors.text,
    letterSpacing: -0.2,
  },

  contactRowDisabled: {
    opacity: 0.5,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  contactValueActive: {
    color: colors.accentPink,
  },

  favRow: {
    ...flatListStyles.detailRow,
    paddingVertical: 12,
  },
  favServiceImage: {
    borderRadius: 10,
  },
  favService: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  favCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fonts.number,
  },

  hairProfileText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },

  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.calendarGridLine,
  },
  filterPillActive: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.accentPink,
  },
  emptyFilter: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyFilterText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  historyRow: flatListStyles.row,
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyService: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  historyMeta: flatListStyles.metaText,
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.number,
    letterSpacing: -0.3,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },

  notesText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    paddingLeft: 10,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
};
