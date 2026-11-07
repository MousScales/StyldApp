import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { formatUsdFromCents } from '../../lib/stripeConnect';
import { STRIPE_BALANCE_COLORS } from '../../lib/stripeBalanceDisplay';
import { colors } from '../../theme';

type Props = {
  availableCents: number;
  pendingCents: number;
  /** When set, masks dollar amounts (privacy mode). */
  maskAmounts?: boolean;
  style?: ViewStyle;
  compact?: boolean;
};

function mask(cents: number, masked?: boolean): string {
  return masked ? '••••' : formatUsdFromCents(cents);
}

export default function StripeBalanceSplit({
  availableCents,
  pendingCents,
  maskAmounts,
  style,
  compact = false,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const amountStyle = compact ? styles.amtCompact : styles.amt;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.item}>
        <Text style={[amountStyle, { color: STRIPE_BALANCE_COLORS.available }]}>
          {mask(availableCents, maskAmounts)}
        </Text>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: STRIPE_BALANCE_COLORS.available }]} />
          <Text style={styles.label}>Available</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[amountStyle, { color: pendingCents > 0 ? STRIPE_BALANCE_COLORS.processing : colors.textMuted }]}>
          {mask(pendingCents, maskAmounts)}
        </Text>
        <View style={styles.labelRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  pendingCents > 0 ? STRIPE_BALANCE_COLORS.processing : colors.textMuted,
              },
            ]}
          />
          <Text style={styles.label}>Processing</Text>
        </View>
      </View>
    </View>
  );
}

const BASE_STYLES = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  amt: { fontSize: 18, fontWeight: '700', marginBottom: 0 },
  amtCompact: { fontSize: 22, fontWeight: '700', marginBottom: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.cardBorder },
};
