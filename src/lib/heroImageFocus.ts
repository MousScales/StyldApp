import { HeroImagePosition } from '../data/siteTheme';

export type HeroImageFocus = {
  x: number;
  y: number;
};

/** Matches live site default (`object-position: center 22%`). */
export const DEFAULT_HERO_IMAGE_FOCUS: HeroImageFocus = { x: 50, y: 22 };

export const DEFAULT_STACK_IMAGE_FOCUS: HeroImageFocus = { x: 50, y: 50 };

export function clampFocus(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function focusFromLegacyPosition(position: HeroImagePosition): HeroImageFocus {
  if (position === 'center top') return { x: 50, y: 0 };
  if (position === 'center bottom') return { x: 50, y: 100 };
  return { x: 50, y: 50 };
}

export function normalizeHeroImageFocus(
  x: unknown,
  y: unknown,
  legacyPosition?: HeroImagePosition,
): HeroImageFocus {
  const fallback = legacyPosition ? focusFromLegacyPosition(legacyPosition) : DEFAULT_HERO_IMAGE_FOCUS;
  return {
    x: typeof x === 'number' ? clampFocus(x) : fallback.x,
    y: typeof y === 'number' ? clampFocus(y) : fallback.y,
  };
}

export function normalizeStackImageFocusList(
  value: unknown,
  pathCount: number,
): HeroImageFocus[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: pathCount }, (_, i) => {
    const item = source[i];
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      return normalizeHeroImageFocus(row.x, row.y, 'center center');
    }
    return { ...DEFAULT_STACK_IMAGE_FOCUS };
  });
}

export function focusToBackgroundPosition(focus: HeroImageFocus): string {
  return `${clampFocus(focus.x)}% ${clampFocus(focus.y)}%`;
}

export function legacyPositionFromFocus(focus: HeroImageFocus): HeroImagePosition {
  if (focus.y <= 33) return 'center top';
  if (focus.y >= 67) return 'center bottom';
  return 'center center';
}
