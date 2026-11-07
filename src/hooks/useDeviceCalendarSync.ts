import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  listGoogleAccounts,
  listGoogleCalendarChoices,
  loadDeviceCalendarSyncState,
  saveGoogleSyncSelection,
  syncBookingsToDeviceCalendar,
  type CalendarProvider,
  type DeviceCalendarSyncResult,
  type DeviceCalendarSyncState,
  type GoogleAccountOption,
  type GoogleCalendarChoice,
  type GoogleSyncSelection,
} from '../lib/deviceCalendarSync';

export function useDeviceCalendarSync() {
  const { user } = useAuth();
  const { bookings, hasLinkedSite } = useSiteData();
  const userId = user?.id ?? '';

  const [state, setState] = useState<DeviceCalendarSyncState>({
    autoSyncProvider: null,
    apple: { lastSyncedAt: null, calendarId: null },
    google: { lastSyncedAt: null, calendarId: null },
    googleSelection: null,
  });
  const [syncingProvider, setSyncingProvider] = useState<CalendarProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const syncInFlight = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleSelectionRef = useRef<GoogleSyncSelection | null>(null);

  useEffect(() => {
    googleSelectionRef.current = state.googleSelection;
  }, [state.googleSelection]);

  useEffect(() => {
    if (!userId) {
      setInitialized(true);
      return;
    }

    let cancelled = false;
    void loadDeviceCalendarSyncState(userId).then((next) => {
      if (cancelled) return;
      setState(next);
      setInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const syncNow = useCallback(
    async (
      provider: CalendarProvider,
      googleSelection?: GoogleSyncSelection | null,
    ): Promise<DeviceCalendarSyncResult | null> => {
      if (!userId || !hasLinkedSite) return null;
      if (syncInFlight.current) return null;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      syncInFlight.current = true;
      setSyncingProvider(provider);
      setError(null);

      try {
        const selection =
          provider === 'google'
            ? googleSelection ?? googleSelectionRef.current
            : null;

        const result = await syncBookingsToDeviceCalendar(userId, bookings, provider, selection);
        const syncedAt = new Date().toISOString();
        setState((prev) => ({
          ...prev,
          autoSyncProvider: provider,
          googleSelection: result.googleSelection ?? prev.googleSelection,
          [provider]: {
            ...prev[provider],
            lastSyncedAt: syncedAt,
          },
        }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not sync calendar';
        setError(message);
        throw err;
      } finally {
        syncInFlight.current = false;
        setSyncingProvider(null);
      }
    },
    [bookings, hasLinkedSite, userId],
  );

  const loadGoogleAccounts = useCallback(async (): Promise<GoogleAccountOption[]> => {
    return listGoogleAccounts();
  }, []);

  const loadGoogleCalendarChoices = useCallback(async (sourceId: string): Promise<GoogleCalendarChoice[]> => {
    return listGoogleCalendarChoices(sourceId);
  }, []);

  const persistGoogleSelection = useCallback(
    async (selection: GoogleSyncSelection) => {
      if (!userId) return;
      await saveGoogleSyncSelection(userId, selection);
      setState((prev) => ({
        ...prev,
        googleSelection: selection,
      }));
    },
    [userId],
  );

  const scheduleAutoSync = useCallback(() => {
    const provider = state.autoSyncProvider;
    if (!provider || !userId || !hasLinkedSite) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void syncNow(provider).catch(() => {
        // error stored in hook state
      });
    }, 1200);
  }, [hasLinkedSite, state.autoSyncProvider, syncNow, userId]);

  useEffect(() => {
    scheduleAutoSync();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [bookings, scheduleAutoSync]);

  useEffect(() => {
    if (!state.autoSyncProvider) return;

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') scheduleAutoSync();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [scheduleAutoSync, state.autoSyncProvider]);

  return {
    syncNow,
    loadGoogleAccounts,
    loadGoogleCalendarChoices,
    persistGoogleSelection,
    syncingProvider,
    error,
    initialized,
    hasLinkedSite,
    autoSyncProvider: state.autoSyncProvider,
    appleLastSyncedAt: state.apple.lastSyncedAt,
    googleLastSyncedAt: state.google.lastSyncedAt,
    googleSelection: state.googleSelection,
    appointmentCount: bookings.filter((b) => b.startsAt && b.bookingStatus.toLowerCase() !== 'cancelled').length,
  };
}
