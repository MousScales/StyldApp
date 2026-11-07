import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  aggregateClients,
  buildSiteContentSummary,
  buildSiteThemeSummary,
  buildStyleCatalog,
  flattenBooking,
  jsonResponse,
  num,
  parseSiteSettings,
  paymentModeLabel,
  settingValue,
  str,
} from '../_shared/adminDashboardHelpers.ts';
import {
  fetchRevenueCatSubscriber,
  resolveStyldSubscriptionStatus,
  REVENUECAT_ENTITLEMENT_ID,
} from '../_shared/revenuecat.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Filters = Record<string, unknown>;

const rateLimit = new Map<string, { fails: number; lockedUntil: number }>();
const MAX_PIN_FAILS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function checkPin(req: Request, pin: string): Response | null {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (entry && entry.lockedUntil > now) {
    return jsonResponse({ error: 'Too many attempts. Try again in 15 minutes.' }, 429, cors);
  }

  const expected = Deno.env.get('ADMIN_PIN')?.trim() || '0000';
  if (pin !== expected) {
    const fails = (entry?.fails ?? 0) + 1;
    const lockedUntil = fails >= MAX_PIN_FAILS ? now + LOCKOUT_MS : 0;
    rateLimit.set(ip, { fails, lockedUntil });
    return jsonResponse({ error: 'Invalid PIN' }, 401, cors);
  }

  rateLimit.delete(ip);
  return null;
}

async function authorizeAdmin(req: Request, pin: string): Promise<Response | null> {
  if (pin) {
    return checkPin(req, pin);
  }

  const adminEmail = Deno.env.get('ADMIN_EMAIL')?.trim().toLowerCase();
  const authHeader = req.headers.get('Authorization');
  if (!adminEmail || !authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.email) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  if (authData.user.email.trim().toLowerCase() !== adminEmail) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  return null;
}

function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

async function loadSalonMeta(admin: SupabaseClient) {
  const { data: sites } = await admin.from('styld_user_sites').select('user_id, business_name, subdomain, published_at');
  const { data: subs } = await admin.from('styld_site_subdomains').select('user_id, subdomain, published_at');
  const map = new Map<string, { brand_name: string; subdomain: string | null; published_at: string | null }>();

  for (const s of sites ?? []) {
    map.set(s.user_id, {
      brand_name: str(s.business_name) || 'Unnamed',
      subdomain: s.subdomain,
      published_at: s.published_at,
    });
  }

  for (const s of subs ?? []) {
    const prev = map.get(s.user_id);
    map.set(s.user_id, {
      brand_name: prev?.brand_name ?? 'Unnamed',
      subdomain: s.subdomain ?? prev?.subdomain ?? null,
      published_at: s.published_at ?? prev?.published_at ?? null,
    });
  }

  return map;
}

async function subscriptionForUser(userId: string) {
  const iosKey = Deno.env.get('REVENUECAT_IOS_PUBLIC_KEY')?.trim()
    ?? Deno.env.get('EXPO_PUBLIC_REVENUECAT_IOS_KEY')?.trim()
    ?? '';
  if (!iosKey) {
    return { status: 'unknown', plan_label: 'Unknown', entitlement: REVENUECAT_ENTITLEMENT_ID };
  }
  const result = await fetchRevenueCatSubscriber(userId, iosKey, 'ios');
  if (!result.ok) {
    return { status: result.status === 404 ? 'none' : 'error', plan_label: 'Free', entitlement: REVENUECAT_ENTITLEMENT_ID };
  }
  const status = resolveStyldSubscriptionStatus(result.data, REVENUECAT_ENTITLEMENT_ID);
  const product = status.productIdentifier ?? '';
  let planLabel = 'Free';
  if (status.entitled) {
    planLabel = product.includes('year') ? 'Pro Yearly' : 'Pro Monthly';
  } else if (status.expiresDate) {
    planLabel = 'Expired';
  }
  return {
    status: status.entitled ? 'active' : status.expiresDate ? 'expired' : 'none',
    entitlement: REVENUECAT_ENTITLEMENT_ID,
    product: product || null,
    plan_label: planLabel,
    expires_date: status.expiresDate,
    purchase_date: null,
    store: 'App Store',
    will_renew: status.entitled,
    billing_issues: false,
    unsubscribe_detected_at: null,
  };
}

