import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  getContentMaxWidth,
  isTabletLayout,
  TABLET_SIDEBAR_WIDTH,
  PHONE_TAB_BAR_SCROLL_PADDING,
  TABLET_TAB_BAR_SCROLL_PADDING,
} from '../theme/layout';

export function useDeviceLayout(variant: 'default' | 'wide' = 'default') {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = isTabletLayout(width, height);
    const sidebarWidth = isTablet ? TABLET_SIDEBAR_WIDTH : 0;
    const contentMaxWidth = getContentMaxWidth(width, isTablet, variant);
    const gutter = isTablet ? 24 : 0;

    return {
      width,
      height,
      isTablet,
      sidebarWidth,
      contentMaxWidth,
      gutter,
      scenePaddingLeft: sidebarWidth,
      scrollBottomPadding: isTablet ? TABLET_TAB_BAR_SCROLL_PADDING : PHONE_TAB_BAR_SCROLL_PADDING,
    };
  }, [height, variant, width]);
}
