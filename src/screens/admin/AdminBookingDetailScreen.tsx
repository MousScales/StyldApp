import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  AdminDetailRow,
  AdminEmpty,
  AdminHeader,
  AdminLoading,
  AdminSection,
  AdminShell,
  adminInitials,
} from '../../components/admin/AdminUi';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { callAdminDashboard, formatDate, formatMoney } from '../../lib/adminDashboard';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminBookingDetail'>;

export default function AdminBookingDetailScreen({ navigation, route }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { bookingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callAdminDashboard<Record<string, unknown>>('booking_detail', { booking_id: bookingId });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const booking = (data?.booking ?? {}) as Record<string, unknown>;
  const salon = (data?.salon ?? {}) as Record<string, unknown>;
  const clientName = String(booking.full_name ?? 'Booking');

  return (
    <AdminShell>
      <AdminHeader
        title={clientName}
        subtitle={String(booking.style_name ?? 'Appointment detail')}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <AdminLoading />
      ) : !data ? (
        <AdminEmpty icon="calendar-outline" title="Booking not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{adminInitials(clientName)}</Text>
            </View>
            <Text style={styles.heroTitle}>{clientName}</Text>
            <Text style={styles.heroSub}>{formatDate(String(booking.appointment_starts_at ?? booking.created_at))}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{String(booking.booking_status ?? '—')}</Text>
              </View>
              <View style={[styles.heroBadge, styles.heroBadgePayment]}>
                <Text style={styles.heroBadgeText}>{String(booking.payment_status ?? '—')}</Text>
              </View>
            </View>
            <Text style={styles.heroTotal}>{formatMoney(Number(booking.estimated_total))}</Text>
          </View>

          <AdminSection title="Client" icon="person-outline">
            <AdminDetailRow label="Name" value={String(booking.full_name ?? '—')} />
            <AdminDetailRow label="Email" value={String(booking.email ?? '—')} />
            <AdminDetailRow label="Phone" value={String(booking.phone ?? '—')} />
          </AdminSection>

          <AdminSection title="Appointment" icon="calendar-outline">
            <AdminDetailRow label="When" value={formatDate(String(booking.appointment_starts_at ?? booking.created_at))} />
            <AdminDetailRow label="Duration" value={`${booking.duration_minutes ?? '—'} min`} />
            <AdminDetailRow label="Status" value={String(booking.booking_status ?? '—')} />
            <AdminDetailRow label="Address" value={String(booking.service_address ?? '—')} />
          </AdminSection>

          <AdminSection title="Service & add-ons" icon="cut-outline">
            <AdminDetailRow label="Service" value={String(booking.style_name ?? '—')} />
            <AdminDetailRow label="Base price" value={formatMoney(Number(booking.service_base_price))} />
            <AdminDetailRow
              label="Add-on"
              value={
                booking.selected_addon_name
                  ? `${booking.selected_addon_name} (${formatMoney(Number(booking.selected_addon_price))})`
                  : 'None'
              }
            />
            <AdminDetailRow label="Total" value={formatMoney(Number(booking.estimated_total))} />
          </AdminSection>

          <AdminSection title="Payment" icon="card-outline">
            <AdminDetailRow label="Payment status" value={String(booking.payment_status ?? '—')} />
            <AdminDetailRow label="Deposit" value={formatMoney(Number(booking.deposit_amount))} />
            <AdminDetailRow label="Stripe PI" value={String(booking.stripe_payment_intent_id ?? '—')} />
            <AdminDetailRow label="Refund" value={String(booking.refund_status ?? '—')} />
          </AdminSection>

          <AdminSection title="Salon" icon="storefront-outline">
            <AdminDetailRow label="Brand" value={String(salon.brand_name ?? booking.brand_name ?? '—')} />
            <AdminDetailRow label="Site" value={salon.public_url ? String(salon.public_url) : '—'} />
            {salon.user_id ? (
              <Pressable
                style={styles.linkBtn}
                onPress={() => navigation.navigate('AdminSalonDetail', { userId: String(salon.user_id) })}
              >
                <Text style={styles.linkBtnText}>Open salon detail →</Text>
              </Pressable>
            ) : null}
          </AdminSection>

          {booking.notes ? (
            <AdminSection title="Notes" icon="document-text-outline">
              <Text style={styles.notes}>{String(booking.notes)}</Text>
            </AdminSection>
          ) : null}
        </ScrollView>
      )}
    </AdminShell>
  );
}

const BASE_STYLES = {
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  heroCard: {
    alignItems: 'center' as const,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
    marginBottom: 4,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    marginBottom: 10,
  },
  heroAvatarText: { color: colors.accentPink, fontSize: 18, fontWeight: '800' as const },
  heroTitle: { color: colors.text, fontSize: 20, fontWeight: '800' as const },
  heroSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  heroBadges: { flexDirection: 'row' as const, gap: 8, marginTop: 12 },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(47, 107, 79, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(47, 107, 79, 0.35)',
  },
  heroBadgePayment: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  },
  heroBadgeText: { color: colors.text, fontSize: 11, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  heroTotal: { color: colors.text, fontSize: 28, fontWeight: '800' as const, marginTop: 14, letterSpacing: -0.5 },
  notes: { color: colors.text, fontSize: 14, lineHeight: 21 },
  linkBtn: { marginTop: 4, alignSelf: 'flex-start' as const },
  linkBtnText: { color: colors.accentPink, fontSize: 14, fontWeight: '700' as const },
};
