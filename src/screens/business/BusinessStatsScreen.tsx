import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import BusinessScreenLayout, { BusinessSection } from '../../components/business/BusinessScreenLayout';
import PeriodSelector from '../../components/PeriodSelector';
import { Period } from '../../data/periods';
import { usePrivacyMode } from '../../context/PrivacyContext';
import { useSiteData } from '../../context/SiteDataContext';
import {
  fetchBusinessAnalytics,
  friendlyPath,
  type BusinessAnalyticsSummary,
} from '../../lib/siteAnalytics';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { colors, fonts } from '../../theme';
import { maskMoney } from '../../utils/money';

type Props = NativeStackScreenProps<ProfileStackParamList, 'BusinessStats'>;

type MetricTone = 'pink' | 'green' | 'purple' | 'amber' | 'blue';

const TONE_COLORS: Record<MetricTone, { bg: string; fg: string }> = {
  pink: { bg: 'rgba(219, 39, 119, 0.14)', fg: colors.accentPink },
  green: { bg: 'rgba(34, 197, 94, 0.14)', fg: '#22c55e' },
  purple: { bg: 'rgba(124, 58, 237, 0.14)', fg: '#a78bfa' },
  amber: { bg: 'rgba(245, 185, 66, 0.14)', fg: colors.accentGold },
  blue: { bg: 'rgba(56, 189, 248, 0.14)', fg: '#38bdf8' },
};

