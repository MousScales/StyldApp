import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  wide?: boolean;
};

/** Constrains form/settings content on tablet; full-width passthrough on phone. */
export default function TabletContent({ children, style, wide = false }: Props) {
  const { isTablet, contentMaxWidth } = useDeviceLayout(wide ? 'wide' : 'default');

  if (!isTablet) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
