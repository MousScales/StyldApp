import { useMemo } from 'react';
import { ImageStyle, StyleSheet, TextStyle, useWindowDimensions, ViewStyle } from 'react-native';
import { useBrandOptional } from '../context/BrandContext';
import { getBrandColorSubstitutions } from '../theme/brandPalettes';
import { makeScaleFns } from '../theme/layout';

type AnyStyle = ViewStyle | TextStyle | ImageStyle;
type NamedStyles<T> = { [P in keyof T]: AnyStyle };

const FONT_KEYS = new Set(['fontSize', 'lineHeight', 'letterSpacing']);
const VERTICAL_KEYS = new Set([
  'height',
  'minHeight',
  'maxHeight',
  'paddingTop',
  'paddingBottom',
  'paddingVertical',
  'marginTop',
  'marginBottom',
  'marginVertical',
  'top',
  'bottom',
  'rowGap',
]);
const HORIZONTAL_KEYS = new Set([
  'width',
  'minWidth',
  'maxWidth',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'left',
  'right',
  'gap',
  'columnGap',
]);
const MODERATE_KEYS = new Set(['borderRadius', 'borderWidth']);

function scaleValue(key: string, value: number, s: ReturnType<typeof makeScaleFns>): number {
  if (FONT_KEYS.has(key)) return s.rf(value);
  if (VERTICAL_KEYS.has(key)) return s.rh(value);
  if (HORIZONTAL_KEYS.has(key)) return s.rw(value);
  if (MODERATE_KEYS.has(key)) return s.rm(value);
  if (key === 'padding' || key === 'margin') return s.rm(value);
  return value;
}

function scaleStyleEntry(style: AnyStyle, s: ReturnType<typeof makeScaleFns>): AnyStyle {
  const next: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(style)) {
    if (typeof raw === 'number') {
      next[key] = scaleValue(key, raw, s);
      continue;
    }
    next[key] = raw;
  }

  return next as AnyStyle;
}

export function scaleStyleDefinition(
  base: Record<string, AnyStyle>,
  s: ReturnType<typeof makeScaleFns>,
): Record<string, AnyStyle> {
  const scaled: Record<string, AnyStyle> = {};

  for (const key of Object.keys(base)) {
    scaled[key] = scaleStyleEntry(base[key], s);
  }

  return scaled;
}

function substituteBrandColors(
  style: AnyStyle,
  subs: Record<string, string> | null,
): AnyStyle {
  if (!subs) return style;
  const next: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(style)) {
    if (typeof raw === 'string' && subs[raw]) {
      next[key] = subs[raw];
    } else {
      next[key] = raw;
    }
  }
  return next as AnyStyle;
}

function applyBrandSubstitution(
  base: Record<string, AnyStyle>,
  subs: Record<string, string> | null,
): Record<string, AnyStyle> {
  if (!subs) return base;
  const next: Record<string, AnyStyle> = {};
  for (const key of Object.keys(base)) {
    next[key] = substituteBrandColors(base[key], subs);
  }
  return next;
}

/** Scales static style objects from the iPhone 15 Plus baseline (never upscales). */
export function useResponsiveStyles(base: Record<string, object>) {
  const { width, height } = useWindowDimensions();
  const { brandKey } = useBrandOptional();
  const brandSubs = useMemo(
    () => getBrandColorSubstitutions(brandKey),
    [brandKey],
  );

  return useMemo(() => {
    const s = makeScaleFns(width, height);
    const branded = applyBrandSubstitution(base as Record<string, AnyStyle>, brandSubs);
    if (s.ws === 1 && s.hs === 1) {
      return StyleSheet.create(branded);
    }
    return StyleSheet.create(scaleStyleDefinition(branded, s));
  }, [base, width, height, brandKey, brandSubs]);
}
