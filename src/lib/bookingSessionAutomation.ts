import { LinkedSite } from './linkedSites';
import { assumeFinishBookingSession, startBookingSession } from './siteAdmin';
import { SiteBookingRecord } from './siteData';

export { isBookingAssumedFinished } from './siteData';

export function getBookingEndMs(booking: SiteBookingRecord): number | null {
  if (!booking.startsAt) return null;
  return booking.startsAt.getTime() + booking.durationMinutes * 60_000;
}

export function shouldAutoStartBooking(booking: SiteBookingRecord, now = Date.now()): boolean {
  if (booking.bookingStatus.toLowerCase() !== 'confirmed') return false;
  if (!booking.startsAt) return false;
  return now >= booking.startsAt.getTime();
}

export function shouldAssumeFinishBooking(booking: SiteBookingRecord, now = Date.now()): boolean {
  if (booking.bookingStatus.toLowerCase() !== 'in_progress') return false;
  if (booking.sessionLiveEngagedAt) return false;
  const endMs = getBookingEndMs(booking);
  if (!endMs) return false;
  return now > endMs;
}

export function bookingNeedsSessionAutomation(
  bookings: SiteBookingRecord[],
  now = Date.now(),
): boolean {
  return bookings.some(
    (booking) => shouldAutoStartBooking(booking, now) || shouldAssumeFinishBooking(booking, now),
  );
}

export async function runBookingSessionAutomation(
  linkedSite: LinkedSite,
  bookings: SiteBookingRecord[],
  now = Date.now(),
): Promise<{ started: number; assumedFinished: number }> {
  let started = 0;
  let assumedFinished = 0;

  for (const booking of bookings) {
    if (!shouldAutoStartBooking(booking, now)) continue;
    try {
      await startBookingSession(linkedSite, booking.id);
      started += 1;
    } catch (err) {
      console.warn('auto-start booking failed', booking.id, err);
    }
  }

  for (const booking of bookings) {
    if (!shouldAssumeFinishBooking(booking, now)) continue;
    try {
      await assumeFinishBookingSession(linkedSite, booking.id);
      assumedFinished += 1;
    } catch (err) {
      console.warn('assume-finish booking failed', booking.id, err);
    }
  }

  return { started, assumedFinished };
}
