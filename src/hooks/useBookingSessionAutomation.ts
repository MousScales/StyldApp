import { useCallback, useEffect, useRef } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import {
  bookingNeedsSessionAutomation,
  runBookingSessionAutomation,
} from '../lib/bookingSessionAutomation';

const AUTOMATION_INTERVAL_MS = 30_000;

export function useBookingSessionAutomation() {
  const { linkedSite, bookings, refresh } = useSiteData();
  const runningRef = useRef(false);

  const tick = useCallback(async () => {
    if (!linkedSite || runningRef.current) return;
    if (!bookingNeedsSessionAutomation(bookings)) return;

    runningRef.current = true;
    try {
      const result = await runBookingSessionAutomation(linkedSite, bookings);
      if (result.started > 0 || result.assumedFinished > 0) {
        await refresh({ silent: true });
      }
    } finally {
      runningRef.current = false;
    }
  }, [bookings, linkedSite, refresh]);

  useEffect(() => {
    void tick();
    const intervalId = setInterval(() => {
      void tick();
    }, AUTOMATION_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [tick]);
}
