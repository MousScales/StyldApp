import { StyleSheet, Text, View } from 'react-native';
import { PLATFORM_FEE_LABEL } from '../../lib/bookingServiceFee';
import { usePrivacyMode } from '../../context/PrivacyContext';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors, fonts } from '../../theme';
import { maskMoney } from '../../utils/money';

type Row = {
  label: string;
  amountCents: number;
  emphasize?: boolean;
  total?: boolean;
};

type Props = {
  rows: Row[];
  showPlatformFee?: boolean;
  platformFeeCents?: number;
  totalCents?: number;
  compact?: boolean;
};

export default function PaymentFeeRows({
  rows,
  showPlatformFee = false,
  platformFeeCents = 0,
  totalCents,
  compact = false,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { privacyMode } = usePrivacyMode();
  const fee = Math.max(0, platformFeeCents);
  const showFee = showPlatformFee && fee > 0;
  const total = totalCents ?? rows.reduce((sum, row) => sum + row.amountCents, 0) + (showFee ? fee : 0);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.label, row.emphasize && styles.labelStrong]}>{row.label}</Text>
          <Text style={[styles.value, row.emphasize && styles.valueStrong]}>
            {maskMoney(`$${(row.amountCents / 100).toFixed(2)}`, privacyMode)}
          </Text>
        </View>
      ))}
      {showFee ? (
        <View style={styles.row}>
          <Text style={styles.label}>{PLATFORM_FEE_LABEL}</Text>
          <Text style={styles.value}>{maskMoney(`$${(fee / 100).toFixed(2)}`, privacyMode)}</Text>
        </View>
      ) : null}
      {showFee || rows.some((r) => r.total) ? (
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{maskMoney(`$${(total / 100).toFixed(2)}`, privacyMode)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const BASE_STYLES = {
  wrap: { gap: 10 },
  wrapCompact: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: { color: colors.textMuted, fontSize: 15, flex: 1 },
  labelStrong: { color: colors.text, fontWeight: '600' },
  value: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.number },
  valueStrong: { fontWeight: '700' },
  totalRow: {
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  totalLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontFamily: fonts.number },
};
