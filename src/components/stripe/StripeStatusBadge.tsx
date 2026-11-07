import { StyleSheet, Text, View } from 'react-native';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = {
  label: string;
  color: string;
};

export default function StripeStatusBadge({ label, color }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={[styles.badge, { borderColor: `${color}44` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const BASE_STYLES = {
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  text: { fontSize: 12, fontWeight: '600' },
};
