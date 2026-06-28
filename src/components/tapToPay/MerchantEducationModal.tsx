import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

const SECTIONS = [
  {
    icon: 'card-outline' as const,
    title: 'Contactless cards',
    body: 'Ask your client to hold their contactless card horizontally near the top of your iPhone. Wait for the checkmark.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Apple Pay & digital wallets',
    body: 'Clients can pay with Apple Pay and other digital wallets the same way — hold the device near the top of your iPhone.',
  },
  {
    icon: 'keypad-outline' as const,
    title: 'PIN entry',
    body: 'Some cards may ask for a PIN on your iPhone. Accessibility options are available on the PIN screen when prompted.',
  },
  {
    icon: 'swap-horizontal-outline' as const,
    title: 'If a card cannot be read',
    body: 'Ask if they have another contactless card or digital wallet. You can also use Card entry or Cash in Styld checkout.',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export default function MerchantEducationModal({ visible, onClose, onComplete }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>How to accept payments</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Tap to Pay on iPhone lets you accept contactless cards and digital wallets — no extra
            hardware needed.
          </Text>

          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name={section.icon} size={20} color={colors.accentPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardBody}>{section.body}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.footerNote}>
            Visa, Mastercard, American Express, and Discover contactless payments are supported.
          </Text>
        </ScrollView>

        <Pressable style={styles.primaryBtn} onPress={onComplete}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const BASE_STYLES = {
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  content: { padding: 20, paddingBottom: 32, gap: 14 },
  lead: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  footerNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  primaryBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.accentPink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
};
