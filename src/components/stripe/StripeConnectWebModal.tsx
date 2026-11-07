import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

const RETURN_URL = 'styldd.com/connect/return';
const REFRESH_URL = 'styldd.com/connect/refresh';

type Props = {
  visible: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
  onDone: () => void;
};

export default function StripeConnectWebModal({
  visible,
  url,
  title = 'Styld Pay',
  onClose,
  onDone,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable onPress={onDone} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        {url ? (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.accentPink} />
              </View>
            )}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.includes(RETURN_URL) || request.url.includes(REFRESH_URL)) {
                onDone();
                return false;
              }
              return true;
            }}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accentPink} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
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
  done: { color: colors.accentPink, fontSize: 16, fontWeight: '600' },
  webview: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
};
