import { PixelRatio } from 'react-native';

/** iPhone 15 Plus — reference device (looks correct here; scale down on smaller phones). */
export const LAYOUT_BASE = {
  width: 430,
  height: 932,
} as const;

export type ScaleFns = {
  width: number;
  height: number;
  /** Width scale (max 1 — never larger than 15 Plus). */
  ws: number;
  /** Height scale (max 1). */
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

export function getWidthScale(width: number): number {
  return Math.min(1, width / LAYOUT_BASE.width);
}

export function getHeightScale(height: number): number {
  return Math.min(1, height / LAYOUT_BASE.height);
}

export function makeScaleFns(width: number, height: number): ScaleFns {
  const ws = getWidthScale(width);
  const hs = getHeightScale(height);
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
