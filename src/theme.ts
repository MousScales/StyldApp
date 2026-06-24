import { BARBER_ACCENT, BrandPaletteKey, getAccentPalette, SALON_ACCENT } from './theme/brandPalettes';

/** Use these for any number/stat/monetary display to make them visually distinct. */
export const fonts = {
  number: 'SpaceGrotesk_700Bold',
  numberMedium: 'SpaceGrotesk_500Medium',
  numberLight: 'SpaceGrotesk_300Light',
};

const BASE_COLORS = {
  background: '#0a0a0a',
  text: '#f5f5f5',
  textMuted: '#a1a1aa',
  navbar: '#1c1c1e',
  navbarBorder: 'rgba(255, 255, 255, 0.08)',
  navbarActive: '#ffffff',
  navbarInactive: 'rgba(255, 255, 255, 0.45)',
  calendarSelectedDay: '#2c2c2e',
  calendarGridLine: 'rgba(255, 255, 255, 0.06)',
  eventCompleted: '#1e3a2f',
  eventCompletedBadge: '#2f6b4f',
  eventPending: '#1c1c1e',
  eventPendingBorder: 'rgba(255, 255, 255, 0.08)',
  fab: '#2c2c2e',
  accentOrange: '#e8872a',
  accentOrangeBadge: '#3d2a18',
  accentGold: '#f5b942',
  card: '#141414',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  progressTrack: '#2a2a2a',
  notificationBadge: '#ef4444',
  chartTan: '#c9956b',
} as const;

export type AppColors = typeof BASE_COLORS & typeof SALON_ACCENT;

function buildColors(palette: BrandPaletteKey): AppColors {
  return { ...BASE_COLORS, ...getAccentPalette(palette) };
}

export function getBrandColors(palette: BrandPaletteKey): AppColors {
  return buildColors(palette);
}

/** Mutable theme colors — updated in place when brand palette changes. */
export const colors: AppColors = buildColors('salon');

export function applyBrandPalette(palette: BrandPaletteKey): void {
  Object.assign(colors, buildColors(palette));
}

export { BARBER_ACCENT, SALON_ACCENT };
export { LAYOUT_BASE, makeScaleFns, getWidthScale, getHeightScale } from './theme/layout';
