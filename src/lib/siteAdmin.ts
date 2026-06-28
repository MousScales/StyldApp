import { SupabaseClient } from '@supabase/supabase-js';
import { PortfolioMediaType } from '../data/siteTheme';
import { STYLE_COVER_BUCKET } from '../data/serviceCatalog';
import { uploadStyleCoverImage as uploadStyleCoverBlob, uploadUserSiteImage } from './siteMedia';
import { cancelBookingViaEdge } from './bookingCancel';
import { createLinkedSiteClient, getLinkedTableName, LinkedSite } from './linkedSites';
import { supabase } from './supabase';

export type BlockedInterval = {
  id: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export type ManualBookingInput = {
  fullName: string;
  phone: string;
  email: string;
  styleId: string;
  styleName: string;
  serviceAddress?: string;
  notes?: string;
  appointmentStartsAt: Date;
  durationMinutes: number;
  estimatedTotal: number;
  hairLength?: string;
};

function getClient(linkedSite: LinkedSite): {
  client: SupabaseClient;
  tableName: string;
  userId: string;
} {
  const client = createLinkedSiteClient(linkedSite);
  const tableName = getLinkedTableName(linkedSite);
  if (!client || !tableName) {
    throw new Error('Missing site data configuration.');
  }
  return { client, tableName, userId: linkedSite.user_id };
}

export async function loadBlockedIntervals(linkedSite: LinkedSite): Promise<BlockedInterval[]> {
  const { client, tableName, userId } = getClient(linkedSite);

  const { data, error } = await client
    .from(tableName)
    .select('id, data')
    .eq('user_id', userId)
    .eq('record_type', 'blocked_interval')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const payload = (row.data ?? {}) as Record<string, unknown>;
      const startsAt = payload.starts_at ? String(payload.starts_at) : '';
      const endsAt = payload.ends_at ? String(payload.ends_at) : '';
      if (!startsAt || !endsAt) return null;

      return {
        id: String(row.id),
        startsAt,
        endsAt,
        note: payload.note ? String(payload.note) : null,
      };
    })
    .filter((row): row is BlockedInterval => row !== null);
}

export async function addBlockedInterval(
  linkedSite: LinkedSite,
  input: { startsAt: Date; endsAt: Date; note?: string },
): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);

  const { error } = await client.from(tableName).insert({
    user_id: userId,
    record_type: 'blocked_interval',
    data: {
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      note: input.note?.trim() || null,
    },
  });

  if (error) throw new Error(error.message);
}

export async function deleteBlockedInterval(
  linkedSite: LinkedSite,
  blockId: string,
): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);
  const { error } = await client
    .from(tableName)
    .delete()
    .eq('user_id', userId)
    .eq('id', blockId);
  if (error) throw new Error(error.message);
}

export async function upsertStyleCoverImage(
  linkedSite: LinkedSite,
  styleId: string,
  storagePath: string,
): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);

  const { data: existing, error: readError } = await client
    .from(tableName)
    .select('id')
    .eq('user_id', userId)
    .eq('record_type', 'style_cover_image')
    .eq('record_key', styleId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const payload = {
    data: { storage_path: storagePath },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await client.from(tableName).update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await client.from(tableName).insert({
    user_id: userId,
    record_type: 'style_cover_image',
    record_key: styleId,
    ...payload,
  });

  if (error) throw new Error(error.message);
}

export async function removeStyleCoverImage(
  linkedSite: LinkedSite,
  styleId: string,
): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);
  const { error } = await client
    .from(tableName)
    .delete()
    .eq('user_id', userId)
    .eq('record_type', 'style_cover_image')
    .eq('record_key', styleId);

  if (error) throw new Error(error.message);
}

export async function uploadStyleCoverFromUri(
  linkedSite: LinkedSite,
  styleId: string,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  const storagePath = await uploadStyleCoverBlob(linkedSite.user_id, styleId, fileUri, mimeType);
  await upsertStyleCoverImage(linkedSite, styleId, storagePath);
  return storagePath;
}

export async function uploadHeroImageFromUri(
  linkedSite: LinkedSite,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadUserSiteImage(linkedSite.user_id, fileUri, 'hero', mimeType);
}

export async function uploadLogoImageFromUri(
  linkedSite: LinkedSite,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadUserSiteImage(linkedSite.user_id, fileUri, 'logo', mimeType);
}

export async function uploadGalleryImageFromUri(
  linkedSite: LinkedSite,
  slot: number,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadUserSiteImage(linkedSite.user_id, fileUri, `gallery_${slot}`, mimeType);
}

