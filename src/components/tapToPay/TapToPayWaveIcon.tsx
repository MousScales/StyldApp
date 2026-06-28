import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';

type Props = {
  size?: number;
  color: string;
  filled?: boolean;
};

/** Apple checklist 5.5 — wave.3.right.circle SF Symbol on iOS. */
export default function TapToPayWaveIcon({ size = 20, color, filled = true }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={filled ? 'wave.3.right.circle.fill' : 'wave.3.right.circle'}
        size={size}
        tintColor={color}
        style={styles.symbol}
      />
    );
  }

  return <Ionicons name="radio-outline" size={size} color={color} />;
}

const styles = StyleSheet.create({
  symbol: { width: 22, height: 22 },
});
