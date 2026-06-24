import { ServiceVenue } from './serviceCatalog';

export type StyleAddon = {
  id: string;
  name: string;
  price: number;
};

export type StyleMetaEntry = {
  title: string;
  description: string;
  category: string;
  durationMinutes?: number;
  addons?: StyleAddon[];
};

export const DEFAULT_STYLE_DURATION_MINUTES = 120;

export const STYLE_DURATION_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 90, label: '1.5 hrs' },
  { minutes: 120, label: '2 hrs' },
  { minutes: 150, label: '2.5 hrs' },
  { minutes: 180, label: '3 hrs' },
  { minutes: 240, label: '4 hrs' },
  { minutes: 300, label: '5 hrs' },
  { minutes: 360, label: '6 hrs' },
];

export function normalizeStyleDurationMinutes(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_STYLE_DURATION_MINUTES;
  return Math.min(720, Math.max(15, Math.round(parsed)));
}

export function formatStyleDuration(minutes: number): string {
  const mins = normalizeStyleDurationMinutes(minutes);
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours <= 0) return `${remainder} min`;
  if (remainder === 0) return hours === 1 ? '1 hr' : `${hours} hrs`;
  if (hours === 1) return `1 hr ${remainder} min`;
  return `${hours} hrs ${remainder} min`;
}

export type StyleCatalogMeta = Record<string, StyleMetaEntry>;

export const DEFAULT_STYLE_CATEGORY = 'SERVICES';

export function normalizeStyleMeta(value: unknown): StyleCatalogMeta {
  if (!value || typeof value !== 'object') return {};

  const result: StyleCatalogMeta = {};
  for (const [styleId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    if (!title) continue;

    const durationRaw = entry.durationMinutes ?? entry.duration_minutes;
    const addons = normalizeStyleAddons(entry.addons);
    result[styleId] = {
      title,
      description: typeof entry.description === 'string' ? entry.description.trim() : '',
      category:
        typeof entry.category === 'string' && entry.category.trim()
          ? entry.category.trim()
          : DEFAULT_STYLE_CATEGORY,
      durationMinutes: normalizeStyleDurationMinutes(durationRaw),
      ...(addons.length ? { addons } : {}),
    };
  }
  return result;
}

export function createStyleId(title: string, venue: ServiceVenue = 'studio'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  const suffix = Date.now().toString(36).slice(-4);
  return `${venue}-${slug || 'style'}-${suffix}`;
}

export function normalizeStyleAddons(value: unknown): StyleAddon[] {
  if (!Array.isArray(value)) return [];
  const result: StyleAddon[] = [];
  value.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const entry = raw as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) return;
    const priceRaw = typeof entry.price === 'number' ? entry.price : Number(entry.price);
    const price = Number.isFinite(priceRaw) ? Math.max(0, priceRaw) : 0;
    const id =
      typeof entry.id === 'string' && entry.id.trim()
        ? entry.id.trim()
        : `addon-${index + 1}`;
    result.push({ id, name, price });
  });
  return result;
}

export function createStyleAddonId(): string {
  return `addon-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
}

/** Rows the user started but did not name — blocked on explicit save. */
export function getIncompleteStyleAddons(addons: StyleAddon[]): StyleAddon[] {
  return addons.filter((addon) => !addon.name.trim());
}

export function getStylePriceBounds(
  basePrice: number,
  addons?: StyleAddon[],
): { min: number; max: number } {
  const base = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0;
  const pricedAddons = (addons ?? []).map((addon) => addon.price).filter((price) => price > 0);
  if (!pricedAddons.length) {
    return { min: base, max: base };
  }
  return { min: base, max: base + Math.max(...pricedAddons) };
}

export function formatStylePrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return 'Price TBD';
  return `$${Math.round(price)}`;
}

export function formatStylePriceRange(basePrice: number, addons?: StyleAddon[]): string {
  const { min, max } = getStylePriceBounds(basePrice, addons);
  if (max <= 0) return 'Price TBD';
  if (!addons?.length || min === max) return formatStylePrice(min);
  return `$${Math.round(min)}–$${Math.round(max)}`;
}
