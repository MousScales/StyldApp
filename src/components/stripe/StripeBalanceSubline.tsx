import { Text, TextStyle } from 'react-native';
import { formatUsdFromCents } from '../../lib/stripeConnect';
import { STRIPE_BALANCE_COLORS } from '../../lib/stripeBalanceDisplay';
import { colors } from '../../theme';

type Props = {
  availableCents: number;
  pendingCents: number;
  privacyMode?: boolean;
  style?: TextStyle;
};

export default function StripeBalanceSubline({
  availableCents,
  pendingCents,
  privacyMode,
  style,
}: Props) {
  const available = privacyMode ? '••••' : formatUsdFromCents(availableCents);
  const pending = privacyMode ? '••••' : formatUsdFromCents(pendingCents);

  return (
    <Text style={[{ fontSize: 13, textAlign: 'center' }, style]}>
      <Text style={{ color: STRIPE_BALANCE_COLORS.available, fontWeight: '600' }}>
        {available} available
      </Text>
      {pendingCents > 0 ? (
        <>
          <Text style={{ color: colors.textMuted }}> · </Text>
          <Text style={{ color: STRIPE_BALANCE_COLORS.processing, fontWeight: '600' }}>
            {pending} processing
          </Text>
        </>
      ) : (
        <Text style={{ color: colors.textMuted, fontWeight: '500' }}> · nothing processing</Text>
      )}
    </Text>
  );
}
