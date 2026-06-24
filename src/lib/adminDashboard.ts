import { supabase } from './supabase';

const FUNCTION_NAME = 'styld-admin-dashboard';

export type AdminAction =
  | 'overview'
  | 'styld_revenue'
  | 'users'
  | 'bookings'
  | 'clients'
  | 'cancellations'
  | 'inquiries'
  | 'reviews'
  | 'emails'
  | 'onboarding'
  | 'analytics'
  | 'user_detail'
  | 'booking_detail'
  | 'export';

export type AdminFilters = Record<string, string | number | boolean | null | undefined>;

export async function callAdminDashboard<T = unknown>(
  action: AdminAction,
  filters: AdminFilters = {},
): Promise<T> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase configuration');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Sign in as platform admin to continue');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, filters }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : `Request failed (${res.status})`);
  }

  return json as T;
}

export function formatMoney(value: number | null | undefined, hidden = false): string {
  if (hidden) return '***';
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
