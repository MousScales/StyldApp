import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useBrand } from '../../context/BrandContext';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { shouldHideTabBar } from '../../navigation/tabBarVisibility';
import { getAccentPalette } from '../../theme/brandPalettes';
import { TABLET_SIDEBAR_WIDTH } from '../../theme/layout';
import { colors } from '../../theme';

const TAB_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Dashboard: { icon: 'apps-outline', iconFocused: 'apps', label: 'Dashboard' },
  Calendar: { icon: 'calendar-outline', iconFocused: 'calendar', label: 'Calendar' },
  Site: { icon: 'globe-outline', iconFocused: 'globe', label: 'Website' },
  Client: { icon: 'people-outline', iconFocused: 'people', label: 'Clients' },
  Profile: { icon: 'person-circle-outline', iconFocused: 'person-circle', label: 'Profile' },
};

export default function TabletSidebar({ state, navigation }: BottomTabBarProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { brandKey, colors: brandColors } = useBrand();
  const palette = getAccentPalette(brandKey);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  if (shouldHideTabBar(state)) return null;

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: TABLET_SIDEBAR_WIDTH,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.bgLayer} pointerEvents="none">
        <Svg width={TABLET_SIDEBAR_WIDTH} height={windowHeight}>
          <Defs>
            <LinearGradient id="tabletSidebarBg" x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor={colors.background} />
              <Stop offset="0.55" stopColor={palette.screenGradientMid} />
              <Stop offset="1" stopColor={palette.screenGradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect width={TABLET_SIDEBAR_WIDTH} height={windowHeight} fill="url(#tabletSidebarBg)" />
        </Svg>
      </View>

      <View style={styles.navColumn}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isLast = index === state.routes.length - 1;

          return (
            <View key={route.key} style={styles.itemBlock}>
              <Pressable
                style={styles.item}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={cfg.label}
              >
                {focused ? (
                  <View style={[styles.activeRail, { backgroundColor: brandColors.accentPink }]} />
                ) : null}
                <Ionicons
                  name={focused ? cfg.iconFocused : cfg.icon}
                  size={26}
                  color={focused ? brandColors.accentPink : colors.navbarInactive}
                />
                <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={2}>
                  {cfg.label}
                </Text>
              </Pressable>
              {!isLast ? <View style={styles.itemDivider} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const BASE_STYLES = {
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.accentPinkBorder,
    paddingHorizontal: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  navColumn: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  itemBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 4,
    position: 'relative',
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 12,
  },
  activeRail: {
    position: 'absolute',
    left: 0,
    top: '18%',
    bottom: '18%',
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  label: {
    color: colors.navbarInactive,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
    letterSpacing: 0.2,
  },
  labelFocused: {
    color: colors.accentPink,
  },
};
