import type { HeroLayout } from './siteTheme';
import {
  DEFAULT_SOCIAL_LINKS,
  hasAnySocialLink,
  normalizeSocialLinks,
  type SiteSocialLinks,
} from './socialLinks';

export type SiteSection =
  | 'menu'
  | 'about'
  | 'visit'
  | 'aboutMe'
  | 'policies'
  | 'portfolio'
  | 'certifications'
  | 'products'
  | 'faq'
  | 'reviews';
export type LocationPart = 'address' | 'map' | 'contact' | 'social';
export type PortfolioPlacement = 'above_menu' | 'below_menu';
/** Page sections the stylist can reorder top to bottom. */
export type MainSiteSection =
  | 'aboutMe'
  | 'policies'
  | 'reviews'
  | 'portfolio'
  | 'menu'
  | 'faq'
  | 'visit';

export type SiteFaqItem = {
  question: string;
  answer: string;
};

export type SiteContent = {
  brandName: string;
  taglineLeft: string;
  taglineRightLine1: string;
  taglineRightLine2: string;
  heroDescription: string;
  bookingPolicy: string;
  metaDescription: string;
  reelsTitle: string;
  reelsBlurb: string;
  portfolioPlacement: PortfolioPlacement;
  mainSectionOrder: MainSiteSection[];
  menuTitle: string;
  menuBlurb: string;
  faqTitle: string;
  faqBlurb: string;
  faqItems: SiteFaqItem[];
  certificationsTitle: string;
  certificationsBlurb: string;
  productsTitle: string;
  productsBlurb: string;
  aboutTitle: string;
  aboutBody: string;
  visitTitle: string;
  visitBody: string;
  phoneDisplay: string;
  phoneTel: string;
  email: string;
  /** @deprecated Synced from socialLinks.instagram — use socialLinks instead. */
  instagramHandle: string;
  socialLinks: SiteSocialLinks;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  mapEmbedUrl: string;
  footerText: string;
  timezone: string;
  hiddenSections: SiteSection[];
  hiddenLocationParts: LocationPart[];
};

export const LOCATION_PARTS: { id: LocationPart; label: string; icon: string }[] = [
  { id: 'address', label: 'Address', icon: 'home-outline' },
  { id: 'map', label: 'Map', icon: 'map-outline' },
  { id: 'contact', label: 'Contact info', icon: 'call-outline' },
  { id: 'social', label: 'Social', icon: 'share-social-outline' },
];

export const SITE_SECTIONS: { id: SiteSection; label: string; icon: string }[] = [
  { id: 'menu', label: 'Services menu', icon: 'list-outline' },
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'visit', label: 'Visit & contact', icon: 'location-outline' },
];

export const MAIN_SITE_SECTIONS: { id: MainSiteSection; label: string; icon: string; hint?: string }[] = [
  { id: 'aboutMe', label: 'About Me', icon: 'person-circle-outline', hint: 'Content tab' },
  { id: 'policies', label: 'Policies', icon: 'document-text-outline', hint: 'Content tab' },
  { id: 'reviews', label: 'Client reviews', icon: 'star-outline', hint: 'Profile → Reviews' },
  { id: 'portfolio', label: 'Previous work', icon: 'images-outline', hint: 'Content tab' },
  { id: 'menu', label: 'Services menu', icon: 'list-outline' },
  { id: 'faq', label: 'FAQ', icon: 'help-circle-outline', hint: 'Content tab' },
  { id: 'visit', label: 'Visit & contact', icon: 'location-outline', hint: 'Content tab' },
];

const VALID_MAIN_SECTIONS: MainSiteSection[] = [
  'aboutMe',
  'policies',
  'reviews',
  'portfolio',
  'menu',
  'faq',
  'visit',
];

export function defaultMainSectionOrder(
  portfolioPlacement: PortfolioPlacement = 'above_menu',
): MainSiteSection[] {
  if (portfolioPlacement === 'below_menu') {
    return ['aboutMe', 'policies', 'reviews', 'menu', 'portfolio', 'faq', 'visit'];
  }
  return ['aboutMe', 'policies', 'reviews', 'portfolio', 'menu', 'faq', 'visit'];
}

