import {
  DEFAULT_HERO_IMAGE_FOCUS,
  HeroImageFocus,
  legacyPositionFromFocus,
  normalizeHeroImageFocus,
  normalizeStackImageFocusList,
} from '../lib/heroImageFocus';
import { normalizeSiteTextColors, ALL_SITE_TEXT_COLOR_KEYS } from '../lib/siteTextColors';

export type HeroLayout = 'banner' | 'stack' | 'cover' | 'minimal';

/** Legacy `split` / `image-below` values map to `banner` (header photo only — content in main). */
export function normalizeHeroLayout(value: unknown): HeroLayout {
  if (value === 'stack' || value === 'cover' || value === 'minimal' || value === 'banner') {
    return value;
  }
  if (value === 'split' || value === 'image-below') return 'banner';
  return DEFAULT_SITE_THEME.heroLayout;
}
export type StyleCardLayout = 'card' | 'outlined';
export type FontFamily = 'cormorant' | 'inter' | 'playfair' | 'dm-sans' | 'montserrat' | 'poppins' | 'lora' | 'nunito';
export type TemplateId = 'profile';

export type HeroImagePosition = 'center top' | 'center center' | 'center bottom';

/** Wide 3:1 banners vs tall 4:9 portrait frames in stack hero layout. */
export type HeroStackImageFormat = 'wide' | 'tall';

export const HERO_STACK_IMAGE_FORMAT_OPTIONS: {
  id: HeroStackImageFormat;
  label: string;
  desc: string;
  sizeHint: string;
  aspectRatio: number;
}[] = [
  {
    id: 'wide',
    label: 'Wide banner',
    desc: '3:1 landscape',
    sizeHint: '1200 × 400 px',
    aspectRatio: 3,
  },
  {
    id: 'tall',
    label: 'Tall portrait',
    desc: '4:9 portrait',
    sizeHint: '400 × 900 px',
    aspectRatio: 4 / 9,
  },
];

export function normalizeHeroStackImageFormat(value: unknown): HeroStackImageFormat {
  return value === 'tall' ? 'tall' : 'wide';
}

export function getHeroStackAspectRatio(format: HeroStackImageFormat = 'wide'): number {
  return format === 'tall' ? 4 / 9 : 3;
}

export type SiteTextColorKey =
  | 'heading'
  | 'body'
  | 'muted'
  | 'serviceName'
  | 'price'
  | 'accent'
  | 'link'
  | 'nav'
  | 'navButton'
  | 'navButtonBg'
  | 'splashBrand'
  | 'splashButton'
  | 'splashButtonBg';

export type SiteTextColors = Partial<Record<SiteTextColorKey, string>>;

/** Link a site element color to a brand palette color (updates when palette changes). */
export type SiteColorSource = 'accent' | 'text' | 'background' | 'navbar' | 'custom';

export type SiteTextColorGroupId = 'bookNow' | 'topBar' | 'splashTitle' | 'pageText' | 'servicesMenu';

export type SiteTextColorField = {
  key: SiteTextColorKey;
  label: string;
  hint: string;
  group: SiteTextColorGroupId;
  /** Shown only when heroLayout is cover (full-screen splash). */
  coverOnly?: boolean;
  /** Optional subsection label inside a group (e.g. nav vs splash Book Now). */
  subGroup?: string;
};

export const SITE_COLOR_SOURCE_LABELS: Record<Exclude<SiteColorSource, 'custom'>, string> = {
  accent: 'Brand accent',
  text: 'Main text',
  background: 'Page background',
  navbar: 'Top bar background',
};

export const SITE_TEXT_COLOR_GROUPS: {
  id: SiteTextColorGroupId;
  title: string;
  description: string;
  coverOnly?: boolean;
}[] = [
  {
    id: 'bookNow',
    title: 'Book Now button',
    description: 'Colors for booking buttons in the top bar and on your full-screen splash.',
  },
  {
    id: 'topBar',
    title: 'Top bar',
    description: 'Your logo and business name on menu and book pages.',
  },
  {
    id: 'splashTitle',
    title: 'Splash screen',
    description: 'Large business name centered on your cover photo.',
    coverOnly: true,
  },
  {
    id: 'pageText',
    title: 'Page text',
    description: 'Headings, paragraphs, and links on your about and book pages.',
  },
  {
    id: 'servicesMenu',
    title: 'Services menu',
    description: 'Service cards, prices, and category filter tabs.',
  },
];

