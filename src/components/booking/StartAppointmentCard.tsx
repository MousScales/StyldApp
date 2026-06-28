import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = {
  onStart: () => void | Promise<void>;
  starting?: boolean;
};

export default function StartAppointmentCard({ onStart, starting = false }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ready to start?</Text>
      <Text style={styles.lead}>
        Opens a full-screen timer so you can focus on the appointment.
      </Text>
      <Pressable style={styles.btn} onPress={() => void onStart()} disabled={starting}>
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Start appointment</Text>
        )}
      </Pressable>
    </View>
  );
}

const BASE_STYLES = {
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 10,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  lead: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  btn: {
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
};