export async function uploadPortfolioMediaFromUri(
  linkedSite: LinkedSite,
  fileUri: string,
  mimeType?: string | null,
  mediaType: PortfolioMediaType = 'image',
): Promise<{ storagePath: string; mediaType: PortfolioMediaType }> {
  const isVideo =
    mediaType === 'video' ||
    mimeType?.startsWith('video/') ||
    /\.(mp4|mov|m4v|webm)(\?|$)/i.test(fileUri);
  const folder = isVideo ? 'portfolio_video' : 'portfolio';
  const storagePath = await uploadUserSiteImage(
    linkedSite.user_id,
    fileUri,
    folder,
    mimeType,
    isVideo ? 'video' : 'image',
  );
  return { storagePath, mediaType: isVideo ? 'video' : 'image' };
}

export async function uploadProductImageFromUri(
  linkedSite: LinkedSite,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadUserSiteImage(linkedSite.user_id, fileUri, 'products', mimeType, 'image');
}

export async function uploadCertificationMediaFromUri(
  linkedSite: LinkedSite,
  fileUri: string,
  mimeType?: string | null,
): Promise<{ storagePath: string; mediaType: PortfolioMediaType }> {
  const storagePath = await uploadUserSiteImage(
    linkedSite.user_id,
    fileUri,
    'certifications',
    mimeType,
    'image',
  );
  return { storagePath, mediaType: 'image' };
}

export async function uploadStackImageFromUri(
  linkedSite: LinkedSite,
  slot: number,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadUserSiteImage(linkedSite.user_id, fileUri, `stack_${slot}`, mimeType);
}

export async function createManualBooking(
  linkedSite: LinkedSite,
  input: ManualBookingInput,
): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);
  const startsAt = input.appointmentStartsAt;

  const { error } = await client.from(tableName).insert({
    user_id: userId,
    record_type: 'booking',
    data: {
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      style_id: input.styleId,
      style_name: input.styleName,
      service_address: input.serviceAddress?.trim() || null,
      notes: input.notes?.trim() || null,
      appointment_starts_at: startsAt.toISOString(),
      appointment_date: startsAt.toISOString().slice(0, 10),
      duration_minutes: input.durationMinutes,
      estimated_total: input.estimatedTotal,
      deposit_amount: 0,
      payment_status: 'paid',
      booking_status: 'confirmed',
      source: 'admin_dashboard',
      hair_length: input.hairLength || null,
    },
  });

  if (error) throw new Error(error.message);
}

