import { PixelRatio } from 'react-native';

/** iPhone 15 Plus — reference device (looks correct here; scale down on smaller phones). */
export const LAYOUT_BASE = {
  width: 430,
  height: 932,
} as const;

/** Shortest edge at or above this is treated as tablet (iPad mini portrait ≈ 744). */
export const TABLET_MIN_SHORT_EDGE = 600;

export const TABLET_SIDEBAR_WIDTH = 104;

/** Max readable content width on tablet (calendar uses full column width up to wide cap). */
export const TABLET_CONTENT_MAX_WIDTH = 980;
export const TABLET_WIDE_MAX_WIDTH = 1180;

/** Extra scroll padding above the phone floating tab bar. */
export const PHONE_TAB_BAR_SCROLL_PADDING = 120;
export const TABLET_TAB_BAR_SCROLL_PADDING = 24;

export type ScaleFns = {
  width: number;
  height: number;
  /** Width scale (max 1 on phone; up to ~1.12 on tablet). */
  ws: number;
  /** Height scale (max 1 on phone; up to ~1.08 on tablet). */
  hs: number;
  /** Horizontal spacing / widths. */
  rw: (size: number) => number;
  /** Vertical spacing / heights. */
  rh: (size: number) => number;
  /** Typography — blends width + height for readability. */
  rf: (size: number) => number;
  /** General moderate scale (icons, radii). */
  rm: (size: number) => number;
};

export function isTabletLayout(width: number, height: number): boolean {
  return Math.min(width, height) >= TABLET_MIN_SHORT_EDGE;
}

export function getWidthScale(width: number, isTablet: boolean): number {
  if (isTablet) {
    return Math.min(1.12, Math.max(1, width / LAYOUT_BASE.width));
  }
  return Math.min(1, width / LAYOUT_BASE.width);
}

export function getHeightScale(height: number, isTablet: boolean): number {
  if (isTablet) {
    return Math.min(1.08, Math.max(1, height / LAYOUT_BASE.height));
  }
  return Math.min(1, height / LAYOUT_BASE.height);
}

export function getContentMaxWidth(
  width: number,
  isTablet: boolean,
  variant: 'default' | 'wide' = 'default',
): number {
  if (!isTablet) return width;
  const cap = variant === 'wide' ? TABLET_WIDE_MAX_WIDTH : TABLET_CONTENT_MAX_WIDTH;
  const available = width - TABLET_SIDEBAR_WIDTH;
  return Math.min(cap, available);
}

/** Site tab browser preview height — taller on tablet where there is more vertical room. */
export function getSiteTabPreviewHeight(width: number, height: number): number {
  const { rh } = makeScaleFns(width, height);
  const isTablet = isTabletLayout(width, height);

  if (!isTablet) {
    return Math.round(rh(LAYOUT_BASE.height * 0.7));
  }

  const scaled = Math.round(rh(LAYOUT_BASE.height * 0.95));
  const viewportTarget = Math.round(height * 0.62);
  const maxHeight = Math.round(height * 0.78);

  return Math.min(Math.max(scaled, viewportTarget), maxHeight);
}

/** Login is full-bleed — no app sidebar. Split hero/form when wide enough. */
export function getLoginLayoutMetrics(width: number, height: number) {
  const isTablet = isTabletLayout(width, height);
  const isSplitTablet = isTablet && width >= 860;
  const loginMaxWidth = isTablet ? Math.min(width - 48, 1040) : width;
  const formWidth = isSplitTablet ? 400 : isTablet ? Math.min(480, width - 48) : width;

  return {
    isTablet,
    isSplitTablet,
    loginMaxWidth,
    formWidth,
    previewSize: isSplitTablet ? 460 : isTablet ? 400 : 350,
  };
}

export function makeScaleFns(width: number, height: number): ScaleFns {
  const tablet = isTabletLayout(width, height);
  const ws = getWidthScale(width, tablet);
  const hs = getHeightScale(height, tablet);
  const blend = ws * 0.6 + hs * 0.4;

  const round = (n: number) => PixelRatio.roundToNearestPixel(n);

  return {
    width,
    height,
    ws,
    hs,
    rw: (size) => round(size * ws),
    rh: (size) => round(size * hs),
    rf: (size) => round(size * blend),
    rm: (size) => round(size * blend),
  };
}
