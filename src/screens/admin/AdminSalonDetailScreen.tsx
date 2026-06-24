import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  AdminBody,
  AdminChrome,
  AdminDetailRow,
  AdminEmpty,
  AdminHeader,
  AdminIconButton,
  AdminListCard,
  AdminLoading,
  AdminSection,
  AdminShell,
  AdminTabBar,
  adminInitials,
  bookingStatusTone,
} from '../../components/admin/AdminUi';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { callAdminDashboard, formatDate, formatMoney } from '../../lib/adminDashboard';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminSalonDetail'>;

type DetailTab = 'business' | 'bookings' | 'clients' | 'reviews' | 'analytics';

const DETAIL_TABS: { id: DetailTab; label: string; icon: 'briefcase-outline' | 'calendar-outline' | 'people-outline' | 'star-outline' | 'analytics-outline' }[] = [
  { id: 'business', label: 'Business', icon: 'briefcase-outline' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { id: 'clients', label: 'Clients', icon: 'people-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
];

export default function AdminSalonDetailScreen({ navigation, route }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { userId } = route.params;
  const [tab, setTab] = useState<DetailTab>('business');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callAdminDashboard<Record<string, unknown>>('user_detail', { user_id: userId });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const theme = (data?.site_theme_summary ?? {}) as Record<string, unknown>;
  const content = (data?.site_content_summary ?? {}) as Record<string, unknown>;
  const payment = (data?.booking_payment ?? {}) as Record<string, unknown>;
  const hours = (data?.booking_hours ?? {}) as Record<string, unknown>;
  const revenue = (data?.revenue_summary ?? {}) as Record<string, unknown>;
  const subscription = (data?.subscription ?? {}) as Record<string, unknown>;
  const stylesCatalog = (data?.style_catalog ?? []) as Record<string, unknown>[];
  const bookings = (data?.bookings ?? []) as Record<string, unknown>[];
  const clients = (data?.clients ?? []) as Record<string, unknown>[];
  const reviews = (data?.reviews ?? []) as Record<string, unknown>[];
  const analytics = (data?.analytics ?? {}) as Record<string, unknown>;
  const brandName = String(data?.brand_name ?? 'Salon');

  return (
    <AdminShell>
      <AdminChrome>
        <AdminHeader
          title={brandName}
          subtitle={data?.subdomain ? `${data.subdomain}.styldd.com` : 'Salon detail'}
          onBack={() => navigation.goBack()}
          actions={<AdminIconButton icon="refresh-outline" onPress={() => void load()} />}
        />

        <AdminTabBar tabs={DETAIL_TABS} active={tab} onChange={setTab} />
      </AdminChrome>

      <AdminBody>
        {loading ? (
          <AdminLoading />
        ) : !data ? (
          <AdminEmpty icon="storefront-outline" title="Could not load salon" subtitle="Check your connection and try again." />
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'business' ? (
            <>
              <AdminSection title="Account" icon="person-outline">
                <AdminDetailRow label="Subdomain" value={data.subdomain ? `${data.subdomain}.styldd.com` : '—'} />
                <AdminDetailRow label="Published" value={data.published_at ? formatDate(String(data.published_at)) : 'Draft'} />
                <AdminDetailRow label="Subscription" value={String(subscription.plan_label ?? subscription.status ?? '—')} />
              </AdminSection>

              <AdminSection title="Revenue" icon="cash-outline">
                <AdminDetailRow label="Gross" value={formatMoney(Number(revenue.gross))} />
                <AdminDetailRow label="Collected" value={formatMoney(Number(revenue.collected))} />
                <AdminDetailRow label="Bookings" value={String(revenue.booking_count ?? 0)} />
                <AdminDetailRow label="Unique clients" value={String(revenue.unique_clients ?? 0)} />
              </AdminSection>

              <AdminSection title="Site design" icon="color-palette-outline">
                <AdminDetailRow label="Hero layout" value={String(theme.hero_layout_label ?? theme.hero_layout ?? '—')} />
                <AdminDetailRow label="Stack format" value={String(theme.hero_stack_format ?? 'wide')} />
                <AdminDetailRow label="Stack images" value={String(theme.hero_stack_image_count ?? 0)} />
                <AdminDetailRow label="Cover blur" value={theme.hero_cover_blur ? 'Yes' : 'No'} />
                <AdminDetailRow label="Font" value={String(theme.font_family ?? '—')} />
                <AdminDetailRow label="Primary" value={String(theme.primary_color ?? '—')} />
                <AdminDetailRow label="Book Now hidden" value={theme.hide_book_now_button ? 'Yes' : 'No'} />
              </AdminSection>

              <AdminSection title="Site content" icon="document-text-outline">
                <AdminDetailRow label="About" value={content.has_about ? 'Yes' : 'No'} />
                <AdminDetailRow label="Policies" value={content.has_policies ? 'Yes' : 'No'} />
                <AdminDetailRow
                  label="Hidden sections"
                  value={Array.isArray(content.hidden_sections) ? content.hidden_sections.join(', ') || 'None' : 'None'}
                />
              </AdminSection>

              <AdminSection title="Booking settings" icon="settings-outline">
                <AdminDetailRow label="Payment mode" value={String(payment.mode ?? '—')} />
                <AdminDetailRow label="Deposit" value={`${payment.depositKind ?? '—'} ${payment.depositValue ?? ''}`} />
                <AdminDetailRow label="Hair photo required" value={payment.requireCurrentHairPhoto === false ? 'No' : 'Yes'} />
                <AdminDetailRow label="Capacity" value="One at a time" />
                <AdminDetailRow label="Lead time" value={`${hours.sameDayLeadMinutes ?? '—'} min`} />
              </AdminSection>

              <AdminSection title={`Style menu (${data.style_count ?? 0} services · ${data.addon_count ?? 0} add-ons)`} icon="cut-outline">
                {stylesCatalog.map((s) => (
                  <View key={String(s.id)} style={styles.styleCard}>
                    <Text style={styles.styleTitle}>{String(s.title)} · {String(s.price_label)}</Text>
                    <Text style={styles.styleMeta}>{String(s.duration_minutes)} min · {String(s.category)}</Text>
                    {Array.isArray(s.addons) && s.addons.length > 0 ? (
                      (s.addons as { name: string; price: number }[]).map((a) => (
                        <Text key={a.name} style={styles.addon}>+ {a.name} · ${a.price}</Text>
                      ))
                    ) : (
                      <Text style={styles.addon}>No add-ons</Text>
                    )}
                  </View>
                ))}
              </AdminSection>
            </>
          ) : null}

          {tab === 'bookings'
            ? bookings.length === 0
              ? <AdminEmpty icon="calendar-outline" title="No bookings for this salon" />
              : bookings.map((b) => (
                  <AdminListCard
                    key={String(b.row_id ?? b.id)}
                    title={`${b.full_name} · ${b.style_name}`}
                    initials={adminInitials(String(b.full_name ?? 'C'))}
                    badges={[
                      { label: String(b.booking_status ?? '—'), tone: bookingStatusTone(String(b.booking_status)) },
                    ]}
                    meta={`${formatDate(String(b.appointment_starts_at))} · ${formatMoney(Number(b.estimated_total))}`}
                    onPress={() => navigation.navigate('AdminBookingDetail', { bookingId: String(b.row_id ?? b.id) })}
                  />
                ))
            : null}

          {tab === 'clients'
            ? clients.length === 0
              ? <AdminEmpty icon="people-outline" title="No clients yet" />
              : clients.slice(0, 50).map((c, i) => (
                  <AdminListCard
                    key={`${c.email}-${i}`}
                    title={String(c.client_name)}
                    subtitle={String(c.email ?? c.phone)}
                    initials={adminInitials(String(c.client_name))}
                    meta={`${c.booking_count} visits · ${formatMoney(Number(c.total_spend ?? c.collected_spend))}`}
                  />
                ))
            : null}

          {tab === 'reviews'
            ? reviews.length === 0
              ? <AdminEmpty icon="star-outline" title="No reviews yet" />
              : reviews.map((r) => {
                  const d = (r.data ?? r) as Record<string, unknown>;
                  return (
                    <AdminListCard
                      key={String(r.id)}
                      title={String(d.client_name ?? 'Client')}
                      subtitle={String(d.review_text ?? d.comment ?? '')}
                      badges={[{ label: `${'★'.repeat(Number(d.rating ?? 0))}`, tone: 'warn' }]}
                      meta={formatDate(String(r.created_at))}
                    />
                  );
                })
            : null}

          {tab === 'analytics' ? (
            <AdminSection title="Traffic" icon="analytics-outline">
              <AdminDetailRow label="Views 7d" value={String(analytics.views_7d ?? 0)} />
              <AdminDetailRow label="Views 30d" value={String(analytics.views_30d ?? 0)} />
              <AdminDetailRow label="Views 90d" value={String(analytics.views_90d ?? 0)} />
              <AdminDetailRow label="Source" value={String(analytics.source ?? '—')} />
            </AdminSection>
          ) : null}
          </ScrollView>
        )}
      </AdminBody>
    </AdminShell>
  );
}

const BASE_STYLES = {
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  styleCard: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
    marginTop: 6,
  },
  styleTitle: { color: colors.text, fontSize: 14, fontWeight: '700' as const },
  styleMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addon: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginLeft: 4 },
};
