import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { SiteBookingRecord } from './siteData';

const CALENDAR_TITLE = 'Styld Appointments';
const CALENDAR_COLOR = '#fc61a3';

export type CalendarProvider = 'apple' | 'google';

export const CALENDAR_PROVIDERS: CalendarProvider[] = ['apple', 'google'];

export type GoogleAccountOption = {
  sourceId: string;
  label: string;
};

export type GoogleCalendarChoice = {
  calendarId: string | null;
  title: string;
  subtitle: string;
  isStyldDefault: boolean;
};

export type GoogleSyncSelection = {
  sourceId: string;
  sourceName: string;
  calendarId: string | null;
  calendarTitle: string;
};

export type DeviceCalendarSyncResult = {
  created: number;
  updated: number;
  removed: number;
  total: number;
  provider: CalendarProvider;
  googleSelection?: GoogleSyncSelection;
};

export type DeviceCalendarProviderState = {
  lastSyncedAt: string | null;
  calendarId: string | null;
};

export type DeviceCalendarSyncState = {
  autoSyncProvider: CalendarProvider | null;
  apple: DeviceCalendarProviderState;
  google: DeviceCalendarProviderState;
  googleSelection: GoogleSyncSelection | null;
};

const storageKey = (userId: string, suffix: string) => `@styld/calendar_sync/${userId}/${suffix}`;

function isCancelledStatus(status: string): boolean {
  const key = status.toLowerCase().trim();
  return key === 'cancelled' || key === 'canceled';
}

export function bookingEligibleForDeviceCalendar(booking: SiteBookingRecord): boolean {
  if (!booking.startsAt) return false;
  if (isCancelledStatus(booking.bookingStatus)) return false;
  return true;
}

export function calendarProviderLabel(provider: CalendarProvider): string {
  return provider === 'apple' ? 'Apple Calendar' : 'Google Calendar';
}

export function isCalendarProviderAvailable(provider: CalendarProvider): boolean {
  if (provider === 'apple') return Platform.OS === 'ios';
  return true;
}

function sourceType(source: Calendar.Source | undefined): string {
  return (source?.type ?? '').toLowerCase();
}

function sourceName(source: Calendar.Source | undefined): string {
  return (source?.name ?? '').trim();
}

function sourceKey(source: Calendar.Source | undefined): string {
  if (!source) return '';
  if (source.id) return source.id;
  return `${sourceType(source)}:${sourceName(source).toLowerCase()}`;
}

function isICloudSource(source: Calendar.Source | undefined): boolean {
  if (!source) return false;
  const name = sourceName(source).toLowerCase();
  const type = sourceType(source);
  return name === 'icloud' || type === 'mobileme';
}

function isBirthdayOrSubscribedSource(source: Calendar.Source | undefined): boolean {
  if (!source) return false;
  const type = sourceType(source);
  return type === 'birthdays' || type === 'subscribed';
}

function isGoogleSource(source: Calendar.Source | undefined): boolean {
  if (!source || isICloudSource(source) || isBirthdayOrSubscribedSource(source)) return false;

  const name = sourceName(source);
  const haystack = `${sourceType(source)} ${name}`.toLowerCase();
  if (
    haystack.includes('google') ||
    haystack.includes('gmail') ||
    haystack.includes('googlemail') ||
    haystack.includes('com.google')
  ) {
    return true;
  }

  if (Platform.OS === 'ios' && sourceType(source) === 'caldav' && name.includes('@')) {
    return true;
  }

  return false;
}

function isAppleSource(source: Calendar.Source | undefined): boolean {
  if (!source || isGoogleSource(source) || isBirthdayOrSubscribedSource(source)) return false;
  const type = sourceType(source);
  return type === 'local' || isICloudSource(source) || type === 'exchange';
}

function sameSource(a: Calendar.Source | undefined, b: Calendar.Source | undefined): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return sourceType(a) === sourceType(b) && sourceName(a).toLowerCase() === sourceName(b).toLowerCase();
}

function calendarMatchesProvider(calendar: Calendar.Calendar, provider: CalendarProvider): boolean {
  return provider === 'google' ? isGoogleSource(calendar.source) : isAppleSource(calendar.source);
}

function calendarOnSource(calendar: Calendar.Calendar, sourceId: string, sourceNameHint?: string): boolean {
  if (calendar.source?.id && calendar.source.id === sourceId) return true;
  if (sourceNameHint && sameSource(calendar.source, { id: sourceId, name: sourceNameHint, type: calendar.source?.type ?? '' })) {
    return true;
  }
  return sourceKey(calendar.source) === sourceId;
}

