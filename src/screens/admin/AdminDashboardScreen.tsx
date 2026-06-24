import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  AdminBody,
  AdminChrome,
  AdminEmpty,
  AdminError,
  AdminHeader,
  AdminHeroStat,
  AdminIconButton,
  AdminListCard,
  AdminLoading,
  AdminNote,
  AdminRevenueBanner,
  AdminSearchField,
  AdminSectionTitle,
  AdminShell,
  AdminStatTile,
  AdminTabBar,
  adminInitials,
  bookingStatusTone,
} from '../../components/admin/AdminUi';
import {
  AdminAction,
  callAdminDashboard,
  formatDate,
  formatMoney,
} from '../../lib/adminDashboard';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

const TABS: { id: AdminAction; label: string; icon: 'grid-outline' | 'cash-outline' | 'storefront-outline' | 'calendar-outline' | 'people-outline' | 'close-circle-outline' | 'chatbubble-ellipses-outline' | 'star-outline' | 'rocket-outline' | 'bar-chart-outline' }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'styld_revenue', label: 'Revenue', icon: 'cash-outline' },
  { id: 'users', label: 'Salons', icon: 'storefront-outline' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { id: 'clients', label: 'Clients', icon: 'people-outline' },
  { id: 'cancellations', label: 'Cancels', icon: 'close-circle-outline' },
  { id: 'inquiries', label: 'Inquiries', icon: 'chatbubble-ellipses-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'onboarding', label: 'Onboarding', icon: 'rocket-outline' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
];

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { signOut, user } = useAuth();
  const [tab, setTab] = useState<AdminAction>('overview');
  const [search, setSearch] = useState('');
  const [hideMoney, setHideMoney] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (['users', 'bookings', 'clients', 'inquiries'].includes(tab) && search.trim()) {
        filters.search = search.trim().toLowerCase();
      }
      const result = await callAdminDashboard<Record<string, unknown>>(tab, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const content = useMemo(() => {
    if (!data) return null;

    if (tab === 'overview') {
      const payments = (data.payments ?? {}) as Record<string, number>;
      return (
        <>
          <View style={styles.heroRow}>
            <AdminHeroStat
              icon="storefront-outline"
              label="Active salons"
              value={String(data.total_stylists ?? 0)}
            />
            <AdminHeroStat
              icon="globe-outline"
              label="Live sites"
              value={String(data.published_sites ?? 0)}
              accent="#60a5fa"
            />
          </View>
          <View style={styles.heroRow}>
            <AdminHeroStat
              icon="calendar-outline"
              label="Total bookings"
              value={String(data.total_bookings ?? 0)}
              accent={colors.accentGold}
            />
            <AdminHeroStat
              icon="people-outline"
              label="Global clients"
              value={String(data.unique_clients_global ?? 0)}
              accent="#a78bfa"
            />
          </View>
          <AdminRevenueBanner
            label="Platform collected"
            value={formatMoney(payments.collected, hideMoney)}
            note={`Gross ${formatMoney(payments.gross, hideMoney)} · ${data.stripe_merchants_live ?? 0} Stripe live merchants`}
          />
          <View style={styles.tileGrid}>
            <AdminStatTile label="Inquiries" value={String(data.total_inquiries ?? 0)} />
            <AdminStatTile label="Reviews" value={String(data.total_reviews ?? 0)} tone="success" />
            <AdminStatTile label="Gross volume" value={formatMoney(payments.gross, hideMoney)} tone="money" />
          </View>
        </>
      );
    }

    if (tab === 'styld_revenue') {
      const subs = (data.subscriptions ?? {}) as Record<string, number>;
      const combined = (data.combined ?? {}) as Record<string, unknown>;
      return (
        <>
          <AdminRevenueBanner
            label="Estimated MRR"
            value={formatMoney(num(combined.estimated_subscription_mrr), hideMoney)}
            note={String(combined.note ?? data.pricing_note ?? '')}
          />
          <View style={styles.tileGrid}>
            <AdminStatTile label="Active subs" value={String(subs.active ?? 0)} tone="success" />
            <AdminStatTile label="Free tier" value={String(subs.free ?? 0)} />
            <AdminStatTile label="Expired" value={String(subs.expired ?? 0)} tone="warn" />
          </View>
        </>
      );
    }

    if (tab === 'users') {
      const users = (data.users ?? []) as Record<string, unknown>[];
      if (users.length === 0) {
        return <AdminEmpty icon="storefront-outline" title="No salons yet" subtitle="Salons will appear here once stylists sign up." />;
      }
      return users.map((u) => {
        const sub = u.subscription as { plan_label?: string } | undefined;
        const brand = String(u.brand_name ?? u.email ?? 'Salon');
        return (
          <AdminListCard
            key={String(u.user_id)}
            title={brand}
            subtitle={String(u.email ?? '')}
            initials={adminInitials(brand)}
            badges={[
              { label: sub?.plan_label ?? 'No plan', tone: 'accent' },
              ...(u.subdomain ? [{ label: `${u.subdomain}.styldd.com`, tone: 'neutral' as const }] : []),
            ]}
            meta={`${u.hero_layout_label ?? u.hero_layout} · ${u.style_count ?? 0} services · ${formatMoney(Number(u.revenue_collected), hideMoney)} collected`}
            onPress={() => navigation.navigate('AdminSalonDetail', { userId: String(u.user_id) })}
          />
        );
      });
    }

    if (tab === 'bookings') {
      const bookings = (data.bookings ?? []) as Record<string, unknown>[];
      if (bookings.length === 0) {
        return <AdminEmpty icon="calendar-outline" title="No bookings" subtitle="Bookings across all salons will show up here." />;
      }
      return bookings.map((b) => (
        <AdminListCard
          key={String(b.row_id ?? b.id)}
          title={`${b.full_name ?? 'Client'} · ${b.style_name ?? 'Service'}`}
          subtitle={`${b.brand_name ?? ''}${b.selected_addon_name ? ` + ${b.selected_addon_name}` : ''}`.trim()}
          initials={adminInitials(String(b.full_name ?? 'C'))}
          badges={[
            { label: String(b.booking_status ?? '—'), tone: bookingStatusTone(String(b.booking_status)) },
            { label: String(b.payment_status ?? '—'), tone: bookingStatusTone(String(b.payment_status)) },
          ]}
          meta={`${formatDate(String(b.appointment_starts_at ?? b.created_at))} · ${formatMoney(Number(b.estimated_total), hideMoney)}`}
          onPress={() => navigation.navigate('AdminBookingDetail', { bookingId: String(b.row_id ?? b.id) })}
        />
      ));
    }

    if (tab === 'clients') {
      const clients = (data.clients ?? []) as Record<string, unknown>[];
      if (clients.length === 0) {
        return <AdminEmpty icon="people-outline" title="No clients yet" />;
      }
      return clients.map((c, i) => (
        <AdminListCard
          key={`${c.user_id}-${c.email}-${i}`}
          title={String(c.client_name ?? 'Client')}
          subtitle={String(c.email ?? c.phone ?? '')}
          initials={adminInitials(String(c.client_name ?? 'Client'))}
          meta={`${c.brand_name ?? ''} · ${c.booking_count ?? 0} visits · ${formatMoney(Number(c.total_spend ?? c.collected_spend), hideMoney)}`}
        />
      ));
    }

    if (tab === 'inquiries') {
      const inquiries = (data.inquiries ?? []) as Record<string, unknown>[];
      if (inquiries.length === 0) {
        return <AdminEmpty icon="chatbubble-ellipses-outline" title="No inquiries" />;
      }
      return inquiries.map((q) => (
        <AdminListCard
          key={String(q.id)}
          title={String(q.full_name ?? 'Inquiry')}
          subtitle={String(q.message ?? '')}
          initials={adminInitials(String(q.full_name ?? 'Inquiry'))}
          meta={`${q.brand_name ?? ''} · ${formatDate(String(q.created_at))}`}
        />
      ));
    }

    if (tab === 'reviews') {
      const reviews = (data.reviews ?? []) as Record<string, unknown>[];
      if (reviews.length === 0) {
        return <AdminEmpty icon="star-outline" title="No reviews yet" />;
      }
      return reviews.map((r) => (
        <AdminListCard
          key={String(r.id)}
          title={String(r.client_name ?? 'Client')}
          subtitle={String(r.review_text ?? '')}
          badges={[{ label: `${'★'.repeat(Number(r.rating ?? 0))}`, tone: 'warn' }]}
          meta={`${r.brand_name ?? ''} · ${formatDate(String(r.created_at))}`}
        />
      ));
    }

    if (tab === 'cancellations') {
      const rows = (data.cancellations ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        return <AdminEmpty icon="close-circle-outline" title="No cancellations" />;
      }
      return rows.map((c) => (
        <AdminListCard
          key={String(c.id ?? c.booking_id)}
          title={`Cancelled · ${c.brand_name ?? 'Salon'}`}
          subtitle={String(c.cancelled_by ?? 'unknown')}
          badges={[{ label: String(c.refund_status ?? '—'), tone: bookingStatusTone(String(c.refund_status)) }]}
          meta={formatDate(String(c.created_at))}
          onPress={c.booking_id ? () => navigation.navigate('AdminBookingDetail', { bookingId: String(c.booking_id) }) : undefined}
        />
      ));
    }

    if (tab === 'onboarding') {
      const rows = (data.responses ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        return <AdminEmpty icon="rocket-outline" title="No onboarding responses" />;
      }
      return rows.map((r) => (
        <AdminListCard
          key={String(r.user_id)}
          title={`Stylist ${String(r.user_id).slice(0, 8)}…`}
          subtitle={JSON.stringify(r.survey ?? {}, null, 0).slice(0, 160)}
          meta={formatDate(String(r.created_at))}
        />
      ));
    }

    if (tab === 'analytics') {
      const bySub = (data.by_subdomain ?? []) as { subdomain: string; views: number }[];
      const topPaths = (data.top_paths ?? []) as { path: string; views: number }[];
      return (
        <>
          <AdminRevenueBanner
            label="Total analytics events"
            value={String(data.total_events ?? 0)}
            note="Traffic across all published salon sites"
          />
          <AdminSectionTitle title="Top subdomains" />
          {bySub.slice(0, 10).map((s) => (
            <AdminListCard key={s.subdomain} title={s.subdomain} badges={[{ label: `${s.views} views`, tone: 'accent' }]} />
          ))}
          <AdminSectionTitle title="Top paths" />
          {topPaths.slice(0, 10).map((p) => (
            <AdminListCard key={p.path} title={p.path} badges={[{ label: `${p.views} views`, tone: 'neutral' }]} />
          ))}
        </>
      );
    }

    return <AdminNote>No renderer for this tab.</AdminNote>;
  }, [data, hideMoney, navigation, styles.heroRow, styles.tileGrid, tab]);

  const searchable = ['users', 'bookings', 'clients', 'inquiries'].includes(tab);
  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <AdminShell>
      <AdminChrome>
        <AdminHeader
          title="Styld Admin"
          subtitle={user?.email ?? 'Platform dashboard'}
          actions={
            <>
              <AdminIconButton
                icon={hideMoney ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setHideMoney((v) => !v)}
                active={hideMoney}
              />
              <AdminIconButton icon="refresh-outline" onPress={() => void load()} />
              <AdminIconButton icon="log-out-outline" onPress={handleSignOut} />
            </>
          }
        />

        <AdminTabBar tabs={TABS} active={tab} onChange={setTab} />

        {searchable ? (
          <AdminSearchField
            value={search}
            onChangeText={setSearch}
            onSubmit={() => void load()}
            placeholder={`Search ${activeTab?.label.toLowerCase() ?? 'records'}…`}
          />
        ) : null}
      </AdminChrome>

      <AdminBody>
        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} onRetry={() => void load()} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        )}
      </AdminBody>
    </AdminShell>
  );
}

const BASE_STYLES = {
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 10 },
  heroRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 2 },
  tileGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
};