async function handleOverview(admin: SupabaseClient) {
  const salonMeta = await loadSalonMeta(admin);
  const { count: profileCount } = await admin.from('profiles').select('*', { count: 'exact', head: true });
  const { data: bookings } = await admin.from('styld_site_records').select('user_id, data').eq('record_type', 'booking');
  const activeBookings = (bookings ?? []).filter((b) => {
    const status = str((b.data as Record<string, unknown>)?.booking_status).toLowerCase();
    return status !== 'cancelled' && status !== 'canceled';
  });

  let gross = 0;
  let collected = 0;
  let pending = 0;
  const paymentStatus = new Map<string, number>();
  const bySalon = new Map<string, { gross: number; collected: number; pending: number }>();

  for (const row of activeBookings) {
    const d = row.data as Record<string, unknown>;
    const total = num(d.estimated_total, 0);
    const deposit = num(d.deposit_amount, 0);
    const ps = str(d.payment_status) || 'none';
    gross += total;
    paymentStatus.set(ps, (paymentStatus.get(ps) ?? 0) + 1);
    const paid = ps === 'paid' || ps === 'deposit_paid';
    if (paid) collected += ps === 'paid' ? total : deposit;
    else pending += total;

    const bucket = bySalon.get(row.user_id) ?? { gross: 0, collected: 0, pending: 0 };
    bucket.gross += total;
    if (paid) bucket.collected += ps === 'paid' ? total : deposit;
    else bucket.pending += total;
    bySalon.set(row.user_id, bucket);
  }

  const published = [...salonMeta.values()].filter((s) => s.published_at).length;
  const { count: inquiryCount } = await admin.from('styld_site_records').select('*', { count: 'exact', head: true }).eq('record_type', 'inquiry');
  const { count: reviewCount } = await admin.from('styld_site_records').select('*', { count: 'exact', head: true }).eq('record_type', 'review');
  const { count: stripeLive } = await admin.from('styld_stripe_accounts').select('*', { count: 'exact', head: true }).eq('charges_enabled', true);

  const topSalons = [...bySalon.entries()]
    .map(([user_id, rev]) => {
      const meta = salonMeta.get(user_id);
      return {
        user_id,
        brand_name: meta?.brand_name ?? 'Unknown',
        subdomain: meta?.subdomain ?? null,
        gross: rev.gross,
        collected: rev.collected,
        pending: rev.pending,
      };
    })
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 10);

  const clientKeys = new Set(
    activeBookings.map((b) => {
      const d = b.data as Record<string, unknown>;
      return `${b.user_id}:${str(d.email).toLowerCase()}:${str(d.phone)}`;
    }),
  );

  return {
    total_stylists: profileCount ?? 0,
    published_sites: published,
    draft_sites: Math.max(0, (profileCount ?? 0) - published),
    total_bookings: activeBookings.length,
    unique_clients_per_stylist: 0,
    unique_clients_global: clientKeys.size,
    total_inquiries: inquiryCount ?? 0,
    total_reviews: reviewCount ?? 0,
    stripe_merchants_live: stripeLive ?? 0,
    subscriptions_note: 'See Styld Revenue tab for MRR',
    payments: {
      gross,
      collected,
      pending,
      customer_charges: collected,
      estimated_service_fees: 0,
      estimated_platform_fees: 0,
      estimated_processing_fees: 0,
      refunds_total: 0,
      refunds_count: 0,
      payment_status: [...paymentStatus.entries()].map(([status, count]) => ({ status, count })),
    },
    stripe_connect: {
      merchants_total: stripeLive ?? 0,
      merchants_live: stripeLive ?? 0,
      merchants_payouts_enabled: 0,
      balance_available_cents: 0,
      balance_pending_cents: 0,
      balance_available: 0,
      balance_pending: 0,
      balance_total: 0,
      accounts_with_balance: 0,
    },
    top_salons_by_collected: topSalons,
    fee_note: 'Fee estimates require Stripe balance API aggregation.',
  };
}