function googleAccountLabel(source: Calendar.Source): string {
  const name = sourceName(source);
  if (name.includes('@')) return name;
  if (name) return name;
  return 'Google account';
}

async function loadEventMap(userId: string, provider: CalendarProvider): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(storageKey(userId, `event_map_${provider}`));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveEventMap(userId: string, provider: CalendarProvider, map: Record<string, string>) {
  await AsyncStorage.setItem(storageKey(userId, `event_map_${provider}`), JSON.stringify(map));
}

async function clearStoredCalendarId(userId: string, provider: CalendarProvider) {
  await AsyncStorage.removeItem(storageKey(userId, `calendar_id_${provider}`));
}

async function loadGoogleSyncSelection(userId: string): Promise<GoogleSyncSelection | null> {
  const raw = await AsyncStorage.getItem(storageKey(userId, 'google_selection'));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoogleSyncSelection;
    if (!parsed?.sourceId || !parsed.sourceName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveGoogleSyncSelection(userId: string, selection: GoogleSyncSelection) {
  await AsyncStorage.setItem(storageKey(userId, 'google_selection'), JSON.stringify(selection));
}

async function migrateLegacyStorage(userId: string) {
  const legacyCalendarId = await AsyncStorage.getItem(storageKey(userId, 'calendar_id'));
  if (!legacyCalendarId) return;

  const legacyEventMap = await AsyncStorage.getItem(storageKey(userId, 'event_map'));
  const legacyLastSyncedAt = await AsyncStorage.getItem(storageKey(userId, 'last_synced_at'));
  const legacyEnabled = await AsyncStorage.getItem(storageKey(userId, 'enabled'));

  let defaultProvider: CalendarProvider = Platform.OS === 'ios' ? 'apple' : 'google';

  if (Platform.OS === 'ios') {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const legacyCalendar = calendars.find((cal) => cal.id === legacyCalendarId);
      if (legacyCalendar) {
        defaultProvider = isGoogleSource(legacyCalendar.source) ? 'google' : 'apple';
        if (defaultProvider === 'google' && legacyCalendar.source) {
          await saveGoogleSyncSelection(userId, {
            sourceId: legacyCalendar.source.id ?? sourceKey(legacyCalendar.source),
            sourceName: sourceName(legacyCalendar.source),
            calendarId: legacyCalendar.title === CALENDAR_TITLE ? legacyCalendarId : null,
            calendarTitle: legacyCalendar.title === CALENDAR_TITLE ? CALENDAR_TITLE : legacyCalendar.title,
          });
        }
      }
    } catch {
      // Keep platform default.
    }
  }

  await AsyncStorage.setItem(storageKey(userId, `calendar_id_${defaultProvider}`), legacyCalendarId);
  if (legacyEventMap) {
    await AsyncStorage.setItem(storageKey(userId, `event_map_${defaultProvider}`), legacyEventMap);
  }
  if (legacyLastSyncedAt) {
    await AsyncStorage.setItem(storageKey(userId, `last_synced_at_${defaultProvider}`), legacyLastSyncedAt);
  }
  if (legacyEnabled === '1') {
    await AsyncStorage.setItem(storageKey(userId, 'auto_sync_provider'), defaultProvider);
  }

  await Promise.all([
    AsyncStorage.removeItem(storageKey(userId, 'calendar_id')),
    AsyncStorage.removeItem(storageKey(userId, 'event_map')),
    AsyncStorage.removeItem(storageKey(userId, 'last_synced_at')),
    AsyncStorage.removeItem(storageKey(userId, 'enabled')),
  ]);
}

export async function loadDeviceCalendarSyncState(userId: string): Promise<DeviceCalendarSyncState> {
  await migrateLegacyStorage(userId);

  const [autoSyncProvider, appleCalendarId, googleCalendarId, appleLastSyncedAt, googleLastSyncedAt, googleSelection] =
    await Promise.all([
      AsyncStorage.getItem(storageKey(userId, 'auto_sync_provider')),
      AsyncStorage.getItem(storageKey(userId, 'calendar_id_apple')),
      AsyncStorage.getItem(storageKey(userId, 'calendar_id_google')),
      AsyncStorage.getItem(storageKey(userId, 'last_synced_at_apple')),
      AsyncStorage.getItem(storageKey(userId, 'last_synced_at_google')),
      loadGoogleSyncSelection(userId),
    ]);

  return {
    autoSyncProvider:
      autoSyncProvider === 'apple' || autoSyncProvider === 'google' ? autoSyncProvider : null,
    apple: {
      calendarId: appleCalendarId,
      lastSyncedAt: appleLastSyncedAt,
    },
    google: {
      calendarId: googleCalendarId,
      lastSyncedAt: googleLastSyncedAt,
    },
    googleSelection,
  };
}

export async function setAutoSyncProvider(userId: string, provider: CalendarProvider | null) {
  if (!provider) {
    await AsyncStorage.removeItem(storageKey(userId, 'auto_sync_provider'));
    return;
  }
  await AsyncStorage.setItem(storageKey(userId, 'auto_sync_provider'), provider);
}

async function ensureCalendarPermission(): Promise<void> {
  const available = await Calendar.isAvailableAsync();
  if (!available) {
    throw new Error('Calendar is not available on this device.');
  }

  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return;

  const requested = await Calendar.requestCalendarPermissionsAsync();
  if (!requested.granted) {
    throw new Error('Calendar access is required to sync appointments.');
  }
}

async function collectGoogleSources(): Promise<Calendar.Source[]> {
  const seen = new Set<string>();
  const sources: Calendar.Source[] = [];

  const addSource = (source: Calendar.Source | undefined) => {
    if (!source || !isGoogleSource(source)) return;
    const key = sourceKey(source);
    if (!key || seen.has(key)) return;
    seen.add(key);
    sources.push(source);
  };

  if (Platform.OS === 'ios') {
    const deviceSources = await Calendar.getSourcesAsync();
    deviceSources.forEach(addSource);
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  calendars.forEach((cal) => addSource(cal.source));

  return sources.sort((a, b) => googleAccountLabel(a).localeCompare(googleAccountLabel(b)));
}

export async function listGoogleAccounts(): Promise<GoogleAccountOption[]> {
  await ensureCalendarPermission();
  const sources = await collectGoogleSources();
  if (sources.length === 0) {
    throw new Error(
      'Add Google Calendar on this device first: Settings → Calendar → Accounts → Add Account → Google.',
    );
  }

  return sources.map((source) => ({
    sourceId: source.id ?? sourceKey(source),
    label: googleAccountLabel(source),
  }));
}

export async function listGoogleCalendarChoices(sourceId: string): Promise<GoogleCalendarChoice[]> {
  await ensureCalendarPermission();
  const sources = await collectGoogleSources();
  const source = sources.find((item) => (item.id ?? sourceKey(item)) === sourceId);
  if (!source) {
    throw new Error('That Google account is no longer available on this device.');
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const onSource = calendars.filter(
    (cal) => cal.allowsModifications && calendarOnSource(cal, sourceId, sourceName(source)),
  );

  const styldExisting = onSource.find((cal) => cal.title === CALENDAR_TITLE);
  const choices: GoogleCalendarChoice[] = [
    {
      calendarId: styldExisting?.id ?? null,
      title: CALENDAR_TITLE,
      subtitle: styldExisting
        ? 'Use your existing Styld calendar on this account'
        : 'Create a new calendar on this Google account',
      isStyldDefault: true,
    },
  ];

  for (const cal of onSource) {
    if (cal.title === CALENDAR_TITLE) continue;
    choices.push({
      calendarId: cal.id,
      title: cal.title,
      subtitle: `Use your existing “${cal.title}” calendar`,
      isStyldDefault: false,
    });
  }

  return choices;
}

async function resolveGoogleSource(sourceId: string): Promise<Calendar.Source> {
  const sources = await collectGoogleSources();
  const source = sources.find((item) => (item.id ?? sourceKey(item)) === sourceId);
  if (!source) {
    throw new Error('That Google account is no longer available on this device.');
  }
  return source;
}

async function findProviderSource(
  provider: CalendarProvider,
  googleSelection?: GoogleSyncSelection | null,
): Promise<Calendar.Source> {
  if (!isCalendarProviderAvailable(provider)) {
    throw new Error(`${calendarProviderLabel(provider)} is available on iPhone and iPad only.`);
  }

  if (provider === 'google') {
    if (googleSelection?.sourceId) {
      return resolveGoogleSource(googleSelection.sourceId);
    }
    const accounts = await collectGoogleSources();
    if (accounts.length === 1) return accounts[0];
    throw new Error('Choose a Google account before syncing.');
  }

  if (Platform.OS === 'ios') {
    const sources = await Calendar.getSourcesAsync();
    const icloud = sources.find(isICloudSource);
    if (icloud) return icloud;

    const local = sources.find((item) => sourceType(item) === 'local');
    if (local) return local;

    const apple = sources.find(isAppleSource);
    if (apple) return apple;

    throw new Error('Could not find an Apple or iCloud calendar account on this device.');
  }

  throw new Error(`${calendarProviderLabel(provider)} is available on iPhone and iPad only.`);
}

async function createProviderCalendar(provider: CalendarProvider, source: Calendar.Source): Promise<string> {
  try {
    if (Platform.OS === 'ios') {
      return await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        color: CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source.id,
        source,
        name: CALENDAR_TITLE,
      });
    }

    return await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      name: CALENDAR_TITLE,
      ownerAccount: source.name || 'Google',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } catch {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.filter(
      (cal) =>
        cal.allowsModifications &&
        calendarMatchesProvider(cal, provider) &&
        sameSource(cal.source, source),
    );

    const existing = writable.find((cal) => cal.title === CALENDAR_TITLE);
    if (existing) return existing.id;

    if (writable[0]) return writable[0].id;

    throw new Error(
      `${calendarProviderLabel(provider)} does not allow new calendars on this device. Open the Calendar app, create a writable calendar, and try again.`,
    );
  }
}

async function resolveGoogleCalendarId(
  userId: string,
  selection: GoogleSyncSelection,
): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const source = await resolveGoogleSource(selection.sourceId);

  if (selection.calendarId) {
    const chosen = calendars.find((cal) => cal.id === selection.calendarId);
    if (
      chosen?.allowsModifications &&
      calendarOnSource(chosen, selection.sourceId, selection.sourceName) &&
      isGoogleSource(chosen.source)
    ) {
      await AsyncStorage.setItem(storageKey(userId, 'calendar_id_google'), chosen.id);
      return chosen.id;
    }
    await clearStoredCalendarId(userId, 'google');
  }

  const styldOnSource = calendars.find(
    (cal) =>
      cal.title === CALENDAR_TITLE &&
      cal.allowsModifications &&
      calendarOnSource(cal, selection.sourceId, selection.sourceName),
  );
  if (styldOnSource) {
    await AsyncStorage.setItem(storageKey(userId, 'calendar_id_google'), styldOnSource.id);
    return styldOnSource.id;
  }

  const calendarId = await createProviderCalendar('google', source);
  await AsyncStorage.setItem(storageKey(userId, 'calendar_id_google'), calendarId);
  return calendarId;
}

