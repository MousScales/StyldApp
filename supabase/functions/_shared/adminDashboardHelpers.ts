/** Shared helpers for styld-admin-dashboard edge function. */

export type Json = Record<string, unknown>;

export function jsonResponse(body: unknown, status = 200, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function settingValue(data: unknown): unknown {
  if (data && typeof data === 'object' && 'value' in (data as Json)) {
    return (data as { value: unknown }).value;
  }
  return data;
}

const HERO_LAYOUT_LABELS: Record<string, string> = {
  banner: 'Header photo',
  split: 'Header photo (legacy)',
  stack: 'Stack collage',
  cover: 'Full screen',
  'image-below': 'Header photo (legacy)',
  minimal: 'No photo',
};

export function heroLayoutLabel(layout: string | undefined): string {
  return HERO_LAYOUT_LABELS[layout ?? ''] ?? layout ?? 'Unknown';
}

export function paymentModeLabel(mode: string | undefined): string {
  switch (mode) {
    case 'full':
      return 'Pay full online';
    case 'deposit':
      return 'Deposit online';
    case 'in_person':
      return 'Pay in person';
    case 'none':
      return 'No online payment';
    default:
      return mode ?? 'Unknown';
  }
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseSiteSettings(rows: { record_key: string | null; data: unknown }[]) {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.record_key) continue;
    out[row.record_key] = settingValue(row.data);
  }
  return out;
}

export function buildSiteThemeSummary(theme: Json) {
  const stackPaths = Array.isArray(theme.heroStackImagePaths) ? theme.heroStackImagePaths : [];
  const textColors = theme.textColors && typeof theme.textColors === 'object' ? theme.textColors : {};
  return {
    hero_layout: str(theme.heroLayout) || 'banner',
    hero_layout_label: heroLayoutLabel(str(theme.heroLayout)),
    hero_stack_format: theme.heroStackImageFormat === 'tall' ? 'tall' : 'wide',
    hero_stack_image_count: stackPaths.length,
    hero_cover_blur: theme.heroCoverBlur === true,
    style_card_layout: str(theme.styleCardLayout) || 'card',
    hide_book_now_button: theme.hideBookNowButton === true,
    font_family: str(theme.fontFamily) || 'cormorant',
    primary_color: str(theme.primaryColor) || null,
    secondary_color: str(theme.secondaryColor) || null,
    background_color: str(theme.backgroundColor) || null,
    navbar_color: str(theme.navbarColor) || null,
    custom_text_colors: Object.keys(textColors as object).length,
    has_logo: !!str(theme.logoImagePath),
    has_hero_image: !!str(theme.heroImagePath),
  };
}

export function buildSiteContentSummary(content: Json) {
  const hidden = Array.isArray(content.hiddenSections) ? content.hiddenSections : [];
  const hiddenLoc = Array.isArray(content.hiddenLocationParts) ? content.hiddenLocationParts : [];
  return {
    menu_title: str(content.menuTitle) || null,
    menu_blurb: str(content.menuBlurb) || null,
    tagline_left: str(content.taglineLeft) || null,
    tagline_right_line1: str(content.taglineRightLine1) || null,
    tagline_right_line2: str(content.taglineRightLine2) || null,
    has_about: !!str(content.heroDescription),
    has_policies: !!str(content.policiesText) || (Array.isArray(content.policyItems) && content.policyItems.length > 0),
    hidden_sections: hidden,
    hidden_location_parts: hiddenLoc,
    instagram_handle: str(content.instagramHandle) || null,
    phone_display: str(content.phoneDisplay) || null,
    email: str(content.email) || null,
  };
}