async function handleUsers(admin: SupabaseClient, filters: Filters) {
  const search = str(filters.search).toLowerCase();
  const salonMeta = await loadSalonMeta(admin);
  const { data: profiles } = await admin.from('profiles').select('*').order('created_at', { ascending: false });

  const { data: allSettings } = await admin
    .from('styld_site_records')
    .select('user_id, record_key, data')
    .eq('record_type', 'site_setting');

  const settingsByUser = new Map<string, ReturnType<typeof parseSiteSettings>>();
  for (const row of allSettings ?? []) {
    const list = settingsByUser.get(row.user_id) ?? {};
    if (row.record_key) list[row.record_key] = settingValue(row.data);
    settingsByUser.set(row.user_id, list);
  }

  const { data: bookingRows } = await admin.from('styld_site_records').select('user_id, data').eq('record_type', 'booking');
  const counts = new Map<string, { bookings: number; revenue: number; collected: number }>();
  for (const row of bookingRows ?? []) {
    const d = row.data as Record<string, unknown>;
    const c = counts.get(row.user_id) ?? { bookings: 0, revenue: 0, collected: 0 };
    c.bookings += 1;
    const total = num(d.estimated_total, 0);
    c.revenue += total;
    const ps = str(d.payment_status);
    if (ps === 'paid' || ps === 'deposit_paid') c.collected += ps === 'paid' ? total : num(d.deposit_amount, 0);
    counts.set(row.user_id, c);
  }

  const users = [];
  for (const p of profiles ?? []) {
    const meta = salonMeta.get(p.id);
    const settings = settingsByUser.get(p.id) ?? {};
    const content = (settings.site_content ?? {}) as Record<string, unknown>;
    const theme = (settings.site_theme ?? {}) as Record<string, unknown>;
    const payment = (settings.booking_payment ?? {}) as Record<string, unknown>;
    const catalog = (settings.style_catalog_meta ?? {}) as Record<string, Record<string, unknown>>;
    const c = counts.get(p.id) ?? { bookings: 0, revenue: 0, collected: 0 };
    const brand = str(content.brandName) || str(p.business_name) || str(p.full_name) || 'Unnamed';
    if (search && !`${brand} ${p.email} ${meta?.subdomain ?? ''}`.toLowerCase().includes(search)) continue;

    let addonCount = 0;
    for (const style of Object.values(catalog)) {
      if (Array.isArray(style?.addons)) addonCount += style.addons.length;
    }

    users.push({
      user_id: p.id,
      email: p.email,
      full_name: p.full_name,
      business_name: p.business_name,
      avatar_url: p.avatar_url,
      brand_name: brand,
      image_url: null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      total_revenue: c.revenue,
      revenue_collected: c.collected,
      revenue_pending: Math.max(0, c.revenue - c.collected),
      subdomain: meta?.subdomain ?? null,
      published_at: meta?.published_at ?? null,
      public_url: meta?.subdomain ? `https://${meta.subdomain}.styldd.com` : null,
      site_published: !!meta?.published_at,
      booking_count: c.bookings,
      hero_layout: str(theme.heroLayout) || 'banner',
      hero_layout_label: buildSiteThemeSummary(theme).hero_layout_label,
      style_count: Object.keys(catalog).length,
      addon_count: addonCount,
      payment_mode: str(payment.mode) || 'in_person',
      payment_mode_label: paymentModeLabel(str(payment.mode)),
      subscription: await subscriptionForUser(p.id),
    });
  }

  return { users };
}