function HeroBanner({ children }: { children: ReactNode }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.heroWrap}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="analyticsHero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accentPink} stopOpacity="0.22" />
            <Stop offset="0.55" stopColor="#7c3aed" stopOpacity="0.12" />
            <Stop offset="1" stopColor={colors.card} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#analyticsHero)" />
      </Svg>
      <View style={styles.heroInner}>{children}</View>
    </View>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone = 'pink',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: MetricTone;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const toneStyle = TONE_COLORS[tone];

  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIconWrap, { backgroundColor: toneStyle.bg }]}>
        <Ionicons name={icon} size={18} color={toneStyle.fg} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ label, value, last, hint }: { label: string; value: string; last?: boolean; hint?: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function BigStatPair({
  left,
  right,
}: {
  left: { label: string; value: string; tone?: MetricTone };
  right: { label: string; value: string; tone?: MetricTone };
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const renderStat = (stat: { label: string; value: string; tone?: MetricTone }) => {
    const tone = TONE_COLORS[stat.tone ?? 'pink'];
    return (
      <View style={styles.bigStat}>
        <Text style={[styles.bigStatValue, { color: tone.fg }]}>{stat.value}</Text>
        <Text style={styles.bigStatLabel}>{stat.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.bigStatRow}>
      {renderStat(left)}
      {renderStat(right)}
    </View>
  );
}

function SparkBar({ value, max }: { value: number; max: number }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const pct = max > 0 ? Math.max(0.04, value / max) : 0.04;
  return (
    <View style={styles.sparkTrack}>
      <View style={[styles.sparkFill, { flex: pct }]} />
      <View style={{ flex: 1 - pct }} />
    </View>
  );
}

function DeviceBar({ mobile, tablet, desktop }: { mobile: number; tablet: number; desktop: number }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const other = Math.max(0, 100 - mobile - tablet - desktop);
  return (
    <View>
      <View style={styles.deviceBar}>
        {mobile > 0 && <View style={[styles.deviceSeg, styles.deviceMobile, { flex: mobile }]} />}
        {tablet > 0 && <View style={[styles.deviceSeg, styles.deviceTablet, { flex: tablet }]} />}
        {desktop > 0 && <View style={[styles.deviceSeg, styles.deviceDesktop, { flex: desktop }]} />}
        {other > 0 && <View style={[styles.deviceSeg, styles.deviceOther, { flex: other }]} />}
      </View>
      <View style={styles.deviceLegend}>
        <LegendDot color={colors.accentPink} label={`Mobile ${mobile}%`} />
        <LegendDot color="#7c3aed" label={`Desktop ${desktop}%`} />
        {tablet > 0 && <LegendDot color="#0891b2" label={`Tablet ${tablet}%`} />}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export default function BusinessStatsScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { hasLinkedSite, clients, appointments, bookings, getRevenueForPeriod, getMoneyStatsForLastDays, getUpcomingAppointments, getTodayJobStats } = useSiteData();
  const { privacyMode } = usePrivacyMode();
  const [period, setPeriod] = useState<Period>('week');
  const [analytics, setAnalytics] = useState<BusinessAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!hasLinkedSite) return;
    setAnalyticsLoading(true);
    try {
      const data = await fetchBusinessAnalytics();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [hasLinkedSite]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  const completed = useMemo(
    () => appointments.filter((item) => item.status === 'completed'),
    [appointments],
  );

  const serviceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const appt of completed) {
      counts.set(appt.service, (counts.get(appt.service) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completed]);

  const topClients = useMemo(
    () => [...clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    [clients],
  );

  const maxPageViews = useMemo(
    () => Math.max(1, ...(analytics?.topPages.map((p) => p.views) ?? [1])),
    [analytics],
  );

  const maxReferrers = useMemo(
    () => Math.max(1, ...(analytics?.referrers.map((r) => r.count) ?? [1])),
    [analytics],
  );

  const money30d = useMemo(() => getMoneyStatsForLastDays(30), [getMoneyStatsForLastDays]);
  const todayJobs = useMemo(() => getTodayJobStats(), [getTodayJobStats]);
  const upcomingCount = getUpcomingAppointments(500).length;

  const bookingOverview = useMemo(() => {
    const total = bookings.length;
    const cancelled = bookings.filter(
      (b) => b.bookingStatus === 'cancelled' || b.bookingStatus === 'canceled',
    ).length;
    const completedCount = appointments.filter((a) => a.status === 'completed').length;
    const pendingPayment = bookings.filter(
      (b) =>
        !b.depositPaid &&
        b.paymentStatus.toLowerCase() !== 'in_person' &&
        (b.bookingStatus === 'pending_payment' || b.paymentStatus.toLowerCase() === 'pending'),
    ).length;
    return { total, cancelled, completed: completedCount, pendingPayment, upcomingCount };
  }, [appointments, bookings, upcomingCount]);

  const periodBookings = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (period === 'week') {
      start.setDate(now.getDate() - now.getDay());
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'all') {
      start = new Date(0);
    }

    const inPeriod = bookings.filter((b) => {
      const created = b.createdAt;
      return created >= start && created <= end;
    });
    const completedInPeriod = inPeriod.filter((b) => b.bookingStatus === 'completed').length;
    const cancelledInPeriod = inPeriod.filter(
      (b) => b.bookingStatus === 'cancelled' || b.bookingStatus === 'canceled',
    ).length;
    const revenue = getRevenueForPeriod(period);
    const avg =
      completedInPeriod > 0
        ? inPeriod
            .filter((b) => b.bookingStatus === 'completed' && (b.price > 0 || b.depositAmount > 0))
            .reduce((sum, b) => sum + (b.price || b.depositAmount), 0) / completedInPeriod
        : 0;

    return {
      newBookings: inPeriod.length,
      completedInPeriod,
      cancelledInPeriod,
      revenue,
      avg,
    };
  }, [bookings, getRevenueForPeriod, period]);

  const siteLive = Boolean(analytics?.subdomain);

  return (
    <BusinessScreenLayout
      title="Analytics"
      onBack={() => navigation.goBack()}
      hasLinkedSite={hasLinkedSite}
      linkMessage="Link your site to start tracking analytics."
      onRefresh={loadAnalytics}
    >
      <HeroBanner>
        <Text style={styles.heroEyebrow}>Overview</Text>
        <Text style={styles.heroTitle}>Your business at a glance</Text>
        <View style={styles.heroMetrics}>
          <MetricTile
            icon="calendar-outline"
            label="Total bookings"
            value={String(bookingOverview.total)}
            tone="pink"
          />
          <MetricTile
            icon="cash-outline"
            label="Collected · 30d"
            value={maskMoney(money30d.collected, privacyMode)}
            tone="green"
          />
          <MetricTile
            icon="globe-outline"
            label="Page views · 30d"
            value={siteLive && !analyticsLoading ? String(analytics?.views30d ?? 0) : '—'}
            tone="purple"
          />
        </View>
      </HeroBanner>

      <SectionCard title="Business snapshot">
        <BigStatPair
          left={{ label: 'Upcoming', value: String(bookingOverview.upcomingCount), tone: 'pink' }}
          right={{ label: 'Completed jobs', value: String(bookingOverview.completed), tone: 'green' }}
        />
        <BigStatPair
          left={{ label: 'Pending payment', value: String(bookingOverview.pendingPayment), tone: 'amber' }}
          right={{ label: 'Cancelled', value: String(bookingOverview.cancelled), tone: 'purple' }}
        />
      </SectionCard>

      <SectionCard title="Today">
        <StatRow
          label="Jobs completed"
          hint="Finished vs scheduled today"
          value={`${todayJobs.completed} / ${todayJobs.total}`}
        />
        <StatRow
          label="Progress"
          value={`${Math.round(todayJobs.progress * 100)}%`}
          last
        />
      </SectionCard>

      <SectionCard title="Payments · last 30 days">
        <StatRow label="Collected" value={maskMoney(money30d.collected, privacyMode)} />
        <StatRow label="Still pending" value={maskMoney(money30d.pending, privacyMode)} />
        <StatRow label="Paid bookings" value={String(money30d.paidBookings)} />
        <StatRow label="Awaiting payment" value={String(money30d.pendingBookings)} last />
      </SectionCard>

      <SectionCard title="Website traffic">
        {analyticsLoading ? (
          <ActivityIndicator color={colors.accentPink} style={{ marginVertical: 16 }} />
        ) : !siteLive ? (
          <View style={styles.zeroState}>
            <View style={styles.zeroStateIcon}>
              <Ionicons name="globe-outline" size={26} color={colors.accentPink} />
            </View>
            <Text style={styles.zeroStateTitle}>Publish your site to start tracking</Text>
            <Text style={styles.zeroStateBody}>
              Page views and visitor data appear here once your site is live.
            </Text>
          </View>
        ) : (
          <>
            <BigStatPair
              left={{ label: 'Page views · 7 days', value: String(analytics?.views7d ?? 0), tone: 'pink' }}
              right={{ label: 'Page views · 30 days', value: String(analytics?.views30d ?? 0), tone: 'purple' }}
            />
            <BigStatPair
              left={{ label: 'Unique visitors · 7 days', value: String(analytics?.sessions7d ?? 0), tone: 'blue' }}
              right={{ label: 'Unique visitors · 30 days', value: String(analytics?.sessions30d ?? 0), tone: 'green' }}
            />
          </>
        )}
      </SectionCard>

      {siteLive && !analyticsLoading && (
        <SectionCard title="Visitor devices · 30 days">
          {analytics?.views30d === 0 ? (
            <Text style={styles.emptyNote}>No visitors yet — check back after your site gets traffic.</Text>
          ) : (
            <DeviceBar
              mobile={analytics?.devices.mobile ?? 0}
              tablet={analytics?.devices.tablet ?? 0}
              desktop={analytics?.devices.desktop ?? 0}
            />
          )}
        </SectionCard>
      )}

      {siteLive && !analyticsLoading && (
        <SectionCard title="Top pages · 30 days">
          {analytics?.topPages.length === 0 ? (
            <Text style={styles.emptyNote}>0 page views recorded yet.</Text>
          ) : (
            analytics.topPages.map((page, i) => (
              <View key={page.path} style={[styles.barRow, i < analytics.topPages.length - 1 && styles.rowBorder]}>
                <Text style={styles.barLabel} numberOfLines={1}>{friendlyPath(page.path)}</Text>
                <SparkBar value={page.views} max={maxPageViews} />
                <Text style={styles.barCount}>{page.views}</Text>
              </View>
            ))
          )}
        </SectionCard>
      )}

      {siteLive && !analyticsLoading && (
        <SectionCard title="Traffic sources · 30 days">
          {analytics?.referrers.length === 0 ? (
            <Text style={styles.emptyNote}>No external traffic sources tracked yet.</Text>
          ) : (
            analytics.referrers.map((ref, i) => (
              <View key={ref.source} style={[styles.barRow, i < analytics.referrers.length - 1 && styles.rowBorder]}>
                <Text style={styles.barLabel} numberOfLines={1}>{ref.source}</Text>
                <SparkBar value={ref.count} max={maxReferrers} />
                <Text style={styles.barCount}>{ref.count}</Text>
              </View>
            ))
          )}
        </SectionCard>
      )}

      <BusinessSection title="Bookings">
        <View style={styles.sectionCard}>
          <PeriodSelector selectedPeriod={period} onPeriodChange={setPeriod} centered={false} />
          <View style={{ height: 12 }} />
          <StatRow label="Revenue" value={maskMoney(periodBookings.revenue, privacyMode)} />
          <StatRow label="New bookings" value={String(periodBookings.newBookings)} />
          <StatRow label="Completed" value={String(periodBookings.completedInPeriod)} />
          <StatRow label="Cancelled" value={String(periodBookings.cancelledInPeriod)} />
          <StatRow
            label="Avg completed value"
            value={periodBookings.avg > 0 ? maskMoney(periodBookings.avg, privacyMode) : '—'}
          />
          <StatRow label="Total clients" value={String(clients.length)} last />
        </View>
      </BusinessSection>

      <SectionCard title="Popular services">
        {serviceCounts.length === 0 ? (
          <Text style={styles.emptyNote}>No completed bookings yet.</Text>
        ) : (
          serviceCounts.map(([service, count], i) => (
            <StatRow
              key={service}
              label={service}
              value={String(count)}
              last={i === serviceCounts.length - 1}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Top clients">
        {topClients.length === 0 ? (
          <Text style={styles.emptyNote}>No clients yet.</Text>
        ) : (
          topClients.map((client, i) => (
            <StatRow
              key={client.id}
              label={client.name}
              value={maskMoney(client.totalSpent, privacyMode)}
              last={i === topClients.length - 1}
            />
          ))
        )}
      </SectionCard>
    </BusinessScreenLayout>
  );
}

const BASE_STYLES = {
  heroWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  heroInner: {
    padding: 18,
    gap: 12,
  },
  heroEyebrow: {
    color: colors.accentPink,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metricTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.text,
    fontFamily: fonts.number,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
  },

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  sectionCardTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rowLabelWrap: {
    flex: 1,
    gap: 2,
  },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowHint: { color: colors.textMuted, fontSize: 12, opacity: 0.75 },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.numberMedium,
  },

  emptyNote: { color: colors.textMuted, fontSize: 14, paddingVertical: 4 },

  zeroState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  zeroStateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(219, 39, 119, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroStateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  zeroStateBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  bigStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  bigStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  bigStatValue: {
    fontFamily: fonts.number,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  bigStatLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  barLabel: {
    width: 90,
    color: colors.text,
    fontSize: 13,
  },
  sparkTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.progressTrack,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sparkFill: {
    height: '100%',
    backgroundColor: colors.accentPink,
    borderRadius: 4,
  },
  barCount: {
    width: 34,
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.numberMedium,
  },

  deviceBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  deviceSeg: { height: '100%' },
  deviceMobile: { backgroundColor: colors.accentPink },
  deviceTablet: { backgroundColor: '#0891b2' },
  deviceDesktop: { backgroundColor: '#7c3aed' },
  deviceOther: { backgroundColor: colors.progressTrack },
  deviceLegend: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 12 },
};
