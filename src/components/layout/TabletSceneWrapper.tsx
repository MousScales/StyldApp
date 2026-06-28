import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import { useTabBarHidden } from '../../hooks/useTabBarHidden';
import { colors } from '../../theme';

type Props = {
  children: ReactNode;
  /** Use full content column width (calendar, week grid). */
  wide?: boolean;
};

/** Centers tab content on tablet with optional max width; phone is passthrough. */
export default function TabletSceneWrapper({ children, wide = false }: Props) {
  const { isTablet, scenePaddingLeft, contentMaxWidth } = useDeviceLayout(wide ? 'wide' : 'default');
  const tabBarHidden = useTabBarHidden();
  const contentWidth = tabBarHidden ? contentMaxWidth + scenePaddingLeft : contentMaxWidth;

  if (!isTablet) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.root, { paddingLeft: tabBarHidden ? 0 : scenePaddingLeft }]}>
      <View style={[styles.column, { maxWidth: contentWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