export const SITE_TEXT_COLOR_FIELDS: SiteTextColorField[] = [
  {
    key: 'navButton',
    label: 'Button text',
    hint: 'Label on the Book Now in your top bar (menu & book pages)',
    group: 'bookNow',
    subGroup: 'Top bar button',
  },
  {
    key: 'navButtonBg',
    label: 'Button background',
    hint: 'Fill color behind the top bar Book Now',
    group: 'bookNow',
    subGroup: 'Top bar button',
  },
  {
    key: 'splashButton',
    label: 'Button text',
    hint: 'Label on the centered Book Now over your cover photo',
    group: 'bookNow',
    subGroup: 'Splash button',
    coverOnly: true,
  },
  {
    key: 'splashButtonBg',
    label: 'Button background',
    hint: 'Fill color behind the centered splash Book Now',
    group: 'bookNow',
    subGroup: 'Splash button',
    coverOnly: true,
  },
  {
    key: 'nav',
    label: 'Business name',
    hint: 'Logo and name in the top bar',
    group: 'topBar',
  },
  {
    key: 'splashBrand',
    label: 'Splash name',
    hint: 'Large name centered on your full-screen cover photo',
    group: 'splashTitle',
    coverOnly: true,
  },
  {
    key: 'heading',
    label: 'Section headings',
    hint: 'About, Menu, Policies, and Location titles',
    group: 'pageText',
  },
  {
    key: 'body',
    label: 'Body text',
    hint: 'Bio paragraphs and policy bullets',
    group: 'pageText',
  },
  {
    key: 'muted',
    label: 'Secondary text',
    hint: 'Menu blurbs, durations, and fine print',
    group: 'pageText',
  },
  {
    key: 'link',
    label: 'Links',
    hint: 'Address, email, and social links',
    group: 'pageText',
  },
  {
    key: 'serviceName',
    label: 'Service names',
    hint: 'Title on each menu card',
    group: 'servicesMenu',
  },
  {
    key: 'price',
    label: 'Prices',
    hint: 'Price on each menu card',
    group: 'servicesMenu',
  },
  {
    key: 'accent',
    label: 'Highlights',
    hint: 'Category tabs and heading underlines',
    group: 'servicesMenu',
  },
];

export type SiteTextColorSources = Partial<Record<SiteTextColorKey, SiteColorSource>>;

export type PortfolioMediaType = 'image' | 'video';

export type PortfolioMediaItem = {
  storagePath: string;
  mediaType: PortfolioMediaType;
};

export type CertificationMediaItem = {
  storagePath: string;
  mediaType: PortfolioMediaType;
  /** Optional subtitle shown under the image (issuer, license name, etc.) */
  caption?: string;
};

export const MAX_PORTFOLIO_ITEMS = 24;
export const MAX_CERTIFICATION_ITEMS = 24;

export function normalizePortfolioItems(source: Record<string, unknown>): PortfolioMediaItem[] {
  if (Array.isArray(source.portfolioItems)) {
    return (source.portfolioItems as unknown[])
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        if (typeof row.storagePath !== 'string' || !row.storagePath.trim()) return null;
        return {
          storagePath: row.storagePath.trim(),
          mediaType: row.mediaType === 'video' ? ('video' as const) : ('image' as const),
        };
      })
      .filter((item): item is PortfolioMediaItem => item !== null)
      .slice(0, MAX_PORTFOLIO_ITEMS);
  }

  if (Array.isArray(source.galleryImagePaths)) {
    return (source.galleryImagePaths as unknown[])
      .filter((path): path is string => typeof path === 'string' && path.trim().length > 0)
      .map((storagePath) => ({
        storagePath: storagePath.trim(),
        mediaType: 'image' as const,
      }))
      .slice(0, MAX_PORTFOLIO_ITEMS);
  }

  return [];
}

export function normalizeCertificationItems(source: Record<string, unknown>): CertificationMediaItem[] {
  if (!Array.isArray(source.certificationItems)) return [];

  return (source.certificationItems as unknown[])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      if (typeof row.storagePath !== 'string' || !row.storagePath.trim()) return null;
      const caption = typeof row.caption === 'string' ? row.caption : '';
      return {
        storagePath: row.storagePath.trim(),
        mediaType: row.mediaType === 'video' ? ('video' as const) : ('image' as const),
        caption,
      };
    })
    .filter((item): item is CertificationMediaItem => item !== null)
    .slice(0, MAX_CERTIFICATION_ITEMS);
}

