import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { useDeviceCalendarSync } from '../../hooks/useDeviceCalendarSync';
import {
  calendarProviderLabel,
  formatGoogleSyncTarget,
  isCalendarProviderAvailable,
  type CalendarProvider,
  type GoogleAccountOption,
  type GoogleCalendarChoice,
  type GoogleSyncSelection,
} from '../../lib/deviceCalendarSync';
import { colors } from '../../theme';

type Props = {
  compact?: boolean;
};

type PickerStep = 'account' | 'calendar';

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never synced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never synced';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function providerIcon(provider: CalendarProvider): keyof typeof Ionicons.glyphMap {
  return provider === 'apple' ? 'logo-apple' : 'logo-google';
}

export default function DeviceCalendarSyncSection({ compact = false }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const {
    syncNow,
    loadGoogleAccounts,
    loadGoogleCalendarChoices,
    persistGoogleSelection,
    syncingProvider,
    error,
    initialized,
    hasLinkedSite,
    autoSyncProvider,
    appleLastSyncedAt,
    googleLastSyncedAt,
    googleSelection,
    appointmentCount,
  } = useDeviceCalendarSync();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [googlePickerOpen, setGooglePickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<PickerStep>('account');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountOption[]>([]);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarChoice[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccountOption | null>(null);

  async function runGoogleSync(selection: GoogleSyncSelection) {
    await persistGoogleSelection(selection);
    const result = await syncNow('google', selection);
    if (!result) return;
    setGooglePickerOpen(false);
    setSheetOpen(false);
    Alert.alert(
      'Calendar synced',
      `${result.total} appointment${result.total === 1 ? '' : 's'} synced to ${formatGoogleSyncTarget(selection) ?? 'Google Calendar'}.`,
    );
  }

  async function openGooglePicker(forcePicker = false) {
    try {
      const accounts = await loadGoogleAccounts();

      if (!forcePicker && googleSelection && accounts.some((account) => account.sourceId === googleSelection.sourceId)) {
        try {
          await runGoogleSync(googleSelection);
        } catch (err) {
          Alert.alert('Sync failed', err instanceof Error ? err.message : 'Try again.');
        }
        return;
      }

      setPickerLoading(true);
      setGooglePickerOpen(true);
      setPickerStep('account');
      setSelectedAccount(null);
      setGoogleCalendars([]);
      setGoogleAccounts(accounts);

      if (accounts.length === 1) {
        await openCalendarStep(accounts[0]);
        return;
      }

      setPickerStep('account');
    } catch (err) {
      setGooglePickerOpen(false);
      Alert.alert('Google Calendar', err instanceof Error ? err.message : 'Could not load Google accounts.');
    } finally {
      setPickerLoading(false);
    }
  }

  async function openCalendarStep(account: GoogleAccountOption) {
    setPickerLoading(true);
    setSelectedAccount(account);
    setPickerStep('calendar');

    try {
      const choices = await loadGoogleCalendarChoices(account.sourceId);
      setGoogleCalendars(choices);
    } catch (err) {
      setGooglePickerOpen(false);
      Alert.alert('Google Calendar', err instanceof Error ? err.message : 'Could not load calendars.');
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleCalendarChoice(choice: GoogleCalendarChoice) {
    if (!selectedAccount) return;

    const selection: GoogleSyncSelection = {
      sourceId: selectedAccount.sourceId,
      sourceName: selectedAccount.label,
      calendarId: choice.calendarId,
      calendarTitle: choice.title,
    };

    try {
      await runGoogleSync(selection);
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Try again.');
    }
  }

  async function handleProviderPress(provider: CalendarProvider) {
    if (!isCalendarProviderAvailable(provider)) {
      Alert.alert(
        'Apple Calendar',
        'Apple Calendar sync is available on iPhone and iPad. Use Google Calendar on this device.',
      );
      return;
    }

    if (provider === 'google') {
      await openGooglePicker(false);
      return;
    }

    try {
      const result = await syncNow(provider);
      if (!result) return;
      setSheetOpen(false);
      Alert.alert(
        'Calendar synced',
        `${result.total} appointment${result.total === 1 ? '' : 's'} synced to ${calendarProviderLabel(provider)}.`,
      );
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Try again.');
    }
  }

  function renderProviderButton(provider: CalendarProvider) {
    const syncing = syncingProvider === provider;
    const lastSyncedAt = provider === 'apple' ? appleLastSyncedAt : googleLastSyncedAt;
    const isAuto = autoSyncProvider === provider;
    const unavailable = !isCalendarProviderAvailable(provider);
    const googleTarget = provider === 'google' ? formatGoogleSyncTarget(googleSelection) : null;

    return (
      <Pressable
        key={provider}
        style={[
          styles.providerBtn,
          syncing && styles.providerBtnBusy,
          unavailable && styles.providerBtnDisabled,
        ]}
        disabled={Boolean(syncingProvider) || unavailable}
        onPress={() => void handleProviderPress(provider)}
        accessibilityLabel={`Sync to ${calendarProviderLabel(provider)}`}
      >
        <View style={styles.providerBtnTop}>
          {syncing ? (
            <ActivityIndicator color={colors.accentPink} size="small" />
          ) : (
            <Ionicons name={providerIcon(provider)} size={22} color={colors.text} />
          )}
          <View style={styles.providerBtnCopy}>
            <Text style={styles.providerBtnTitle}>{calendarProviderLabel(provider)}</Text>
            <Text style={styles.providerBtnMeta}>Last sync: {formatSyncedAt(lastSyncedAt)}</Text>
          </View>
          {isAuto ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>Auto</Text>
            </View>
          ) : null}
        </View>
        {unavailable ? (
          <Text style={styles.providerHint}>Available on iPhone and iPad</Text>
        ) : provider === 'google' ? (
          <View style={styles.googleHintRow}>
            <Text style={styles.providerHint}>
              {googleTarget ?? 'Choose a Google account and calendar'}
            </Text>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                void openGooglePicker(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.providerHint}>
            Saves to a &quot;Styld Appointments&quot; calendar in {calendarProviderLabel(provider)}.
          </Text>
        )}
      </Pressable>
    );
  }

  function renderGooglePicker() {
    return (
      <Modal
        visible={googlePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGooglePickerOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setGooglePickerOpen(false)}>
          <Pressable style={styles.sheetCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {pickerStep === 'account' ? 'Choose Google account' : 'Choose calendar'}
            </Text>
            <Text style={styles.sheetBody}>
              {pickerStep === 'account'
                ? 'Pick which Google account should receive your Styld appointments.'
                : selectedAccount
                  ? `Calendars on ${selectedAccount.label}`
                  : 'Pick a calendar for your appointments.'}
            </Text>

            {pickerLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.accentPink} />
              </View>
            ) : (
              <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
                {pickerStep === 'account'
                  ? googleAccounts.map((account) => (
                      <Pressable
                        key={account.sourceId}
                        style={styles.choiceBtn}
                        onPress={() => void openCalendarStep(account)}
                      >
                        <Ionicons name="logo-google" size={18} color={colors.text} />
                        <View style={styles.choiceCopy}>
                          <Text style={styles.choiceTitle}>{account.label}</Text>
                          <Text style={styles.choiceSubtitle}>Google account on this device</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    ))
                  : googleCalendars.map((choice) => (
                      <Pressable
                        key={`${choice.calendarId ?? 'new'}-${choice.title}`}
                        style={styles.choiceBtn}
                        onPress={() => void handleCalendarChoice(choice)}
                      >
                        <Ionicons
                          name={choice.isStyldDefault ? 'calendar' : 'calendar-outline'}
                          size={18}
                          color={colors.text}
                        />
                        <View style={styles.choiceCopy}>
                          <Text style={styles.choiceTitle}>{choice.title}</Text>
                          <Text style={styles.choiceSubtitle}>{choice.subtitle}</Text>
                        </View>
                      </Pressable>
                    ))}
              </ScrollView>
            )}

            {pickerStep === 'calendar' && googleAccounts.length > 1 ? (
              <Pressable style={styles.backBtn} onPress={() => setPickerStep('account')}>
                <Ionicons name="chevron-back" size={16} color={colors.accentPink} />
                <Text style={styles.backBtnText}>Back to accounts</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  if (!initialized) {
    return compact ? null : (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.accentPink} />
      </View>
    );
  }

  if (!hasLinkedSite) {
    if (compact) return null;
    return (
      <Text style={styles.hint}>Link your booking site to sync appointments to your phone calendar.</Text>
    );
  }

  if (compact) {
    return (
      <>
        <Pressable
          style={[styles.compactBtn, syncingProvider && styles.compactBtnBusy]}
          onPress={() => setSheetOpen(true)}
          disabled={Boolean(syncingProvider)}
          accessibilityLabel="Sync appointments to calendar"
        >
          {syncingProvider ? (
            <ActivityIndicator color={colors.accentPink} size="small" />
          ) : (
            <Ionicons name="calendar-outline" size={18} color={colors.text} />
          )}
        </Pressable>

        <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
            <Pressable style={styles.sheetCard} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.sheetTitle}>Sync appointments</Text>
              <Text style={styles.sheetBody}>
                {appointmentCount} scheduled appointment{appointmentCount === 1 ? '' : 's'}
              </Text>
              <View style={styles.providerList}>
                {renderProviderButton('apple')}
                {renderProviderButton('google')}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </Pressable>
          </Pressable>
        </Modal>

        {renderGooglePicker()}
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Sync to your calendar</Text>
        <Text style={styles.body}>
          Choose Apple Calendar or Google Calendar. For Google, you can pick the account and calendar.
          After your first sync, Styld keeps it updated automatically.
        </Text>
      </View>

      <Text style={styles.meta}>
        {appointmentCount} scheduled appointment{appointmentCount === 1 ? '' : 's'}
      </Text>

      <View style={styles.providerList}>
        {renderProviderButton('apple')}
        {renderProviderButton('google')}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {renderGooglePicker()}
    </View>
  );
}

const BASE_STYLES = {
  wrap: { gap: 12 },
  loadingWrap: { paddingVertical: 16, alignItems: 'center' },
  headerCopy: { gap: 4 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  providerList: { gap: 10 },
  providerBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  providerBtnBusy: { opacity: 0.75 },
  providerBtnDisabled: { opacity: 0.55 },
  providerBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerBtnCopy: { flex: 1, gap: 2 },
  providerBtnTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  providerBtnMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  providerHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },
  googleHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeLink: { color: colors.accentPink, fontSize: 12, fontWeight: '700' },
  autoBadge: {
    borderRadius: 999,
    backgroundColor: colors.accentPinkMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  autoBadgeText: { color: colors.accentPink, fontSize: 11, fontWeight: '700' },
  errorText: { color: '#b45309', fontSize: 12, lineHeight: 17 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  compactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  compactBtnBusy: { opacity: 0.7 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
    maxHeight: '78%',
  },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sheetBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  pickerList: { maxHeight: 360 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 10,
  },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  choiceSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBtnText: { color: colors.accentPink, fontSize: 13, fontWeight: '600' },
};
