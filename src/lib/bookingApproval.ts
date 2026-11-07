import { Alert } from 'react-native';
import { SiteBookingRecord } from './siteData';
import { LinkedSite } from './linkedSites';
import { approveBooking } from './siteAdmin';

export function getPendingApprovalBookingIds(bookings: SiteBookingRecord[]): string[] {
  return bookings
    .filter((booking) => booking.bookingStatus.toLowerCase() === 'pending_approval')
    .map((booking) => booking.id);
}

export async function approveAllPendingBookings(
  linkedSite: LinkedSite,
  bookingIds: string[],
): Promise<number> {
  if (bookingIds.length === 0) return 0;

  let accepted = 0;
  let lastError: Error | null = null;

  for (const bookingId of bookingIds) {
    try {
      await approveBooking(linkedSite, bookingId);
      accepted += 1;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Could not accept booking.');
    }
  }

  if (accepted === 0) {
    throw lastError ?? new Error('Could not accept pending bookings.');
  }

  return accepted;
}

export function promptDisableBookingApproval({
  pendingCount,
  onConfirm,
}: {
  pendingCount: number;
  onConfirm: () => void | Promise<void>;
}) {
  const bookingWord = pendingCount === 1 ? 'booking' : 'bookings';
  const pronoun = pendingCount === 1 ? 'it' : 'them';
  const thoseWord = pendingCount === 1 ? 'that appointment' : 'those appointments';

  Alert.alert(
    'Accept pending bookings?',
    `You have ${pendingCount} pending ${bookingWord} waiting for approval. Turning off manual approval will automatically accept ${pronoun} and confirm ${thoseWord}.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept all & turn off',
        onPress: () => {
          void onConfirm();
        },
      },
    ],
  );
}

export function handleBookingApprovalToggle({
  enabled,
  bookings,
  linkedSite,
  onSetEnabled,
  onAfterAutoAccept,
}: {
  enabled: boolean;
  bookings: SiteBookingRecord[];
  linkedSite: LinkedSite | null;
  onSetEnabled: (requireBookingApproval: boolean) => void | Promise<void>;
  onAfterAutoAccept?: () => void | Promise<void>;
}) {
  if (!enabled) {
    void onSetEnabled(true);
    return;
  }

  const pendingIds = getPendingApprovalBookingIds(bookings);
  if (pendingIds.length === 0 || !linkedSite) {
    void onSetEnabled(false);
    return;
  }

  promptDisableBookingApproval({
    pendingCount: pendingIds.length,
    onConfirm: async () => {
      try {
        await approveAllPendingBookings(linkedSite, pendingIds);
        await onSetEnabled(false);
        await onAfterAutoAccept?.();
      } catch (err) {
        Alert.alert(
          'Could not complete',
          err instanceof Error ? err.message : 'Try again from the dashboard.',
        );
      }
    },
  });
}
