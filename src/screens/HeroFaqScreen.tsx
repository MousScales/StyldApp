import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useSiteContent } from '../context/SiteContentContext';
import { SiteFaqItem } from '../data/siteContent';
import { SiteStackParamList } from '../navigation/SiteNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<SiteStackParamList, 'HeroFaq'>;

function faqItemsFromContent(items: SiteFaqItem[]): SiteFaqItem[] {
  return items.length > 0 ? items.map((item) => ({ ...item })) : [{ question: '', answer: '' }];
}

export default function HeroFaqScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { content, updateContent } = useSiteContent();
  const answerRefs = useRef<(TextInput | null)[]>([]);

  const [items, setItems] = useState<SiteFaqItem[]>(() => faqItemsFromContent(content.faqItems));

  useEffect(() => {
    const cleaned = items.filter((item) => item.question.trim() || item.answer.trim());
    updateContent({ faqItems: cleaned });
  }, [items]);

  function updateItem(index: number, field: keyof SiteFaqItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { question: '', answer: '' }]);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ question: '', answer: '' }];
    });
  }

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>FAQ</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.hint}>
              Add questions clients ask before booking. Each item expands on your site.
            </Text>

            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>Question {index + 1}</Text>
                  {items.length > 1 ? (
                    <Pressable onPress={() => removeItem(index)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  style={styles.questionInput}
                  value={item.question}
                  onChangeText={(value) => updateItem(index, 'question', value)}
                  placeholder="e.g. Do you require a deposit?"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => answerRefs.current[index]?.focus()}
                  blurOnSubmit={false}
                  autoCorrect={false}
                />
                <TextInput
                  ref={(r) => {
                    answerRefs.current[index] = r;
                  }}
                  style={styles.answerInput}
                  value={item.answer}
                  onChangeText={(value) => updateItem(index, 'answer', value)}
                  placeholder="Your answer…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  autoCorrect={false}
                />
              </View>
            ))}

            <Pressable style={styles.addBtn} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={16} color={colors.accentPink} />
              <Text style={styles.addBtnText}>Add question</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 60,
    gap: 12,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: colors.card,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  questionInput: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    paddingVertical: 4,
  },
  answerInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 14,
    marginTop: 4,
  },
  addBtnText: {
    color: colors.accentPink,
    fontSize: 14,
    fontWeight: '600',
  },
};