function mergeMainSectionOrder(
  saved: MainSiteSection[],
  portfolioPlacement: PortfolioPlacement,
): MainSiteSection[] {
  const template = defaultMainSectionOrder(portfolioPlacement);
  const result = [...saved];

  for (const section of template) {
    if (result.includes(section)) continue;

    let insertAt = result.length;
    const templateIdx = template.indexOf(section);

    for (let i = templateIdx + 1; i < template.length; i += 1) {
      const nextIdx = result.indexOf(template[i]);
      if (nextIdx >= 0) {
        insertAt = nextIdx;
        break;
      }
    }

    for (let i = templateIdx - 1; i >= 0; i -= 1) {
      const prevIdx = result.indexOf(template[i]);
      if (prevIdx >= 0) {
        insertAt = prevIdx + 1;
        break;
      }
    }

    result.splice(insertAt, 0, section);
  }

  return result;
}

export function portfolioPlacementFromOrder(order: MainSiteSection[]): PortfolioPlacement {
  const portfolioIdx = order.indexOf('portfolio');
  const menuIdx = order.indexOf('menu');
  if (portfolioIdx === -1 || menuIdx === -1) return 'above_menu';
  return portfolioIdx < menuIdx ? 'above_menu' : 'below_menu';
}

export function normalizeMainSectionOrder(
  value: unknown,
  portfolioPlacement: PortfolioPlacement,
): MainSiteSection[] {
  const fallback = defaultMainSectionOrder(portfolioPlacement);
  if (!Array.isArray(value)) return fallback;

  const seen = new Set<MainSiteSection>();
  const ordered: MainSiteSection[] = [];
  for (const item of value) {
    if (
      typeof item === 'string' &&
      VALID_MAIN_SECTIONS.includes(item as MainSiteSection) &&
      !seen.has(item as MainSiteSection)
    ) {
      const section = item as MainSiteSection;
      seen.add(section);
      ordered.push(section);
    }
  }

  if (ordered.length === 0) return fallback;

  const merged = mergeMainSectionOrder(ordered, portfolioPlacement);
  return merged.length === VALID_MAIN_SECTIONS.length ? merged : fallback;
}

export function resolveMainSectionOrder(content: SiteContent): MainSiteSection[] {
  return normalizeMainSectionOrder(content.mainSectionOrder, content.portfolioPlacement);
}

export type OrderEditorLayoutContext = {
  heroLayout: HeroLayout;
  heroPhotoEnabled: boolean;
};

/** Inputs for deciding which sections appear in the Order tab (matches live/preview visibility). */
export type OrderEditorVisibilityContext = {
  hiddenSections: SiteSection[];
  reviewsEnabled: boolean;
  reviewCount: number;
  portfolioCount: number;
  heroLayout: HeroLayout;
};

export function hasFaqContent(content: SiteContent): boolean {
  return (content.faqItems ?? []).some(
    (item) => item.question?.trim() && item.answer?.trim(),
  );
}

export function hasVisitContent(content: SiteContent): boolean {
  const hiddenParts = content.hiddenLocationParts ?? [];
  const address = formatSiteAddress(content);
  const hasAddress = !hiddenParts.includes('address') && address.trim().length > 0;
  const hasContact =
    !hiddenParts.includes('contact') && !!(content.phoneDisplay?.trim() || content.email?.trim());
  const hasSocial =
    !hiddenParts.includes('social') && hasAnySocialLink(content.socialLinks);
  return hasAddress || hasContact || hasSocial;
}

/** Whether a section is shown on the live site / preview and should appear in Order. */
export function isOrderEditorSectionVisible(
  sectionId: MainSiteSection,
  content: SiteContent,
  ctx: OrderEditorVisibilityContext,
): boolean {
  if (ctx.hiddenSections.includes(sectionId)) return false;

  switch (sectionId) {
    case 'reviews':
      return ctx.reviewsEnabled && ctx.reviewCount > 0;
    case 'portfolio':
      return ctx.portfolioCount > 0;
    case 'faq':
      return hasFaqContent(content);
    case 'visit':
      return hasVisitContent(content);
    default:
      return true;
  }
}

export function filterOrderForEditor(
  order: MainSiteSection[],
  content: SiteContent,
  ctx: OrderEditorVisibilityContext,
): MainSiteSection[] {
  return order.filter((id) => isOrderEditorSectionVisible(id, content, ctx));
}