async function handleBookings(admin: SupabaseClient, filters: Filters) {
  const search = str(filters.search).toLowerCase();
  const limit = Math.min(1000, Math.max(1, num(filters.limit, 500)));
  const salonMeta = await loadSalonMeta(admin);
  const { data: rows } = await admin
    .from('styld_site_records')
    .select('id, user_id, created_at, updated_at, data')
    .eq('record_type', 'booking')
    .order('created_at', { ascending: false })
    .limit(limit);

  let bookings = (rows ?? []).map((row) => {
    const meta = salonMeta.get(row.user_id);
    return flattenBooking(row, { brand_name: meta?.brand_name, subdomain: meta?.subdomain });
  });

  if (search) {
    bookings = bookings.filter((b) =>
      `${b.full_name} ${b.email} ${b.style_name} ${b.brand_name} ${b.subdomain}`.toLowerCase().includes(search)
    );
  }

  return { bookings };
}

async function handleUserDetail(admin: SupabaseClient, filters: Filters) {
  const userId = str(filters.user_id);
  if (!userId) return { error: 'user_id required' };

  const salonMeta = await loadSalonMeta(admin);
  const meta = salonMeta.get(userId);

  const { data: profile } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  const { data: settingsRows } = await admin
    .from('styld_site_records')
    .select('record_key, data')
    .eq('user_id', userId)
    .eq('record_type', 'site_setting');

  const site_settings = parseSiteSettings(settingsRows ?? []);
  const content = (site_settings.site_content ?? {}) as Record<string, unknown>;
  const theme = (site_settings.site_theme ?? {}) as Record<string, unknown>;
  const catalogMeta = site_settings.style_catalog_meta as Record<string, Record<string, unknown>> | undefined;
  const priceOverrides = site_settings.style_price_overrides as Record<string, number> | undefined;

  const { data: bookingRows } = await admin
    .from('styld_site_records')
    .select('id, user_id, created_at, updated_at, data')
    .eq('user_id', userId)
    .eq('record_type', 'booking')
    .order('created_at', { ascending: false })
    .limit(500);

  const bookings = (bookingRows ?? []).map((row) =>
    flattenBooking(row, { brand_name: meta?.brand_name, subdomain: meta?.subdomain })
  );

  const style_catalog = buildStyleCatalog(catalogMeta, priceOverrides);
  const addon_count = style_catalog.reduce((sum, s) => sum + s.addon_count, 0);

  const { data: inquiryRows } = await admin
    .from('styld_site_records')
    .select('id, created_at, data')
    .eq('user_id', userId)
    .eq('record_type', 'inquiry')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: reviewRows } = await admin
    .from('styld_site_records')
    .select('id, created_at, data')
    .eq('user_id', userId)
    .eq('record_type', 'review')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: blockRows } = await admin
    .from('styld_site_records')
    .select('id, created_at, data')
    .eq('user_id', userId)
    .eq('record_type', 'blocked_interval')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: stripe } = await admin.from('styld_stripe_accounts').select('*').eq('user_id', userId).maybeSingle();
  const { data: pushTokens } = await admin.from('styld_push_tokens').select('*').eq('user_id', userId);

  let cancellations: unknown[] = [];
  const { data: cancelRows, error: cancelErr } = await admin
    .from('styld_cancellation_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!cancelErr) cancellations = cancelRows ?? [];

  const subdomain = meta?.subdomain ?? null;
  let analytics = { source: 'none', total_views: 0, views_7d: 0, views_30d: 0, views_90d: 0, daily_views: [], top_paths: [], by_device: [] };
  if (subdomain) {
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: events } = await admin
      .from('styld_analytics_events')
      .select('path, device_type, created_at')
      .eq('subdomain', subdomain)
      .gte('created_at', since90)
      .limit(5000);
    const rows = events ?? [];
    const now = Date.now();
    analytics = {
      source: 'styld_analytics_events',
      total_views: rows.length,
      views_7d: rows.filter((e) => Date.parse(e.created_at) >= now - 7 * 86400000).length,
      views_30d: rows.filter((e) => Date.parse(e.created_at) >= now - 30 * 86400000).length,
      views_90d: rows.length,
      daily_views: [],
      top_paths: [],
      by_device: [],
    };
  }

  const gross = bookings.reduce((s, b) => s + num(b.estimated_total, 0), 0);
  const collected = bookings.reduce((s, b) => {
    const ps = str(b.payment_status);
    return s + (ps === 'paid' ? num(b.estimated_total, 0) : ps === 'deposit_paid' ? num(b.deposit_amount, 0) : 0);
  }, 0);

  return {
    profile,
    brand_name: str(content.brandName) || profile?.business_name || profile?.full_name,
    tagline: str(content.taglineLeft),
    image_url: null,
    subdomain,
    public_url: subdomain ? `https://${subdomain}.styldd.com` : null,
    published_at: meta?.published_at ?? null,
    contact: {
      phone: str(content.phoneDisplay),
      email: str(content.email) || profile?.email,
      instagram: str(content.instagramHandle),
      address: str(content.addressLine1),
      city: str(content.city),
      state: str(content.state),
      timezone: str(content.timezone),
    },
    revenue_summary: {
      gross,
      collected,
      pending: Math.max(0, gross - collected),
      booking_count: bookings.length,
      cancelled_count: bookings.filter((b) => b.booking_status === 'cancelled').length,
      unique_clients: aggregateClients(bookings).length,
    },
    analytics,
    clients: aggregateClients(bookings),
    site_settings,
    site_theme_summary: buildSiteThemeSummary(theme),
    site_content_summary: buildSiteContentSummary(content),
    style_catalog,
    style_count: style_catalog.length,
    addon_count,
    booking_payment: site_settings.booking_payment ?? null,
    booking_hours: site_settings.booking_hours ?? null,
    cancellation_policy: site_settings.cancellation_policy ?? null,
    onboarding_responses: site_settings.onboarding_responses ?? null,
    bookings: bookings.slice(0, 15),
    inquiries: inquiryRows ?? [],
    reviews: reviewRows ?? [],
    blocked_intervals: blockRows ?? [],
    stripe: stripe ?? null,
    push_tokens: pushTokens ?? [],
    cancellations,
    subscription: await subscriptionForUser(userId),
    emails: [],
  };
}

