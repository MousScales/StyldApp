import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlatformFeePayer } from '../../data/bookingPayment';
import { STYLD_PLATFORM_RATE } from '../../lib/bookingServiceFee';
import { colors } from '../../theme';

type Props = {
  value?: PlatformFeePayer;
  onChange: (next: PlatformFeePayer) => void;
};

const FEE_PERCENT_LABEL = `${Math.round(STYLD_PLATFORM_RATE * 100)}%`;

export default function PlatformFeePayerEditor({ value, onChange }: Props) {
  const payer: PlatformFeePayer = value === 'tenant' ? 'tenant' : 'client';
  const clientSelected = payer !== 'tenant';

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        Styld charges a small {FEE_PERCENT_LABEL} platform fee on card payments to cover secure checkout,
        booking tools, and card processing. Choose who pays it on online charges and payment links.
      </Text>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segment, clientSelected && styles.segmentActive]}
          onPress={() => onChange('client')}
        >
          <Text style={[styles.segmentTitle, clientSelected && styles.segmentTitleActive]}>
            Clients pay
          </Text>
          <Text style={[styles.segmentSub, clientSelected && styles.segmentSubActive]}>
            Clients see a platform fee at checkout. You receive your full service price.
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, !clientSelected && styles.segmentActive]}
          onPress={() => onChange('tenant')}
        >
          <Text style={[styles.segmentTitle, !clientSelected && styles.segmentTitleActive]}>
            I pay
          </Text>
          <Text style={[styles.segmentSub, !clientSelected && styles.segmentSubActive]}>
            Clients pay only the service amount. The fee is deducted from your payout.
          </Text>
        </Pressable>
      </View>

      <Text style={styles.note}>
        {clientSelected
          ? 'Default — clients see a separate platform fee line before they pay so the total is clear upfront.'
          : "Your clients will not see a platform fee. Card processing and Styld's fee come out of your payout on each online charge."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  lead: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  segmented: { gap: 10 },
  segment: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 4,
  },
  segmentActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  segmentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  segmentTitleActive: {
    color: colors.accentPink,
  },
  segmentSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  segmentSubActive: {
    color: colors.text,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
