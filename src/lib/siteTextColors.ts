import {
  SiteColorSource,
  SiteTextColorKey,
  SiteTextColorSources,
  SiteTextColors,
  SiteTheme,
} from '../data/siteTheme';

export const ALL_SITE_TEXT_COLOR_KEYS: SiteTextColorKey[] = [
  'heading',
  'body',
  'muted',
  'serviceName',
  'price',
  'accent',
  'link',
  'nav',
  'navButton',
  'navButtonBg',
  'splashBrand',
  'splashButton',
  'splashButtonBg',
];

export const TEXT_COLOR_CSS_VARS: Record<SiteTextColorKey, string> = {
  heading: '--text-heading',
  body: '--text-body',
  muted: '--text-muted',
  serviceName: '--text-service-name',
  price: '--text-price',
  accent: '--text-accent',
  link: '--text-link',
  nav: '--text-nav',
  navButton: '--text-nav-button',
  navButtonBg: '--text-nav-button-bg',
  splashBrand: '--text-splash-brand',
  splashButton: '--text-splash-button',
  splashButtonBg: '--text-splash-button-bg',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeSiteTextColors(value: unknown): SiteTextColors {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const result: SiteTextColors = {};
  ALL_SITE_TEXT_COLOR_KEYS.forEach((key) => {
    const raw = source[key];
    if (typeof raw === 'string' && HEX_RE.test(raw.trim())) {
      result[key] = raw.trim();
    }
  });
  return result;
}

export function resolveThemePaletteColor(source: Exclude<SiteColorSource, 'custom'>, theme: SiteTheme): string {
  switch (source) {
    case 'accent':
      return theme.primaryColor;
    case 'text':
      return theme.secondaryColor;
    case 'background':
      return theme.backgroundColor ?? '#fafafa';
    case 'navbar':
      return theme.navbarColor ?? '#ffffff';
    default:
      return theme.secondaryColor;
  }
}

export function getSiteTextColorDefault(key: SiteTextColorKey, theme: SiteTheme): string {
  switch (key) {
    case 'heading':
    case 'serviceName':
    case 'price':
      return theme.secondaryColor;
    case 'body':
    case 'muted':
      return theme.secondaryColor;
    case 'accent':
    case 'link':
    case 'navButton':
      return theme.primaryColor;
    case 'nav':
      return theme.secondaryColor;
    case 'navButtonBg':
      return theme.secondaryColor;
    case 'splashBrand':
      return '#ffffff';
    case 'splashButton':
      return theme.secondaryColor;
    case 'splashButtonBg':
      return '#ffffff';
    default:
      return theme.secondaryColor;
  }
}

export function getSiteTextColorSource(
  key: SiteTextColorKey,
  theme: Pick<SiteTheme, 'textColorSources' | 'textColors'>,
): SiteColorSource | null {
  const linked = theme.textColorSources?.[key];
  if (linked && linked !== 'custom') return linked;
  if (theme.textColors?.[key] && HEX_RE.test(theme.textColors[key]!)) return 'custom';
  return null;
}

export function resolveSiteTextColor(key: SiteTextColorKey, theme: SiteTheme): string {
  const linked = theme.textColorSources?.[key];
  if (linked && linked !== 'custom') {
    return resolveThemePaletteColor(linked, theme);
  }
  const custom = theme.textColors?.[key];
  if (custom && HEX_RE.test(custom)) return custom;
  return getSiteTextColorDefault(key, theme);
}

export function resolveSiteTextColors(theme: SiteTheme): SiteTextColors {
  const result: SiteTextColors = {};
  ALL_SITE_TEXT_COLOR_KEYS.forEach((key) => {
    result[key] = resolveSiteTextColor(key, theme);
  });
  return result;
}

export function buildTextColorsCssDeclarations(textColors: SiteTextColors | undefined): string {
  if (!textColors) return '';
  const parts: string[] = [];
  ALL_SITE_TEXT_COLOR_KEYS.forEach((key) => {
    const value = textColors[key];
    if (value && HEX_RE.test(value)) {
      parts.push(`${TEXT_COLOR_CSS_VARS[key]}:${value}`);
    }
  });
  if (textColors.nav && HEX_RE.test(textColors.nav)) {
    parts.push(`--nav-text:${textColors.nav}`);
  }
  return parts.length ? `${parts.join(';')};` : '';
}

export function buildTextColorsCssFromTheme(theme: SiteTheme): string {
  return buildTextColorsCssDeclarations(resolveSiteTextColors(theme));
}

export function applyTextColorsToRoot(
  root: { style: { setProperty: (name: string, value: string) => void } },
  textColors: SiteTextColors | undefined,
): void {
  if (!textColors) return;
  ALL_SITE_TEXT_COLOR_KEYS.forEach((key) => {
    const value = textColors[key];
    if (value && HEX_RE.test(value)) {
      root.style.setProperty(TEXT_COLOR_CSS_VARS[key], value);
    }
  });
  if (textColors.nav && HEX_RE.test(textColors.nav)) {
    root.style.setProperty('--nav-text', textColors.nav);
  }
}

export function applyTextColorsFromThemeToRoot(
  root: { style: { setProperty: (name: string, value: string) => void } },
  theme: SiteTheme,
): void {
  applyTextColorsToRoot(root, resolveSiteTextColors(theme));
}