/** Apply a reorder from visible-only rows back onto the full saved order. */
export function mergeOrderEditorChange(
  previousFullOrder: MainSiteSection[],
  newVisibleOrder: MainSiteSection[],
  content: SiteContent,
  ctx: OrderEditorVisibilityContext,
): MainSiteSection[] {
  const isVisible = (id: MainSiteSection) => isOrderEditorSectionVisible(id, content, ctx);
  let visibleIndex = 0;
  const merged = previousFullOrder.map((id) => {
    if (!isVisible(id)) return id;
    return newVisibleOrder[visibleIndex++] ?? id;
  });
  while (visibleIndex < newVisibleOrder.length) {
    merged.push(newVisibleOrder[visibleIndex++]);
  }
  return normalizeMainSectionOrder(merged, portfolioPlacementFromOrder(merged));
}

export type OrderEditorRow =
  | {
      kind: 'pinned';
      id: string;
      label: string;
      blurb: string;
    }
  | {
      kind: 'section';
      sectionId: MainSiteSection;
    };

export function buildOrderEditorRows(
  order: MainSiteSection[],
  ctx: OrderEditorLayoutContext,
  options?: {
    isSectionVisible?: (sectionId: MainSiteSection) => boolean;
  },
): OrderEditorRow[] {
  const isVisible = options?.isSectionVisible ?? (() => true);
  const rows: OrderEditorRow[] = [];

  if (ctx.heroLayout === 'cover') {
    rows.push({
      kind: 'pinned',
      id: 'cover-splash',
      label: 'Full-screen splash',
      blurb: 'Fixed on home — your splash photo and brand name (Photos tab).',
    });
  }

  if (ctx.heroLayout === 'stack') {
    rows.push({
      kind: 'pinned',
      id: 'stack-banner',
      label: 'Banner images',
      blurb: 'Fixed at the top — add and reorder in Photos.',
    });
  }

  if (ctx.heroLayout === 'banner' && ctx.heroPhotoEnabled !== false) {
    rows.push({
      kind: 'pinned',
      id: 'header-photo',
      label: 'Header photo',
      blurb: 'Portrait at the top — About Me and Policies reorder separately below.',
    });
  }

  for (const sectionId of order) {
    if (!isVisible(sectionId)) continue;
    rows.push({ kind: 'section', sectionId });
  }

  return rows;
}

export function flattenOrderEditorRows(rows: OrderEditorRow[]): MainSiteSection[] {
  const result: MainSiteSection[] = [];
  for (const row of rows) {
    if (row.kind === 'section') result.push(row.sectionId);
  }
  return result;
}

export function isReorderableOrderRow(row: OrderEditorRow): boolean {
  return row.kind === 'section';
}

export function moveOrderEditorRows(
  rows: OrderEditorRow[],
  reorderableIndex: number,
  direction: 'up' | 'down',
): OrderEditorRow[] {
  const reorderableIndices = rows
    .map((row, index) => (isReorderableOrderRow(row) ? index : -1))
    .filter((index) => index >= 0);

  const from = reorderableIndices[reorderableIndex];
  const targetReorderable = direction === 'up' ? reorderableIndex - 1 : reorderableIndex + 1;
  if (from === undefined || targetReorderable < 0 || targetReorderable >= reorderableIndices.length) {
    return rows;
  }
  const to = reorderableIndices[targetReorderable];

  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brandName: 'Your brand name',
  taglineLeft: 'Put your',
  taglineRightLine1: 'style',
  taglineRightLine2: 'here',
  heroDescription: '',
  bookingPolicy: '',
  metaDescription:
    'Your brand name — put your headline here. Swap this text, images, and booking details for your business.',
  reelsTitle: 'Our work',
  reelsBlurb: 'Browse our latest styles and transformations.',
  portfolioPlacement: 'above_menu',
  mainSectionOrder: ['aboutMe', 'policies', 'reviews', 'portfolio', 'menu', 'faq', 'visit'],
  menuTitle: 'Menu',
  menuBlurb: 'Browse our services & prices — book online.',
  faqTitle: 'FAQ',
  faqBlurb: 'Common questions about booking and our services.',
  faqItems: [],
  certificationsTitle: 'Certifications',
  certificationsBlurb: 'Licenses, credentials, and professional certifications.',
  productsTitle: 'Shop',
  productsBlurb: 'Hair care and styling products available for pickup or shipping.',
  aboutTitle: 'About Me',
  aboutBody:
    'Tell clients who you are, what you specialize in, and why they should book with you.',
  visitTitle: 'Visit & connect',
  visitBody: 'Share your studio address, house-call area, or how clients can find you.',
  phoneDisplay: '',
  phoneTel: '',
  email: '',
  instagramHandle: '',
  socialLinks: { ...DEFAULT_SOCIAL_LINKS },
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  mapEmbedUrl: '',
  footerText: 'Add footer credit here',
  timezone: 'America/New_York',
  /** Certifications + shop stay off until the stylist turns them on in Profile settings. */
  hiddenSections: ['certifications', 'products'],
  hiddenLocationParts: [],
};

