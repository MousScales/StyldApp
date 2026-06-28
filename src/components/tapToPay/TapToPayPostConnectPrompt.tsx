import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAP_TO_PAY_BUTTON_LABEL } from '../../lib/tapToPayCompliance';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import TapToPayWaveIcon from './TapToPayWaveIcon';

type Props = {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

/** Shown once after Stripe Connect is ready (requirement 3.4). */
export default function TapToPayPostConnectPrompt({ visible, onEnable, onDismiss }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <TapToPayWaveIcon size={36} color={colors.accentPink} />
        </View>
        <Text style={styles.title}>You&apos;re set up for payments</Text>
        <Text style={styles.body}>
          Enable {TAP_TO_PAY_BUTTON_LABEL} to accept contactless cards and digital wallets when you
          finish appointments — no card reader required.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onEnable}>
          <Text style={styles.primaryBtnText}>Enable Tap to Pay</Text>
        </Pressable>
        <Pressable style={styles.textBtn} onPress={onDismiss}>
          <Text style={styles.textBtnLabel}>I&apos;ll do this later</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const BASE_STYLES = {
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  hero: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: colors.accentPink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  textBtn: { paddingVertical: 10, alignItems: 'center' },
  textBtnLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
};