async function resolveStyldCalendarId(
  userId: string,
  provider: CalendarProvider,
  googleSelection?: GoogleSyncSelection | null,
): Promise<string> {
  if (provider === 'google') {
    if (!googleSelection) {
      const saved = await loadGoogleSyncSelection(userId);
      if (saved) return resolveGoogleCalendarId(userId, saved);
      const accounts = await collectGoogleSources();
      if (accounts.length === 1) {
        const defaultSelection: GoogleSyncSelection = {
          sourceId: accounts[0].id ?? sourceKey(accounts[0]),
          sourceName: sourceName(accounts[0]),
          calendarId: null,
          calendarTitle: CALENDAR_TITLE,
        };
        await saveGoogleSyncSelection(userId, defaultSelection);
        return resolveGoogleCalendarId(userId, defaultSelection);
      }
      throw new Error('Choose a Google account before syncing.');
    }
    return resolveGoogleCalendarId(userId, googleSelection);
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const stored = await AsyncStorage.getItem(storageKey(userId, `calendar_id_${provider}`));

  if (stored) {
    const existingStored = calendars.find((cal) => cal.id === stored);
    if (existingStored?.allowsModifications && calendarMatchesProvider(existingStored, provider)) {
      return stored;
    }
    await clearStoredCalendarId(userId, provider);
  }

  const existing = calendars.find(
    (cal) =>
      cal.title === CALENDAR_TITLE &&
      cal.allowsModifications &&
      calendarMatchesProvider(cal, provider),
  );
  if (existing) {
    await AsyncStorage.setItem(storageKey(userId, `calendar_id_${provider}`), existing.id);
    return existing.id;
  }

  const source = await findProviderSource(provider);
  const calendarId = await createProviderCalendar(provider, source);

  const refreshed = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const created = refreshed.find((cal) => cal.id === calendarId);

  if (created && !calendarMatchesProvider(created, provider)) {
    await clearStoredCalendarId(userId, provider);
    throw new Error(`Could not create a ${calendarProviderLabel(provider)} calendar on this device.`);
  }

  await AsyncStorage.setItem(storageKey(userId, `calendar_id_${provider}`), calendarId);
  return calendarId;
}

function buildEventTitle(booking: SiteBookingRecord): string {
  const status = booking.bookingStatus.toLowerCase().trim();
  const prefix = status === 'pending_approval' ? '[Pending] ' : '';
  return `${prefix}${booking.fullName} — ${booking.service}`;
}

function buildEventNotes(booking: SiteBookingRecord): string {
  const lines = [
    'Synced from Styld',
    `Client: ${booking.fullName}`,
    booking.phone ? `Phone: ${booking.phone}` : null,
    booking.email ? `Email: ${booking.email}` : null,
    `Status: ${booking.bookingStatus}`,
    booking.isTravelBooking ? 'Travel appointment' : null,
    booking.notes?.trim() ? `Client notes: ${booking.notes.trim()}` : null,
    booking.stylistNotes?.trim() ? `Stylist notes: ${booking.stylistNotes.trim()}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

function buildEventPayload(booking: SiteBookingRecord) {
  const startDate = booking.startsAt!;
  const endDate = new Date(startDate.getTime() + Math.max(15, booking.durationMinutes) * 60_000);

  return {
    title: buildEventTitle(booking),
    startDate,
    endDate,
    location: booking.location?.trim() || undefined,
    notes: buildEventNotes(booking),
    timeZone: undefined,
  };
}

export async function syncBookingsToDeviceCalendar(
  userId: string,
  bookings: SiteBookingRecord[],
  provider: CalendarProvider,
  googleSelection?: GoogleSyncSelection | null,
): Promise<DeviceCalendarSyncResult> {
  await ensureCalendarPermission();

  const resolvedGoogleSelection =
    provider === 'google' ? googleSelection ?? (await loadGoogleSyncSelection(userId)) : null;

  const calendarId = await resolveStyldCalendarId(userId, provider, resolvedGoogleSelection);
  const eventMap = await loadEventMap(userId, provider);

  const eligible = bookings.filter(bookingEligibleForDeviceCalendar);
  const eligibleIds = new Set(eligible.map((b) => b.id));

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const booking of eligible) {
    const payload = buildEventPayload(booking);
    const existingEventId = eventMap[booking.id];

    if (existingEventId) {
      try {
        await Calendar.updateEventAsync(existingEventId, payload);
        updated += 1;
        continue;
      } catch {
        delete eventMap[booking.id];
      }
    }

    const eventId = await Calendar.createEventAsync(calendarId, payload);
    eventMap[booking.id] = eventId;
    created += 1;
  }

  for (const [bookingId, eventId] of Object.entries(eventMap)) {
    if (eligibleIds.has(bookingId)) continue;
    try {
      await Calendar.deleteEventAsync(eventId);
    } catch {
      // Event may already be gone on device.
    }
    delete eventMap[bookingId];
    removed += 1;
  }

  await saveEventMap(userId, provider, eventMap);
  const syncedAt = new Date().toISOString();
  await AsyncStorage.setItem(storageKey(userId, `last_synced_at_${provider}`), syncedAt);
  await setAutoSyncProvider(userId, provider);

  if (provider === 'google' && resolvedGoogleSelection) {
    await saveGoogleSyncSelection(userId, resolvedGoogleSelection);
  }

  return {
    created,
    updated,
    removed,
    total: eligible.length,
    provider,
    googleSelection: resolvedGoogleSelection ?? undefined,
  };
}

export async function removeAllDeviceCalendarEvents(userId: string, provider: CalendarProvider) {
  const eventMap = await loadEventMap(userId, provider);
  await Promise.all(
    Object.values(eventMap).map(async (eventId) => {
      try {
        await Calendar.deleteEventAsync(eventId);
      } catch {
        // ignore
      }
    }),
  );
  await saveEventMap(userId, provider, {});
  await AsyncStorage.removeItem(storageKey(userId, `last_synced_at_${provider}`));
}

export function formatGoogleSyncTarget(selection: GoogleSyncSelection | null | undefined): string | null {
  if (!selection) return null;
  if (selection.calendarTitle && selection.calendarTitle !== CALENDAR_TITLE) {
    return `${selection.sourceName} · ${selection.calendarTitle}`;
  }
  return `${selection.sourceName} · ${CALENDAR_TITLE}`;
}
