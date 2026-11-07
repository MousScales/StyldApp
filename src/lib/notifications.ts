import { AppNotification } from '../components/NotificationsPanel';
import { SiteReview } from '../data/reviewsSettings';
import { SiteBookingRecord } from './siteData';

type SiteInquiry = { id: string; name: string; createdAt: Date };

type NotificationDraft = AppNotification & { sortAt: number };

const RECENT_MS = 90 * 24 * 60 * 60 * 1000;

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function formatAppointmentWhen(startsAt: Date | null): string {
  if (!startsAt) return 'a time to be scheduled';

  const time = startsAt.toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(startsAt);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return `today at ${time}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (target.getTime() === tomorrow.getTime()) return `tomorrow at ${time}`;

  const weekday = startsAt.toLocaleDateString('default', { weekday: 'long' });
  return `${weekday} at ${time}`;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function isRecent(date: Date | null): boolean {
  if (!date) return false;
  return date.getTime() >= Date.now() - RECENT_MS;
}

function isUpcoming(booking: SiteBookingRecord): boolean {
  const status = booking.bookingStatus.toLowerCase();
  if (status === 'cancelled' || status === 'canceled' || status === 'completed') {
    return false;
  }
  if (booking.startsAt && booking.startsAt.getTime() < Date.now()) {
    return false;
  }
  return true;
}

function paymentMethodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === 'cash') return 'Cash';
  if (m === 'tap_to_pay') return 'Tap to Pay';
  if (m === 'payment_link') return 'Payment link';
  if (m === 'payment_link_sent') return 'Payment link sent';
  if (m === 'card') return 'Card';
  return '';
}

function buildBookingNotificationDrafts(bookings: SiteBookingRecord[]): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  for (const booking of bookings) {
    const when = formatAppointmentWhen(booking.startsAt);
    const createdAt = booking.createdAt;
    const status = booking.bookingStatus.toLowerCase();

    if (status === 'cancelled' || status === 'canceled') {
      if (!isRecent(createdAt)) continue;
      drafts.push({
        id: `cancelled-${booking.id}`,
        title: 'Booking cancelled',
        body: `${booking.fullName} cancelled ${booking.service}.`,
        time: formatRelativeTime(createdAt),
        icon: 'close-circle-outline',
        unread: true,
        sortAt: createdAt.getTime(),
      });
      continue;
    }

    if (status === 'pending_approval' && isRecent(createdAt)) {
      drafts.push({
        id: `pending-${booking.id}`,
        title: 'Booking request',
        body: `${booking.fullName} requested ${booking.service} for ${when}. Tap to accept or decline.`,
        time: formatRelativeTime(createdAt),
        icon: 'hourglass-outline',
        unread: true,
        sortAt: createdAt.getTime() + 2,
      });

      if (booking.depositPaid && booking.depositAmount > 0) {
        drafts.push({
          id: `deposit-${booking.id}`,
          title: 'Deposit received',
          body: `${formatMoney(booking.depositAmount)} deposit from ${booking.fullName} for ${booking.service}.`,
          time: formatRelativeTime(createdAt),
          icon: 'card-outline',
          unread: true,
          sortAt: createdAt.getTime() + 1,
        });
      }
      continue;
    }

    if (status === 'in_progress' && booking.sessionStartedAt) {
      drafts.push({
        id: `session-${booking.id}`,
        title: 'Session in progress',
        body: `${booking.service} with ${booking.fullName} — view timer and checkout when ready.`,
        time: formatRelativeTime(booking.sessionStartedAt),
        icon: 'timer-outline',
        unread: true,
        sortAt: booking.sessionStartedAt.getTime() + 3,
      });
    }

    if (isRecent(createdAt) && status !== 'in_progress') {
      drafts.push({
        id: `new-${booking.id}`,
        title: 'New booking',
        body: `${booking.fullName} booked ${booking.service} for ${when}.`,
        time: formatRelativeTime(createdAt),
        icon: 'calendar-outline',
        unread: true,
        sortAt: createdAt.getTime(),
      });
    }

    if (
      booking.depositPaid &&
      booking.depositAmount > 0 &&
      booking.balanceCollectedCents <= 0 &&
      isRecent(createdAt)
    ) {
      drafts.push({
        id: `deposit-${booking.id}`,
        title: 'Deposit received',
        body: `${formatMoney(booking.depositAmount)} deposit from ${booking.fullName} for ${booking.service}.`,
        time: formatRelativeTime(createdAt),
        icon: 'card-outline',
        unread: true,
        sortAt: createdAt.getTime() + 1,
      });
    }

    const collectedAt = booking.balanceCollectedAt ?? booking.sessionEndedAt ?? booking.completedAt;
    if (booking.balanceCollectedCents > 0 && isRecent(collectedAt)) {
      const total = booking.balanceCollectedCents / 100;
      const method = paymentMethodLabel(booking.paymentMethodAtService);
      const tipText =
        booking.tipAmount > 0 ? ` (${formatMoney(booking.tipAmount)} tip included)` : '';
      drafts.push({
        id: `checkout-payment-${booking.id}`,
        title: 'Payment collected',
        body: `${formatMoney(total)} from ${booking.fullName} for ${booking.service}${tipText}${method ? ` · ${method}` : ''}.`,
        time: formatRelativeTime(collectedAt!),
        icon: 'wallet-outline',
        unread: true,
        sortAt: collectedAt!.getTime() + 2,
      });
    }

    if (status === 'confirmed' && isUpcoming(booking)) {
      drafts.push({
        id: `confirmed-${booking.id}`,
        title: 'Upcoming appointment',
        body: `${booking.fullName} — ${booking.service} ${when}.`,
        time: formatRelativeTime(booking.startsAt ?? createdAt),
        icon: 'checkmark-circle-outline',
        unread: true,
        sortAt: (booking.startsAt ?? createdAt).getTime(),
      });
    }

    if (status === 'completed') {
      const completedAt = booking.completedAt ?? booking.sessionEndedAt ?? booking.startsAt ?? createdAt;
      if (!isRecent(completedAt)) continue;

      const durationText =
        booking.actualDurationMinutes > 0 ? ` · ${booking.actualDurationMinutes} min` : '';
      const tipText =
        booking.tipAmount > 0 ? ` · ${formatMoney(booking.tipAmount)} tip` : '';

      drafts.push({
        id: `completed-${booking.id}`,
        title: 'Appointment completed',
        body: `${booking.service} with ${booking.fullName}${durationText}${tipText}.`,
        time: formatRelativeTime(completedAt),
        icon: 'checkmark-done-outline',
        unread: true,
        sortAt: completedAt.getTime(),
      });
    }
  }

  return drafts;
}

function finalizeDrafts(drafts: NotificationDraft[]): AppNotification[] {
  const byId = new Map<string, NotificationDraft>();
  for (const draft of drafts) {
    const existing = byId.get(draft.id);
    if (!existing || draft.sortAt > existing.sortAt) {
      byId.set(draft.id, draft);
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 50)
    .map(({ sortAt: _sortAt, ...notification }) => notification);
}

export function buildNotificationsFromBookings(bookings: SiteBookingRecord[]): AppNotification[] {
  return finalizeDrafts(buildBookingNotificationDrafts(bookings));
}

function buildReviewNotifications(reviews: SiteReview[]): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  for (const review of reviews) {
    if (!review.published) continue;
    if (!isRecent(review.createdAt)) continue;

    drafts.push({
      id: `review-${review.id}`,
      title: 'New client review',
      body: `${review.clientName} left a ${review.rating}-star review on your site.`,
      time: formatRelativeTime(review.createdAt),
      icon: 'star-outline',
      unread: true,
      sortAt: review.createdAt.getTime(),
    });
  }

  return drafts;
}

function buildInquiryNotifications(inquiries: SiteInquiry[]): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  for (const inquiry of inquiries) {
    if (!isRecent(inquiry.createdAt)) continue;

    drafts.push({
      id: `inquiry-${inquiry.id}`,
      title: 'New site inquiry',
      body: `${inquiry.name} sent a message from your website.`,
      time: formatRelativeTime(inquiry.createdAt),
      icon: 'mail-outline',
      unread: true,
      sortAt: inquiry.createdAt.getTime(),
    });
  }

  return drafts;
}

export function buildAllNotifications(
  bookings: SiteBookingRecord[],
  reviews: SiteReview[] = [],
  inquiries: SiteInquiry[] = [],
): AppNotification[] {
  return finalizeDrafts([
    ...buildBookingNotificationDrafts(bookings),
    ...buildReviewNotifications(reviews),
    ...buildInquiryNotifications(inquiries),
  ]);
}