export function buildStyleCatalog(
  meta: Record<string, Json> | undefined,
  prices: Record<string, number> | undefined,
) {
  if (!meta) return [];
  return Object.entries(meta).map(([id, entry]) => {
    const addons = Array.isArray(entry.addons) ? entry.addons : [];
    const base = num(prices?.[id], 0);
    const addonPrices = addons.map((a) => num((a as Json).price, 0)).filter((p) => p > 0);
    const maxPrice = addonPrices.length ? Math.max(...addonPrices, base) : base;
    return {
      id,
      title: str(entry.title) || id,
      duration_minutes: num(entry.durationMinutes, 60),
      category: str(entry.category) || 'General',
      base_price: base,
      addon_count: addons.length,
      addons: addons.map((a) => ({
        id: str((a as Json).id),
        name: str((a as Json).name),
        price: num((a as Json).price, 0),
      })),
      price_label: maxPrice > base ? `$${base}–$${maxPrice}` : `$${base}`,
      description: str(entry.description) || null,
    };
  });
}

export function flattenBooking(row: {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  data: Json;
}, salonMeta?: { brand_name?: string; subdomain?: string | null }) {
  const d = row.data ?? {};
  const estimated = num(d.estimated_total, 0);
  const addonPrice = num(d.selected_addon_price, 0);
  return {
    row_id: row.id,
    user_id: row.user_id,
    id: str(d.id) || row.id,
    full_name: str(d.full_name),
    email: str(d.email),
    phone: str(d.phone),
    style_id: str(d.style_id),
    style_name: str(d.style_name),
    selected_addon_id: str(d.selected_addon_id) || null,
    selected_addon_name: str(d.selected_addon_name) || null,
    selected_addon_price: addonPrice || null,
    service_base_price: addonPrice > 0 ? Math.max(0, estimated - addonPrice) : estimated,
    appointment_starts_at: str(d.appointment_starts_at) || null,
    appointment_date: str(d.appointment_date) || null,
    appointment_slot: str(d.appointment_slot) || null,
    duration_minutes: num(d.duration_minutes, 0),
    service_address: str(d.service_address) || null,
    estimated_total: estimated,
    deposit_amount: num(d.deposit_amount, 0),
    booking_status: str(d.booking_status) || 'pending',
    payment_status: str(d.payment_status) || 'none',
    stripe_payment_intent_id: str(d.stripe_payment_intent_id) || null,
    photo_hair_path: str(d.photo_hair_path) || str(d.current_hair_photo_path) || null,
    photo_ref_path: str(d.photo_ref_path) || str(d.reference_photo_path) || null,
    notes: str(d.notes) || null,
    source: str(d.source) || null,
    refund_status: str(d.refund_status) || null,
    refund_amount_cents: num(d.refund_amount_cents, 0) || null,
    brand_name: salonMeta?.brand_name ?? null,
    subdomain: salonMeta?.subdomain ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function aggregateClients(bookings: ReturnType<typeof flattenBooking>[]) {
  const map = new Map<string, Json>();
  for (const b of bookings) {
    const key = `${b.user_id}:${(b.email || b.phone || b.full_name).toLowerCase()}`;
    const existing = map.get(key);
    const spend = num(b.estimated_total, 0);
    const collected =
      ['paid', 'deposit_paid'].includes(String(b.payment_status).toLowerCase()) ? spend : 0;
    if (!existing) {
      map.set(key, {
        user_id: b.user_id,
        client_name: b.full_name,
        email: b.email,
        phone: b.phone,
        booking_count: 1,
        last_booking_at: b.appointment_starts_at ?? b.created_at,
        total_spend: spend,
        collected_spend: collected,
        brand_name: b.brand_name,
        subdomain: b.subdomain,
      });
      continue;
    }
    existing.booking_count = num(existing.booking_count, 0) + 1;
    existing.total_spend = num(existing.total_spend, 0) + spend;
    existing.collected_spend = num(existing.collected_spend, 0) + collected;
    const last = str(existing.last_booking_at);
    const candidate = b.appointment_starts_at ?? b.created_at;
    if (candidate > last) existing.last_booking_at = candidate;
  }
  return [...map.values()];
}
