import { supabase } from './supabase';

export type TopPage = {
  path: string;
  page_type?: string;
  views: number;
};

export type DailyPoint = {
  day: string;   // 'YYYY-MM-DD'
  views: number;
};

/** RPC / Site tab summary (period-scoped) */
export type AnalyticsSummary = {
  period_days: number;
  total_views: number;
  profile_views: number;
  booking_views: number;
  daily: DailyPoint[];
  top_pages: TopPage[];
};

/** Edge function `analytics-summary` — full business dashboard payload */
export type BusinessAnalyticsSummary = {
  subdomain: string | null;
  views7d: number;
  views30d: number;
  sessions7d: number;
  sessions30d: number;
  topPages: { path: string; views: number }[];
  referrers: { source: string; count: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  dailyTrend: { date: string; views: number; sessions: number }[];
};

export async function fetchAnalyticsSummary(days: number = 7): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc('get_site_analytics_summary', { p_days: days });
  if (error) {
    console.warn('[siteAnalytics] RPC error:', error.message);
    return null;
  }
  return (data as AnalyticsSummary) ?? null;
}

export async function fetchBusinessAnalytics(): Promise<BusinessAnalyticsSummary | null> {
  const { data, error } = await supabase.functions.invoke('analytics-summary');
  if (error) {
    console.warn('[siteAnalytics] analytics-summary error:', error.message);
    return null;
  }
  return (data as BusinessAnalyticsSummary) ?? null;
}

/** Format a path like '/booking' → 'Booking' or '/' → 'Home' */
export function friendlyPath(raw: string): string {
  if (!raw || raw === '/') return 'Home';
  const name = raw.split('/').pop()?.replace('.html', '') ?? raw;
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
