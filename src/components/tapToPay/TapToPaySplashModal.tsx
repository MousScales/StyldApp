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

export default function TapToPaySplashModal({ visible, onEnable, onDismiss }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.heroIcon}>
            <TapToPayWaveIcon size={34} color={colors.accentPink} />
          </View>
          <Text style={styles.title}>{TAP_TO_PAY_BUTTON_LABEL}</Text>
          <Text style={styles.body}>
            Accept contactless cards and digital wallets on your iPhone when you finish appointments
            — no card reader required.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onEnable}>
            <Text style={styles.primaryBtnText}>Enable Tap to Pay</Text>
          </Pressable>
          <Pressable style={styles.textBtn} onPress={onDismiss}>
            <Text style={styles.textBtnLabel}>Not now</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const BASE_STYLES = {
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
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
    marginBottom: 22,
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