const VALID_SECTIONS: SiteSection[] = [
  'menu',
  'about',
  'visit',
  'aboutMe',
  'policies',
  'portfolio',
  'certifications',
  'products',
  'faq',
  'reviews',
];
const VALID_LOCATION_PARTS: LocationPart[] = ['address', 'map', 'contact', 'social'];

export function normalizeSiteContent(value: unknown): SiteContent {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const result = { ...DEFAULT_SITE_CONTENT };
  for (const key of Object.keys(DEFAULT_SITE_CONTENT) as (keyof SiteContent)[]) {
    if (
      key === 'hiddenSections' ||
      key === 'hiddenLocationParts' ||
      key === 'socialLinks' ||
      key === 'faqItems' ||
      key === 'mainSectionOrder'
    ) {
      continue;
    }
    if (typeof source[key] === 'string') {
      (result as Record<string, unknown>)[key] = source[key];
    }
  }

  if (Array.isArray(source.hiddenSections)) {
    result.hiddenSections = (source.hiddenSections as unknown[]).filter(
      (s): s is SiteSection =>
        typeof s === 'string' && s !== 'social' && VALID_SECTIONS.includes(s as SiteSection),
    );
  }

  if (Array.isArray(source.hiddenLocationParts)) {
    result.hiddenLocationParts = (source.hiddenLocationParts as unknown[]).filter(
      (p): p is LocationPart => VALID_LOCATION_PARTS.includes(p as LocationPart),
    );
  }

  if (source.portfolioPlacement === 'below_menu' || source.portfolioPlacement === 'above_menu') {
    result.portfolioPlacement = source.portfolioPlacement;
  }

  result.mainSectionOrder = normalizeMainSectionOrder(
    source.mainSectionOrder,
    result.portfolioPlacement,
  );
  result.portfolioPlacement = portfolioPlacementFromOrder(result.mainSectionOrder);

  if (Array.isArray(source.faqItems)) {
    result.faqItems = (source.faqItems as unknown[])
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        return {
          question: typeof row.question === 'string' ? row.question : '',
          answer: typeof row.answer === 'string' ? row.answer : '',
        };
      })
      .filter((item): item is SiteFaqItem => Boolean(item && (item.question.trim() || item.answer.trim())));
  }

  const legacyInstagram =
    typeof source.instagramHandle === 'string' ? source.instagramHandle : result.instagramHandle;
  result.socialLinks = normalizeSocialLinks(source.socialLinks, legacyInstagram);
  result.instagramHandle = result.socialLinks.instagram;

  return result;
}

export function formatSiteAddress(content: SiteContent): string {
  return [content.addressLine1, content.addressLine2, content.city, content.state, content.zip]
    .filter(Boolean)
    .join(', ');
}

export function buildGoogleMapsSearchUrl(address: string): string {
  const query = address.trim();
  if (!query) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Uses custom embed URL from editor, or builds one from the saved address fields. */
export function buildGoogleMapsEmbedUrl(content: SiteContent): string | null {
  const custom = content.mapEmbedUrl?.trim();
  if (custom) return custom;

  const address = formatSiteAddress(content).trim();
  if (!address) return null;

  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

export function hasSiteAddress(content: SiteContent): boolean {
  return Boolean(formatSiteAddress(content).trim());
}
