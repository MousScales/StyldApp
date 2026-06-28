import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../theme';

const GRID_LINES = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

/** Same top-center pink glow + grid on phone and tablet. */
export default function LoginBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <RadialGradient id="loginHeroGlow" cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={colors.accentPink} stopOpacity="0.22" />
            <Stop offset="1" stopColor={colors.accentPink} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {GRID_LINES.map((x) => (
          <Rect
            key={x}
            x={`${x * 100}%`}
            y="0"
            width="1"
            height="100%"
            fill="rgba(255,255,255,0.035)"
          />
        ))}

        <Rect width="100%" height="60%" fill="url(#loginHeroGlow)" />
      </Svg>
    </View>
  );
}