export type SiteTheme = {
  heroLayout: HeroLayout;
  heroImagePath: string | null;
  logoImagePath: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string | null;
  navbarColor: string | null;
  heroImagePosition: HeroImagePosition;
  heroImageFocusX: number;
  heroImageFocusY: number;
  heroStackImagePaths: string[];
  heroStackImageFocus: HeroImageFocus[];
  heroStackImageFormat: HeroStackImageFormat;
  styleCardLayout: StyleCardLayout;
  cardOutlineColor: string | null;
  fontFamily: FontFamily;
  templateId: TemplateId;
  hideBookNowButton: boolean;
  /** Soft blur on the full-screen cover splash background image. */
  heroCoverBlur: boolean;
  /** When false, the portrait header photo is hidden (banner layout). Cover splash can still use the image. */
  heroPhotoEnabled: boolean;
  /** Optional per-element text color overrides (hex). Used when textColorSources[key] is custom or unset. */
  textColors: SiteTextColors;
  /** Link element colors to brand palette colors so they stay in sync. */
  textColorSources: SiteTextColorSources;
  /** Photos and videos shown in the Previous work section on the booking site. */
  portfolioItems: PortfolioMediaItem[];
  /** License and certification images on /certifications. */
  certificationItems: CertificationMediaItem[];
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  heroLayout: 'banner',
  heroImagePath: null,
  logoImagePath: null,
  primaryColor: '#db2777',
  secondaryColor: '#0a0a0a',
  backgroundColor: null,
  navbarColor: null,
  heroImagePosition: 'center top',
  heroImageFocusX: DEFAULT_HERO_IMAGE_FOCUS.x,
  heroImageFocusY: DEFAULT_HERO_IMAGE_FOCUS.y,
  heroStackImagePaths: [],
  heroStackImageFocus: [],
  heroStackImageFormat: 'wide',
  styleCardLayout: 'card',
  cardOutlineColor: null,
  fontFamily: 'cormorant',
  templateId: 'profile',
  hideBookNowButton: false,
  heroCoverBlur: false,
  heroPhotoEnabled: true,
  textColors: {},
  textColorSources: {},
  portfolioItems: [],
  certificationItems: [],
};

export type FontFamilyOption = {
  id: FontFamily;
  label: string;
  css: string;
  bodyCss: string;
  style: 'serif' | 'sans-serif';
  sampleText: string;
};

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  { id: 'cormorant', label: 'Cormorant', css: '"Cormorant Garamond", Georgia, serif', bodyCss: '"Source Sans 3", system-ui, sans-serif', style: 'serif', sampleText: 'Elegant & refined' },
  { id: 'playfair', label: 'Playfair', css: '"Playfair Display", Georgia, serif', bodyCss: '"Source Sans 3", system-ui, sans-serif', style: 'serif', sampleText: 'Bold & sophisticated' },
  { id: 'lora', label: 'Lora', css: '"Lora", Georgia, serif', bodyCss: '"Source Sans 3", system-ui, sans-serif', style: 'serif', sampleText: 'Warm & editorial' },
  { id: 'inter', label: 'Inter', css: 'Inter, system-ui, sans-serif', bodyCss: 'Inter, system-ui, sans-serif', style: 'sans-serif', sampleText: 'Clean & modern' },
  { id: 'dm-sans', label: 'DM Sans', css: '"DM Sans", system-ui, sans-serif', bodyCss: '"DM Sans", system-ui, sans-serif', style: 'sans-serif', sampleText: 'Friendly & readable' },
  { id: 'poppins', label: 'Poppins', css: 'Poppins, system-ui, sans-serif', bodyCss: 'Poppins, system-ui, sans-serif', style: 'sans-serif', sampleText: 'Geometric & stylish' },
  { id: 'nunito', label: 'Nunito', css: '"Nunito", system-ui, sans-serif', bodyCss: '"Nunito", system-ui, sans-serif', style: 'sans-serif', sampleText: 'Rounded & approachable' },
  { id: 'montserrat', label: 'Montserrat', css: 'Montserrat, system-ui, sans-serif', bodyCss: 'Montserrat, system-ui, sans-serif', style: 'sans-serif', sampleText: 'Sharp & professional' },
];

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500' +
  '&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700' +
  '&family=Inter:wght@400;500;600;700' +
  '&family=Lora:ital,wght@0,500;0,600;0,700;1,500' +
  '&family=Montserrat:wght@400;500;600;700' +
  '&family=Nunito:wght@400;500;600;700' +
  '&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500' +
  '&family=Poppins:wght@400;500;600;700' +
  '&family=Source+Sans+3:wght@400;600;700' +
  '&display=swap';

