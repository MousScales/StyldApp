export type Booking = {
  id: string;
  service: string;
  styleId?: string;
  date: string;
  time?: string;
  amount: number;
  hairType: string;
  status: 'completed' | 'upcoming' | 'cancelled' | 'pending' | 'in_progress' | 'assumed_finished';
  productCount?: number;
  bookingStatus?: string;
};

export type FavoriteOrder = {
  service: string;
  styleId?: string;
  count: number;
};

export type Client = {
  id: string;
  name: string;
  /** Most recent non-empty email (legacy primary field). */
  email: string;
  /** Most recent non-empty phone (legacy primary field). */
  phone: string;
  /** All unique emails seen across merged bookings. */
  emails: string[];
  /** All unique phones seen across merged bookings. */
  phones: string[];
  /** Latest current-hair photo path, when uploaded on a booking. */
  photoHairPath?: string;
  /** Booking id folder for resolving signed hair photo URLs. */
  photoStorageBookingId?: string;
  location: string;
  memberSince: string;
  totalSpent: number;
  totalBookings: number;
  hairTypes: string[];
  notes: string;
  favoriteOrders: FavoriteOrder[];
  pastBookings: Booking[];
  avgSessionMinutes: number;
  totalTips: number;
};

export function getClientEmails(client: Client): string[] {
  if (client.emails.length) return client.emails;
  const email = client.email.trim();
  return email && email !== '—' ? [email] : [];
}

export function getClientPhones(client: Client): string[] {
  if (client.phones.length) return client.phones;
  const phone = client.phone.trim();
  return phone && phone !== '—' ? [phone] : [];
}

export function clientHasValidEmail(client: Client): boolean {
  return getClientEmails(client).some((email) => email.includes('@'));
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`;
}
