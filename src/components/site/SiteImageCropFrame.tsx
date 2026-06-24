import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { clampFocus, HeroImageFocus } from '../../lib/heroImageFocus';
import { colors } from '../../theme';

type Props = {
  imageUri: string;
  /** width / height — split hero is 4/5, stack banner is 3/1 */
  aspectRatio: number;
  focus: HeroImageFocus;
  onFocusChange: (focus: HeroImageFocus) => void;
  borderRadius?: number;
  disabled?: boolean;
  label?: string;
};

export default function SiteImageCropFrame({
  imageUri,
  aspectRatio,
  focus,
  onFocusChange,
  borderRadius = 18,
  disabled = false,
  label = 'Drag to show the part clients will see',
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const focusRef = useRef(focus);
  const dragStartRef = useRef(focus);
  const frameSizeRef = useRef({ width: 0, height: 0 });
  const [, setFrameVersion] = useState(0);

  focusRef.current = focus;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          dragStartRef.current = { ...focusRef.current };
        },
        onPanResponderMove: (_, gesture) => {
          const { width, height } = frameSizeRef.current;
          if (!width || !height) return;
          const start = dragStartRef.current;
          onFocusChange({
            x: clampFocus(start.x - (gesture.dx / width) * 100),
            y: clampFocus(start.y - (gesture.dy / height) * 100),
          });
        },
      }),
    [disabled, onFocusChange],
  );

  const contentPosition = {
    left: `${clampFocus(focus.x)}%`,
    top: `${clampFocus(focus.y)}%`,
  } as const;

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.frame, { aspectRatio, borderRadius }]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (
            frameSizeRef.current.width !== width ||
            frameSizeRef.current.height !== height
          ) {
            frameSizeRef.current = { width, height };
            setFrameVersion((v) => v + 1);
          }
        }}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition={contentPosition}
        />
        <View style={[styles.siteBadge, { borderRadius: Math.max(8, borderRadius - 6) }]}>
          <Text style={styles.siteBadgeText}>Site preview</Text>
        </View>
      </View>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    gap: 8,
  },
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.card,
    shadowColor: colors.accentPink,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  siteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  siteBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
};
