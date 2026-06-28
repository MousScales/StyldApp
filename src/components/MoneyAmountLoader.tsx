import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Size = 'profile' | 'dashboard';

const SIZE_CONFIG = {
  profile: {
    width: 196,
    height: 54,
    subtitleWidth: 168,
    subtitleHeight: 14,
  },
  dashboard: {
    width: 228,
    height: 70,
    subtitleWidth: 204,
    subtitleHeight: 14,
  },
} as const;

type Props = {
  size?: Size;
  showSubtitle?: boolean;
};

function BlurBlock({
  width,
  height,
  borderRadius,
  blurOpacity,
  shimmerX,
}: {
  width: number;
  height: number;
  borderRadius: number;
  blurOpacity: Animated.AnimatedInterpolation<number>;
  shimmerX: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.cardBorder,
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: blurOpacity }]}>
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -8,
          bottom: -8,
          width: width * 0.42,
          backgroundColor: 'rgba(255,255,255,0.14)',
          transform: [{ translateX: shimmerX }, { skewX: '-16deg' }],
        }}
      />
    </View>
  );
}

export default function MoneyAmountLoader({ size = 'profile', showSubtitle = false }: Props) {
  const cfg = SIZE_CONFIG[size];
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();
    shimmerLoop.start();
    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulse, shimmer]);

  const blurOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.98] });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-cfg.width, cfg.width],
  });

  return (
    <View style={{ alignItems: 'center', gap: 8 }} accessibilityLabel="Loading balance" accessibilityRole="progressbar">
      <BlurBlock
        width={cfg.width}
        height={cfg.height}
        borderRadius={12}
        blurOpacity={blurOpacity}
        shimmerX={shimmerX}
      />
      {showSubtitle ? (
        <BlurBlock
          width={cfg.subtitleWidth}
          height={cfg.subtitleHeight}
          borderRadius={7}
          blurOpacity={blurOpacity}
          shimmerX={shimmerX}
        />
      ) : null}
    </View>
  );
}
