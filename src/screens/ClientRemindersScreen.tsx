import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MessagePlaceholderBar from '../components/clients/MessagePlaceholderBar';
import ScreenGradient from '../components/ScreenGradient';
import { useAuth } from '../context/AuthContext';
import { useSiteData } from '../context/SiteDataContext';
import { useOnboarding } from '../context/OnboardingContext';
import {
  ClientReminderRule,
  REMINDER_OFFSET_PRESETS,
  ReminderTiming,
} from '../data/clientReminders';
import {
  loadClientReminderSettings,
  saveClientReminderSettings,
} from '../lib/clientReminders';
import { previewWithSamplePlaceholders } from '../lib/messagePlaceholders';
import { ClientStackParamList } from '../navigation/ClientNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<ClientStackParamList, 'ClientReminders'>;

function RuleCard({
  rule,
  businessLabel,
  siteUrl,
  saving,
  onChange,
}: {
  rule: ClientReminderRule;
  businessLabel: string;
  siteUrl: string;
  saving: boolean;
  onChange: (next: ClientReminderRule) => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const insertInto = (field: 'subject' | 'message', token: string) => {
    onChange({ ...rule, [field]: `${rule[field]}${rule[field] ? ' ' : ''}${token}` });
  };

  const timingLabel = rule.timing === 'before_booking' ? 'Before appointment' : 'After appointment';

  return (
    <View style={[styles.ruleCard, !rule.enabled && styles.ruleCardMuted]}>
      <View style={styles.ruleHeader}>
        <View style={styles.ruleHeaderCopy}>
          <Text style={styles.ruleTitle}>{rule.label}</Text>
          <Text style={styles.ruleMeta}>
            {timingLabel} · {rule.offsetHours}h
          </Text>
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={(enabled) => onChange({ ...rule, enabled })}
          disabled={saving}
          trackColor={{ false: colors.cardBorder, true: colors.accentPinkBorder }}
          thumbColor={rule.enabled ? colors.accentPink : colors.textMuted}
        />
      </View>

      <Text style={styles.fieldLabel}>Send</Text>
      <View style={styles.timingRow}>
        {(['before_booking', 'after_booking'] as ReminderTiming[]).map((timing) => {
          const active = rule.timing === timing;
          return (
            <Pressable
              key={timing}
              style={[styles.timingChip, active && styles.timingChipActive]}
              onPress={() => onChange({ ...rule, timing })}
              disabled={saving}
            >
              <Text style={[styles.timingChipText, active && styles.timingChipTextActive]}>
                {timing === 'before_booking' ? 'Before' : 'After'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Timing</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offsetRow}>
        {REMINDER_OFFSET_PRESETS.map((preset) => {
          const active = rule.offsetHours === preset.hours;
          return (
            <Pressable
              key={preset.hours}
              style={[styles.offsetChip, active && styles.offsetChipActive]}
              onPress={() => onChange({ ...rule, offsetHours: preset.hours })}
              disabled={saving}
            >
              <Text style={[styles.offsetChipText, active && styles.offsetChipTextActive]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>Email subject</Text>
      <MessagePlaceholderBar onInsert={(token) => insertInto('subject', token)} disabled={saving} />
      <TextInput
        style={styles.input}
        value={rule.subject}
        onChangeText={(subject) => onChange({ ...rule, subject })}
        placeholder="Reminder: {styleName} on {appointmentDate}"
        placeholderTextColor={colors.textMuted}
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Email message</Text>
      <MessagePlaceholderBar onInsert={(token) => insertInto('message', token)} disabled={saving} />
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={rule.message}
        onChangeText={(message) => onChange({ ...rule, message })}
        placeholder="Hi {firstName}! …"
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        editable={!saving}
      />

      {rule.subject || rule.message ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Preview</Text>
          {rule.subject ? (
            <Text style={styles.previewSubject}>
              {previewWithSamplePlaceholders(rule.subject, businessLabel, siteUrl)}
            </Text>
          ) : null}
          {rule.message ? (
            <Text style={styles.previewText}>
              {previewWithSamplePlaceholders(rule.message, businessLabel, siteUrl)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function ClientRemindersScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { user } = useAuth();
  const { businessLabel } = useSiteData();
  const { sitePublish } = useOnboarding();
  const siteUrl = sitePublish.publicUrl ?? '';

  const [rules, setRules] = useState<ClientReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const settings = await loadClientReminderSettings(user.id);
      setRules(settings.rules);
    } catch (err) {
      Alert.alert('Could not load', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const updateRule = (index: number, next: ClientReminderRule) => {
    setRules((current) => current.map((rule, i) => (i === index ? next : rule)));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveClientReminderSettings(user.id, { rules });
      Alert.alert('Saved', 'Automated client reminders updated.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Client reminders</Text>
            <Text style={styles.subtitle}>Automated emails before or after bookings</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accentPink} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accentPink} />
              <Text style={styles.infoText}>
                Use placeholders like {'{styleName}'} and {'{firstName}'} — they auto-fill per client
                and booking. Manual emails from the Clients tab use the same placeholders.
              </Text>
            </View>

            {rules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                businessLabel={businessLabel}
                siteUrl={siteUrl}
                saving={saving}
                onChange={(next) => updateRule(index, next)}
              />
            ))}

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save reminders</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
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
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 36 },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.accentPinkMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    padding: 14,
  },
  infoText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  ruleCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 8,
  },
  ruleCardMuted: { opacity: 0.72 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleHeaderCopy: { flex: 1, paddingRight: 12 },
  ruleTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  ruleMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  timingRow: { flexDirection: 'row', gap: 8 },
  timingChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timingChipActive: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  timingChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  timingChipTextActive: { color: colors.accentPink, fontWeight: '700' },
  offsetRow: { gap: 8, paddingVertical: 2 },
  offsetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offsetChipActive: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  offsetChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  offsetChipTextActive: { color: colors.accentPink, fontWeight: '700' },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageInput: { minHeight: 100, paddingTop: 12 },
  previewBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginTop: 4,
    gap: 6,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  previewSubject: { color: colors.text, fontSize: 14, fontWeight: '700' },
  previewText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  saveBtn: {
    backgroundColor: colors.accentPink,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
};