async function handleBookingDetail(admin: SupabaseClient, filters: Filters) {
  const bookingId = str(filters.booking_id);
  if (!bookingId) return { error: 'booking_id required' };

  let row = null;
  const { data: byRow } = await admin.from('styld_site_records').select('*').eq('id', bookingId).eq('record_type', 'booking').maybeSingle();
  row = byRow;
  if (!row) {
    const { data: all } = await admin.from('styld_site_records').select('*').eq('record_type', 'booking').limit(2000);
    row = (all ?? []).find((r) => str((r.data as Record<string, unknown>)?.id) === bookingId) ?? null;
  }
  if (!row) return { error: 'Booking not found' };

  const salonMeta = await loadSalonMeta(admin);
  const meta = salonMeta.get(row.user_id);
  const booking = flattenBooking(row, { brand_name: meta?.brand_name, subdomain: meta?.subdomain });

  return {
    booking: {
      ...booking,
      photo_hair_url: null,
      photo_ref_url: null,
    },
    salon: {
      user_id: row.user_id,
      brand_name: meta?.brand_name ?? null,
      subdomain: meta?.subdomain ?? null,
      public_url: meta?.subdomain ? `https://${meta.subdomain}.styldd.com` : null,
    },
  };
}

async function handleClients(admin: SupabaseClient, filters: Filters) {
  const search = str(filters.search).toLowerCase();
  const { bookings } = await handleBookings(admin, { limit: 1000 });
  let clients = aggregateClients(bookings as ReturnType<typeof flattenBooking>[]);
  if (search) {
    clients = clients.filter((c) =>
      `${c.client_name} ${c.email} ${c.phone} ${c.brand_name}`.toLowerCase().includes(search)
    );
  }
  return { clients };
}

