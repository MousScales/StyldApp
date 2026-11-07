import type { SiteBookingRecord } from './siteData';

export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeClientPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

export function normalizeClientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

export function clientNamesAreSimilar(a: string, b: string): boolean {
  const left = normalizeClientName(a);
  const right = normalizeClientName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftParts = left.split(' ');
  const rightParts = right.split(' ');
  if (
    leftParts[0] === rightParts[0] &&
    leftParts.length > 1 &&
    rightParts.length > 1 &&
    leftParts[leftParts.length - 1][0] === rightParts[rightParts.length - 1][0]
  ) {
    return true;
  }

  return (
    levenshtein(left, right) <= 2 &&
    Math.min(left.length, right.length) >= 4
  );
}

class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index]);
    }
    return this.parent[index];
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootB] = rootA;
  }
}

function unionSharedKeys(uf: UnionFind, indices: number[]) {
  if (indices.length < 2) return;
  for (let i = 1; i < indices.length; i++) {
    uf.union(indices[0], indices[i]);
  }
}

function hasContactInfo(booking: SiteBookingRecord): boolean {
  const email = normalizeClientEmail(booking.email);
  const phone = normalizeClientPhone(booking.phone);
  return Boolean(email && email.includes('@')) || phone.length >= 10;
}

/** Group booking indices that belong to the same person. */
export function groupBookingsByClient(bookings: SiteBookingRecord[]): number[][] {
  const uf = new UnionFind(bookings.length);
  const emailMap = new Map<string, number[]>();
  const phoneMap = new Map<string, number[]>();

  for (let index = 0; index < bookings.length; index++) {
    const booking = bookings[index];
    const email = normalizeClientEmail(booking.email);
    const phone = normalizeClientPhone(booking.phone);

    if (email && email.includes('@')) {
      const list = emailMap.get(email) ?? [];
      list.push(index);
      emailMap.set(email, list);
    }
    if (phone.length >= 10) {
      const list = phoneMap.get(phone) ?? [];
      list.push(index);
      phoneMap.set(phone, list);
    }
  }

  for (const indices of emailMap.values()) unionSharedKeys(uf, indices);
  for (const indices of phoneMap.values()) unionSharedKeys(uf, indices);

  // Similar names + shared email or phone (transitive union already handles shared contact).
  // Also merge similar names when both sides lack contact info.
  const noContactIndices: number[] = [];
  for (let index = 0; index < bookings.length; index++) {
    if (!hasContactInfo(bookings[index])) noContactIndices.push(index);
  }

  for (let i = 0; i < noContactIndices.length; i++) {
    for (let j = i + 1; j < noContactIndices.length; j++) {
      const a = noContactIndices[i];
      const b = noContactIndices[j];
      if (clientNamesAreSimilar(bookings[a].fullName, bookings[b].fullName)) {
        uf.union(a, b);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let index = 0; index < bookings.length; index++) {
    const root = uf.find(index);
    const list = groups.get(root) ?? [];
    list.push(index);
    groups.set(root, list);
  }

  return Array.from(groups.values());
}

export function buildClientIdentityKey(
  emails: string[],
  phones: string[],
  nameKey: string,
): string {
  const sortedEmails = [...emails].sort();
  const sortedPhones = [...phones].sort();
  if (sortedEmails.length) return sortedEmails[0];
  if (sortedPhones.length) return sortedPhones[0];
  return `name:${nameKey || 'unknown-client'}`;
}

export function uniqueContactValues(values: string[], normalize: (value: string) => string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') continue;
    const key = normalize(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
