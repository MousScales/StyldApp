/** Salon (default) accent values — also used as substitution keys in static styles. */
export const SALON_ACCENT = {
  accentPink: '#fc61a3',
  accentPinkDeep: '#ee5690',
  accentPinkMuted: 'rgba(252, 97, 163, 0.15)',
  accentPinkSoft: 'rgba(252, 97, 163, 0.14)',
  accentPinkBorder: 'rgba(252, 97, 163, 0.28)',
  accentPinkGlow: 'rgba(252, 97, 163, 0.35)',
  accentPinkRing: 'rgba(252, 97, 163, 0.35)',
  activeGlow: 'rgba(252, 97, 163, 0.45)',
  accentBlue: '#fc61a3',
  accentBlueMuted: 'rgba(252, 97, 163, 0.15)',
  chartBlue: '#fc61a3',
  profileBlue: '#fc61a3',
  screenGradientMid: '#120a0f',
  screenGradientEnd: '#1a0d14',
  subtleTintBg: 'rgba(252, 97, 163, 0.08)',
  subtleTintBgStrong: 'rgba(252, 97, 163, 0.12)',
} as const;

/** Barber accent — black + blue palette. */
export const BARBER_ACCENT = {
  accentPink: '#3b82f6',
  accentPinkDeep: '#2563eb',
  accentPinkMuted: 'rgba(59, 130, 246, 0.15)',
  accentPinkSoft: 'rgba(59, 130, 246, 0.14)',
  accentPinkBorder: 'rgba(59, 130, 246, 0.28)',
  accentPinkGlow: 'rgba(59, 130, 246, 0.35)',
  accentPinkRing: 'rgba(59, 130, 246, 0.35)',
  activeGlow: 'rgba(59, 130, 246, 0.45)',
  accentBlue: '#3b82f6',
  accentBlueMuted: 'rgba(59, 130, 246, 0.15)',
  chartBlue: '#3b82f6',
  profileBlue: '#3b82f6',
  screenGradientMid: '#0a1018',
  screenGradientEnd: '#0d1219',
  subtleTintBg: 'rgba(59, 130, 246, 0.08)',
  subtleTintBgStrong: 'rgba(59, 130, 246, 0.12)',
} as const;

/** Makeup artist — warm mauve / glam palette. */
export const MAKEUP_ACCENT = {
  accentPink: '#d946ef',
  accentPinkDeep: '#c026d3',
  accentPinkMuted: 'rgba(217, 70, 239, 0.15)',
  accentPinkSoft: 'rgba(217, 70, 239, 0.14)',
  accentPinkBorder: 'rgba(217, 70, 239, 0.28)',
  accentPinkGlow: 'rgba(217, 70, 239, 0.35)',
  accentPinkRing: 'rgba(217, 70, 239, 0.35)',
  activeGlow: 'rgba(217, 70, 239, 0.45)',
  accentBlue: '#d946ef',
  accentBlueMuted: 'rgba(217, 70, 239, 0.15)',
  chartBlue: '#d946ef',
  profileBlue: '#d946ef',
  screenGradientMid: '#140a18',
  screenGradientEnd: '#1a0d1f',
  subtleTintBg: 'rgba(217, 70, 239, 0.08)',
  subtleTintBgStrong: 'rgba(217, 70, 239, 0.12)',
} as const;

/** Nail tech — coral palette. */
export const NAIL_ACCENT = {
  accentPink: '#f97316',
  accentPinkDeep: '#ea580c',
  accentPinkMuted: 'rgba(249, 115, 22, 0.15)',
  accentPinkSoft: 'rgba(249, 115, 22, 0.14)',
  accentPinkBorder: 'rgba(249, 115, 22, 0.28)',
  accentPinkGlow: 'rgba(249, 115, 22, 0.35)',
  accentPinkRing: 'rgba(249, 115, 22, 0.35)',
  activeGlow: 'rgba(249, 115, 22, 0.45)',
  accentBlue: '#f97316',
  accentBlueMuted: 'rgba(249, 115, 22, 0.15)',
  chartBlue: '#f97316',
  profileBlue: '#f97316',
  screenGradientMid: '#140e0a',
  screenGradientEnd: '#1a120d',
  subtleTintBg: 'rgba(249, 115, 22, 0.08)',
  subtleTintBgStrong: 'rgba(249, 115, 22, 0.12)',
} as const;

/** Lash tech — gold / champagne palette. */
export const LASH_ACCENT = {
  accentPink: '#d4a017',
  accentPinkDeep: '#b8860b',
  accentPinkMuted: 'rgba(212, 160, 23, 0.15)',
  accentPinkSoft: 'rgba(212, 160, 23, 0.14)',
  accentPinkBorder: 'rgba(212, 160, 23, 0.28)',
  accentPinkGlow: 'rgba(212, 160, 23, 0.35)',
  accentPinkRing: 'rgba(212, 160, 23, 0.35)',
  activeGlow: 'rgba(212, 160, 23, 0.45)',
  accentBlue: '#d4a017',
  accentBlueMuted: 'rgba(212, 160, 23, 0.15)',
  chartBlue: '#d4a017',
  profileBlue: '#d4a017',
  screenGradientMid: '#141208',
  screenGradientEnd: '#1a160d',
  subtleTintBg: 'rgba(212, 160, 23, 0.08)',
  subtleTintBgStrong: 'rgba(212, 160, 23, 0.12)',
} as const;

export type BrandPaletteKey = 'salon' | 'barber' | 'makeup' | 'nail' | 'lash';

const PALETTES: Record<BrandPaletteKey, typeof SALON_ACCENT> = {
  salon: SALON_ACCENT,
  barber: BARBER_ACCENT,
  makeup: MAKEUP_ACCENT,
  nail: NAIL_ACCENT,
  lash: LASH_ACCENT,
};

export function getAccentPalette(key: BrandPaletteKey) {
  return PALETTES[key];
}

/** Maps baked-in salon color strings → target palette for style substitution. */
export function getBrandColorSubstitutions(key: BrandPaletteKey): Record<string, string> | null {
  if (key === 'salon') return null;
  const target = getAccentPalette(key);
  const subs: Record<string, string> = {};
  for (const k of Object.keys(SALON_ACCENT) as (keyof typeof SALON_ACCENT)[]) {
    subs[SALON_ACCENT[k]] = target[k];
  }
  return subs;
}

/** @deprecated use getBrandColorSubstitutions('barber') */
export function getBarberColorSubstitutions(): Record<string, string> {
  return getBrandColorSubstitutions('barber') ?? {};
}