async function handleAnalytics(admin: SupabaseClient) {
  const { data: events } = await admin
    .from('styld_analytics_events')
    .select('subdomain, path, device_type')
    .order('created_at', { ascending: false })
    .limit(10000);

  const rows = events ?? [];
  const bySub = new Map<string, number>();
  const byPath = new Map<string, number>();
  const byDevice = new Map<string, number>();
  for (const e of rows) {
    bySub.set(e.subdomain, (bySub.get(e.subdomain) ?? 0) + 1);
    byPath.set(e.path, (byPath.get(e.path) ?? 0) + 1);
    const dev = e.device_type || 'unknown';
    byDevice.set(dev, (byDevice.get(dev) ?? 0) + 1);
  }

  return {
    source: 'styld_analytics_events',
    total_events: rows.length,
    by_subdomain: [...bySub.entries()].map(([subdomain, views]) => ({ subdomain, views })).sort((a, b) => b.views - a.views),
    top_paths: [...byPath.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 20),
    by_device: [...byDevice.entries()].map(([device_type, views]) => ({ device_type, views })),
  };
}

async function handleInquiries(admin: SupabaseClient, filters: Filters) {
  const search = str(filters.search).toLowerCase();
  const salonMeta = await loadSalonMeta(admin);
  const { data: rows } = await admin
    .from('styld_site_records')
    .select('id, user_id, created_at, data')
    .eq('record_type', 'inquiry')
    .order('created_at', { ascending: false })
    .limit(500);

  let inquiries = (rows ?? []).map((row) => {
    const d = row.data as Record<string, unknown>;
    const meta = salonMeta.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      created_at: row.created_at,
      full_name: str(d.full_name) || str(d.name),
      email: str(d.email),
      phone: str(d.phone),
      message: str(d.message) || str(d.notes) || str(d.body),
      brand_name: meta?.brand_name ?? null,
      subdomain: meta?.subdomain ?? null,
    };
  });

  if (search) {
    inquiries = inquiries.filter((i) =>
      `${i.full_name} ${i.email} ${i.message} ${i.brand_name}`.toLowerCase().includes(search)
    );
  }
  return { inquiries };
}

async function handleReviews(admin: SupabaseClient) {
  const salonMeta = await loadSalonMeta(admin);
  const { data: rows } = await admin
    .from('styld_site_records')
    .select('id, user_id, created_at, data')
    .eq('record_type', 'review')
    .order('created_at', { ascending: false })
    .limit(500);

  return {
    reviews: (rows ?? []).map((row) => {
      const d = row.data as Record<string, unknown>;
      const meta = salonMeta.get(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        created_at: row.created_at,
        rating: num(d.rating, 0),
        review_text: str(d.review_text) || str(d.comment) || str(d.message),
        client_name: str(d.client_name),
        brand_name: meta?.brand_name ?? null,
        subdomain: meta?.subdomain ?? null,
      };
    }),
  };
}

async function handleOnboarding(admin: SupabaseClient) {
  const { data: rows } = await admin
    .from('styld_site_records')
    .select('user_id, data, created_at')
    .eq('record_type', 'site_setting')
    .eq('record_key', 'onboarding_responses')
    .order('updated_at', { ascending: false })
    .limit(500);

  return {
    responses: (rows ?? []).map((row) => ({
      user_id: row.user_id,
      created_at: row.created_at,
      survey: settingValue(row.data),
    })),
  };
}

