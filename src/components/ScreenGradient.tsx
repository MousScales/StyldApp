import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { getAccentPalette } from '../theme/brandPalettes';
import { useBrand } from '../context/BrandContext';
import { colors } from '../theme';

export default function ScreenGradient() {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { width, height } = useWindowDimensions();
  const { brandKey } = useBrand();
  const palette = getAccentPalette(brandKey);
  const gradientMid = palette.screenGradientMid;
  const gradientEnd = palette.screenGradientEnd;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="screenBg" x1="0" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={colors.background} />
            <Stop offset="0.45" stopColor={gradientMid} />
            <Stop offset="1" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#screenBg)" />
      </Svg>
    </View>
  );
}

const BASE_STYLES = {
  container: {
    ...StyleSheet.absoluteFillObject,
  },
};
