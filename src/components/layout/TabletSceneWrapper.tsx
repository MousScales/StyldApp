import { ReactNode, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import { useTabBarHidden } from '../../hooks/useTabBarHidden';
import { colors } from '../../theme';

type Props = {
  children: ReactNode;
  /** Use full content column width (calendar, week grid). */
  wide?: boolean;
};

type TabletLayoutProps = Props & {
  scenePaddingLeft: number;
  contentMaxWidth: number;
};

function TabletSceneLayout({
  children,
  wide: _wide,
  scenePaddingLeft,
  contentMaxWidth,
  tabBarHidden,
}: TabletLayoutProps & { tabBarHidden: boolean }) {
  const contentWidth = tabBarHidden ? contentMaxWidth + scenePaddingLeft : contentMaxWidth;

  return (
    <View style={[styles.root, { paddingLeft: tabBarHidden ? 0 : scenePaddingLeft }]}>
      <View style={[styles.column, { maxWidth: contentWidth }]}>{children}</View>
    </View>
  );
}

/** Uses navigation hooks — only mount when inside a navigator. */
function TabletSceneWithNav(props: TabletLayoutProps) {
  const tabBarHidden = useTabBarHidden();
  return <TabletSceneLayout {...props} tabBarHidden={tabBarHidden} />;
}

/** Centers tab content on tablet with optional max width; phone is passthrough. */
export default function TabletSceneWrapper({ children, wide = false }: Props) {
  const { isTablet, scenePaddingLeft, contentMaxWidth } = useDeviceLayout(wide ? 'wide' : 'default');
  const hasNavigation = useContext(NavigationContext) != null;

  if (!isTablet) {
    return <>{children}</>;
  }

  const layoutProps: TabletLayoutProps = {
    children,
    wide,
    scenePaddingLeft,
    contentMaxWidth,
  };

  if (!hasNavigation) {
    return <TabletSceneLayout {...layoutProps} tabBarHidden={false} />;
  }

  return <TabletSceneWithNav {...layoutProps} />;
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