async function readBookingRecord(linkedSite: LinkedSite, bookingId: string) {
  const { client, tableName, userId } = getClient(linkedSite);

  const { data: existing, error: readError } = await client
    .from(tableName)
    .select('id, data')
    .eq('user_id', userId)
    .eq('record_type', 'booking')
    .eq('id', bookingId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error('Booking not found.');

  return {
    client,
    tableName,
    data: (existing.data ?? {}) as Record<string, unknown>,
  };
}

async function writeBookingData(
  linkedSite: LinkedSite,
  bookingId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { client, tableName } = getClient(linkedSite);

  const { error } = await client
    .from(tableName)
    .update({
      data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);
}

export async function startBookingSession(linkedSite: LinkedSite, bookingId: string): Promise<void> {
  const { data } = await readBookingRecord(linkedSite, bookingId);
  const status = String(data.booking_status ?? '').toLowerCase();
  if (status === 'cancelled' || status === 'canceled' || status === 'completed') {
    throw new Error('This booking cannot be started.');
  }
  if (status === 'in_progress') return;

  await writeBookingData(linkedSite, bookingId, {
    ...data,
    booking_status: 'in_progress',
    session_started_at: new Date().toISOString(),
    session_ended_at: null,
  });
}

export async function updateBookingSessionNotes(
  linkedSite: LinkedSite,
  bookingId: string,
  stylistNotes: string,
): Promise<void> {
  const { data } = await readBookingRecord(linkedSite, bookingId);
  await writeBookingData(linkedSite, bookingId, {
    ...data,
    stylist_notes: stylistNotes.trim(),
  });
}

export async function recordBookingCashPayment(
  linkedSite: LinkedSite,
  bookingId: string,
  input: { balanceAmount: number; tipAmount: number },
): Promise<void> {
  const { data } = await readBookingRecord(linkedSite, bookingId);
  const balanceCents = Math.max(0, Math.round(input.balanceAmount * 100));
  const tip = Math.max(0, input.tipAmount);

  await writeBookingData(linkedSite, bookingId, {
    ...data,
    payment_status: 'paid',
    payment_method_at_service: 'cash',
    balance_collected_cents: balanceCents,
    tip_amount: tip,
    balance_collected_at: new Date().toISOString(),
  });
}

export async function recordBookingInPersonPayment(
  linkedSite: LinkedSite,
  bookingId: string,
  input: {
    balanceAmountCents: number;
    tipAmount: number;
    paymentIntentId: string;
    paymentMethod: 'card' | 'tap_to_pay';
  },
): Promise<void> {
  const { data } = await readBookingRecord(linkedSite, bookingId);

  await writeBookingData(linkedSite, bookingId, {
    ...data,
    payment_status: 'paid',
    payment_method_at_service: input.paymentMethod,
    balance_collected_cents: input.balanceAmountCents,
    tip_amount: Math.max(0, input.tipAmount),
    balance_collected_at: new Date().toISOString(),
    in_person_payment_intent_id: input.paymentIntentId,
    stripe_payment_intent_id:
      asString(data.stripe_payment_intent_id) || input.paymentIntentId,
  });
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export async function completeBooking(linkedSite: LinkedSite, bookingId: string): Promise<void> {
  const { data } = await readBookingRecord(linkedSite, bookingId);

  const reviewToken =
    typeof data.review_token === 'string' && data.review_token.trim()
      ? data.review_token.trim()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const startedAt = data.session_started_at ? new Date(String(data.session_started_at)) : null;
  const endedAt = new Date();
  let actualDurationMinutes =
    typeof data.actual_duration_minutes === 'number' && data.actual_duration_minutes > 0
      ? data.actual_duration_minutes
      : 0;

  if (!actualDurationMinutes && startedAt && !Number.isNaN(startedAt.getTime())) {
    actualDurationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000));
  }

  await writeBookingData(linkedSite, bookingId, {
    ...data,
    booking_status: 'completed',
    completed_at: endedAt.toISOString(),
    session_ended_at: endedAt.toISOString(),
    actual_duration_minutes: actualDurationMinutes,
    review_token: reviewToken,
  });
}

export async function approveBooking(linkedSite: LinkedSite, bookingId: string): Promise<void> {
  const { client, tableName, userId } = getClient(linkedSite);

  const { data: existing, error: readError } = await client
    .from(tableName)
    .select('id, data')
    .eq('user_id', userId)
    .eq('record_type', 'booking')
    .eq('id', bookingId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error('Booking not found.');

  const data = (existing.data ?? {}) as Record<string, unknown>;
  if (String(data.booking_status ?? '').toLowerCase() !== 'pending_approval') {
    throw new Error('This booking is no longer pending approval.');
  }

  const { error } = await client
    .from(tableName)
    .update({
      data: {
        ...data,
        booking_status: 'confirmed',
        approved_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);

  const { data: subdomainRow, error: subdomainErr } = await supabase
    .from('styld_site_subdomains')
    .select('subdomain')
    .eq('user_id', userId)
    .maybeSingle();

  if (subdomainErr) throw new Error(subdomainErr.message);

  const subdomain = String(subdomainRow?.subdomain ?? '').trim();
  if (subdomain) {
    const { data, error: emailErr } = await supabase.functions.invoke('booking-client-email', {
      body: { bookingId, subdomain, force: true },
    });
    if (emailErr) {
      console.warn('booking-client-email after approve:', emailErr);
    } else if (data && typeof data === 'object' && 'skipped' in data && (data as { skipped?: boolean }).skipped) {
      console.warn('booking-client-email after approve skipped:', data);
    }
  }
}

export async function declinePendingBooking(linkedSite: LinkedSite, bookingId: string): Promise<void> {
  await cancelBooking(linkedSite, bookingId);
}

export async function cancelBooking(linkedSite: LinkedSite, bookingId: string): Promise<void> {
  const { userId } = getClient(linkedSite);

  const { data: subdomainRow, error: subdomainErr } = await supabase
    .from('styld_site_subdomains')
    .select('subdomain')
    .eq('user_id', userId)
    .maybeSingle();

  if (subdomainErr) throw new Error(subdomainErr.message);

  const subdomain = String(subdomainRow?.subdomain ?? '').trim();
  if (!subdomain) {
    throw new Error('Publish your site before cancelling bookings online.');
  }

  const result = await cancelBookingViaEdge(bookingId, subdomain, 'stylist');
  if (!result.ok) {
    throw new Error(result.error || 'Could not cancel booking.');
  }
}

export function formatBlockRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFmt = start.toLocaleDateString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeFmt = (date: Date) =>
    date.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
  return `${dateFmt} · ${timeFmt(start)} – ${timeFmt(end)}`;
}