async function handleCancellations(admin: SupabaseClient) {
  const salonMeta = await loadSalonMeta(admin);
  const { data: rows, error } = await admin
    .from('styld_cancellation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return { cancellations: [] };

  return {
    cancellations: (rows ?? []).map((row) => {
      const meta = salonMeta.get(row.user_id);
      return {
        ...row,
        brand_name: meta?.brand_name ?? null,
        subdomain: meta?.subdomain ?? null,
      };
    }),
  };
}

async function handleStyldRevenue(admin: SupabaseClient, filters: Filters) {
  const { data: profiles } = await admin.from('profiles').select('id');
  let active = 0;
  let expired = 0;
  let free = 0;
  const subscribers = [];

  for (const p of profiles ?? []) {
    const sub = await subscriptionForUser(p.id);
    if (sub.status === 'active') active += 1;
    else if (sub.status === 'expired') expired += 1;
    else free += 1;
    subscribers.push({ user_id: p.id, status: sub.status, plan_label: sub.plan_label });
  }

  return {
    period: { range: str(filters.range) || 'all', label: 'All time', month: null, year: null },
    platform: { platform_fees: 0, service_fees: 0, customer_charges: 0, collected: 0, paid_bookings: 0 },
    platform_timeline: [],
    platform_timeline_filtered: [],
    subscriptions: {
      total_salons: profiles?.length ?? 0,
      active,
      active_monthly: active,
      active_yearly: 0,
      active_other: 0,
      free,
      expired,
      errors: 0,
      new_in_period: 0,
      estimated_mrr: active * 9.99,
      monthly_price: 9.99,
      yearly_price: 99.99,
      plans: { monthly: {}, yearly: {}, other: {}, total_mrr: active * 9.99 },
      revenuecat_overview: null,
      subscribers: subscribers.slice(0, 100),
    },
    combined: {
      platform_cut: 0,
      estimated_subscription_mrr: active * 9.99,
      estimated_subscription_monthly_gross: active * 9.99,
      estimated_subscription_yearly_gross: 0,
      note: 'MRR is estimated from active RevenueCat entitlements × $9.99/mo.',
    },
    available_months: [],
    available_years: [],
    pricing_note: 'Configure REVENUECAT_IOS_PUBLIC_KEY for live subscription data.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: { pin?: string; action?: string; filters?: Filters };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, cors);
  }

  const pin = str(body.pin);
  const action = str(body.action);
  const filters = body.filters ?? {};

  if (!action) {
    return jsonResponse({ error: 'action is required' }, 400, cors);
  }

  const authError = await authorizeAdmin(req, pin);
  if (authError) return authError;

  const admin = adminClient();

  try {
    switch (action) {
      case 'verify_pin':
        return jsonResponse({ ok: true }, 200, cors);
      case 'overview':
        return jsonResponse(await handleOverview(admin), 200, cors);
      case 'users':
        return jsonResponse(await handleUsers(admin, filters), 200, cors);
      case 'user_detail':
        return jsonResponse(await handleUserDetail(admin, filters), 200, cors);
      case 'bookings':
        return jsonResponse(await handleBookings(admin, filters), 200, cors);
      case 'booking_detail':
        return jsonResponse(await handleBookingDetail(admin, filters), 200, cors);
      case 'clients':
        return jsonResponse(await handleClients(admin, filters), 200, cors);
      case 'analytics':
        return jsonResponse(await handleAnalytics(admin), 200, cors);
      case 'inquiries':
        return jsonResponse(await handleInquiries(admin, filters), 200, cors);
      case 'reviews':
        return jsonResponse(await handleReviews(admin), 200, cors);
      case 'onboarding':
        return jsonResponse(await handleOnboarding(admin), 200, cors);
      case 'cancellations':
        return jsonResponse(await handleCancellations(admin), 200, cors);
      case 'styld_revenue':
        return jsonResponse(await handleStyldRevenue(admin, filters), 200, cors);
      case 'emails':
        return jsonResponse({ emails: [] }, 200, cors);
      case 'export':
        if (filters.type === 'onboarding') return jsonResponse(await handleOnboarding(admin), 200, cors);
        return jsonResponse(await handleBookings(admin, { ...filters, limit: 1000 }), 200, cors);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, cors);
    }
  } catch (err) {
    console.error('[styld-admin-dashboard]', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Server error' }, 500, cors);
  }
});