export type HeroLayoutOption = {
  id: HeroLayout;
  title: string;
  description: string;
};

export const HERO_LAYOUT_OPTIONS: HeroLayoutOption[] = [
  {
    id: 'banner',
    title: 'Header photo',
    description: 'Portrait photo on top — About Me, Policies, and menu scroll below as separate sections.',
  },
  {
    id: 'stack',
    title: 'Photo collage',
    description: 'Wide or tall banner images at the top, then your page sections below.',
  },
  {
    id: 'minimal',
    title: 'No photo',
    description: 'No header image — About Me, Policies, and menu only.',
  },
  {
    id: 'cover',
    title: 'Full screen',
    description: 'Full-screen splash with your name — Book Now opens a separate page with about, policies & menu.',
  },
];

function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeSiteTheme(value: unknown): SiteTheme {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const heroLayout = normalizeHeroLayout(source.heroLayout);

  const validFontIds: FontFamily[] = ['cormorant', 'inter', 'playfair', 'dm-sans', 'montserrat', 'poppins', 'lora', 'nunito'];

  const heroImagePosition: HeroImagePosition =
    source.heroImagePosition === 'center center' || source.heroImagePosition === 'center bottom'
      ? (source.heroImagePosition as HeroImagePosition)
      : DEFAULT_SITE_THEME.heroImagePosition;

  const heroStackImagePaths = Array.isArray(source.heroStackImagePaths)
    ? (source.heroStackImagePaths as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : [];

  const heroFocus = normalizeHeroImageFocus(
    source.heroImageFocusX,
    source.heroImageFocusY,
    heroImagePosition,
  );

  return {
    heroLayout,
    heroImagePath:
      typeof source.heroImagePath === 'string' && source.heroImagePath.trim()
        ? source.heroImagePath.trim()
        : null,
    logoImagePath:
      typeof source.logoImagePath === 'string' && source.logoImagePath.trim()
        ? source.logoImagePath.trim()
        : null,
    primaryColor: isValidHexColor(source.primaryColor)
      ? source.primaryColor.trim()
      : DEFAULT_SITE_THEME.primaryColor,
    secondaryColor: isValidHexColor(source.secondaryColor)
      ? source.secondaryColor.trim()
      : DEFAULT_SITE_THEME.secondaryColor,
    backgroundColor: isValidHexColor(source.backgroundColor)
      ? (source.backgroundColor as string).trim()
      : null,
    navbarColor: isValidHexColor(source.navbarColor)
      ? (source.navbarColor as string).trim()
      : null,
    styleCardLayout:
      source.styleCardLayout === 'outlined'
        ? 'outlined'
        : DEFAULT_SITE_THEME.styleCardLayout,
    cardOutlineColor: isValidHexColor(source.cardOutlineColor)
      ? (source.cardOutlineColor as string).trim()
      : null,
    fontFamily: validFontIds.includes(source.fontFamily as FontFamily)
      ? (source.fontFamily as FontFamily)
      : DEFAULT_SITE_THEME.fontFamily,
    heroImagePosition: legacyPositionFromFocus(heroFocus),
    heroImageFocusX: heroFocus.x,
    heroImageFocusY: heroFocus.y,
    heroStackImagePaths,
    heroStackImageFocus: normalizeStackImageFocusList(source.heroStackImageFocus, heroStackImagePaths.length),
    heroStackImageFormat: normalizeHeroStackImageFormat(source.heroStackImageFormat),
    templateId: 'profile',
    hideBookNowButton: source.hideBookNowButton === true,
    heroCoverBlur: source.heroCoverBlur === true,
    heroPhotoEnabled: source.heroPhotoEnabled !== false,
    textColors: normalizeSiteTextColors(source.textColors),
    textColorSources: normalizeSiteTextColorSources(source.textColorSources),
    portfolioItems: normalizePortfolioItems(source),
    certificationItems: normalizeCertificationItems(source),
  };
}

export function normalizeSiteTextColorSources(value: unknown): SiteTextColorSources {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const result: SiteTextColorSources = {};
  const valid: SiteColorSource[] = ['accent', 'text', 'background', 'navbar', 'custom'];
  ALL_SITE_TEXT_COLOR_KEYS.forEach((key) => {
    const raw = source[key];
    if (typeof raw === 'string' && valid.includes(raw as SiteColorSource)) {
      result[key] = raw as SiteColorSource;
    }
  });
  return result;
}
