import { buildPushForBookingUpdate, buildPushForSiteRecord, sendPushToUser } from '../_shared/stylist-push.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type IncomingRecord = {
  id?: string;
  user_id?: string;
  record_type?: string;
  data?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

function parseRecord(payload: unknown): IncomingRecord | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;

  if (source.record && typeof source.record === 'object') {
    return source.record as IncomingRecord;
  }

  return source as IncomingRecord;
}

function parseOldRecord(payload: unknown): IncomingRecord | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  if (source.old_record && typeof source.old_record === 'object') {
    return source.old_record as IncomingRecord;
  }
  return null;
}

function parseEvent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'insert';
  const source = payload as Record<string, unknown>;
  return typeof source.event === 'string' ? source.event.toLowerCase() : 'insert';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const event = parseEvent(body);
    let record = parseRecord(body);
    const oldRecord = parseOldRecord(body);

    if (!record?.id || !record.user_id || !record.record_type) {
      const { data: latest, error } = await supabase
        .from('styld_site_records')
        .select('id, user_id, record_type, data, created_at, updated_at')
        .in('record_type', ['booking', 'review', 'inquiry'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);
      if (!latest) return json({ ok: true, skipped: 'no_recent_record' });
      record = latest;
    }

    if (!['booking', 'review', 'inquiry'].includes(String(record.record_type))) {
      return json({ ok: true, skipped: 'ignored_record_type' });
    }

    const { data: fresh, error: freshError } = await supabase
      .from('styld_site_records')
      .select('id, user_id, record_type, data, created_at, updated_at')
      .eq('id', record.id)
      .maybeSingle();

    if (freshError) return json({ error: freshError.message }, 500);
    if (!fresh) return json({ error: 'Record not found' }, 404);

    const referenceAt = fresh.updated_at ?? fresh.created_at;
    const referenceMs = referenceAt ? new Date(referenceAt).getTime() : Date.now();
    if (Date.now() - referenceMs > 5 * 60 * 1000) {
      return json({ ok: true, skipped: 'stale_record' });
    }

    let preview = buildPushForSiteRecord(fresh);

    if (event === 'update' && fresh.record_type === 'booking' && oldRecord?.data) {
      preview =
        buildPushForBookingUpdate(
          oldRecord.data ?? {},
          (fresh.data ?? {}) as Record<string, unknown>,
          fresh.id,
        ) ?? preview;
    }

    if (!preview) return json({ ok: true, skipped: 'no_push_payload' });

    const result = await sendPushToUser(supabase, fresh.user_id, preview);
    return json({ ok: true, ...result, title: preview.title });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('styld-push-notify error:', err);
    return json({ error: msg }, 500);
  }
});
