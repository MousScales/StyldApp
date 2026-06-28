/**
 * client-reminder-emails
 *
 * Cron: sends automated client reminder emails based on client_reminder_settings.
 * Protect with Authorization: Bearer ${CRON_SECRET}.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import {
  applyMessagePlaceholders,
  firstNameFromFull,
  messageToHtmlParagraphs,
} from '../_shared/message-placeholders.ts';
import {
  loadSiteEmailBranding,
  wrapStyldEmail,
} from '../_shared/styld-email-brand.ts';

type ReminderRule = {
  id: string;
  enabled: boolean;
  label: string;
  timing: 'before_booking' | 'after_booking';
  offsetHours: number;
  subject: string;
  message: string;
};

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    });
  } catch {
    return '';
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  } catch {
    return '';
  }
}

function parseRules(raw: unknown): ReminderRule[] {
  if (!raw || typeof raw !== 'object') return [];
  const rules = (raw as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) return [];
  return rules
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const rule = entry as Record<string, unknown>;
      const subject = typeof rule.subject === 'string' ? rule.subject.trim() : '';
      const message = typeof rule.message === 'string' ? rule.message.trim() : '';
      if (!subject || !message) return null;
      const offsetHours = typeof rule.offsetHours === 'number' ? rule.offsetHours : Number(rule.offsetHours);
      return {
        id: typeof rule.id === 'string' && rule.id.trim() ? rule.id.trim() : `rule-${index + 1}`,
        enabled: rule.enabled !== false,
        label: typeof rule.label === 'string' ? rule.label : 'Reminder',
        timing: rule.timing === 'after_booking' ? 'after_booking' : 'before_booking',
        offsetHours: Number.isFinite(offsetHours) && offsetHours > 0 ? offsetHours : 24,
        subject,
        message,
      } satisfies ReminderRule;
    })
    .filter((rule): rule is ReminderRule => rule !== null);
}

function isCancelled(data: Record<string, unknown>): boolean {
  const slot = String(data.appointment_slot ?? '').toLowerCase();
  const notes = String(data.notes ?? '').toLowerCase();
  const status = String(data.booking_status ?? '').toLowerCase();
  return slot.includes('cancelled') || notes.includes('[cancelled]') || status === 'cancelled';
}

function bookingStartsAt(data: Record<string, unknown>): number | null {
  const raw = data.appointment_starts_at ?? (data.appointment_date ? `${data.appointment_date}T12:00:00` : null);
  if (!raw) return null;
  const ms = new Date(String(raw)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function bookingEndsAt(data: Record<string, unknown>, startsMs: number): number {
  const duration = typeof data.duration_minutes === 'number'
    ? data.duration_minutes
    : Number(data.duration_minutes) || 120;
  return startsMs + duration * 60_000;
}

function reminderDue(
  rule: ReminderRule,
  startsMs: number,
  endsMs: number,
  nowMs: number,
): boolean {
  const offsetMs = rule.offsetHours * 60 * 60 * 1000;
  if (rule.timing === 'before_booking') {
    if (startsMs <= nowMs) return false;
    const sendAt = startsMs - offsetMs;
    return nowMs >= sendAt && nowMs < startsMs;
  }
  if (endsMs > nowMs) return false;
  const sendAt = endsMs + offsetMs;
  const windowEnd = sendAt + 60 * 60 * 1000;
  return nowMs >= sendAt && nowMs < windowEnd;
}

function buildEmailHtml(
  branding: Awaited<ReturnType<typeof loadSiteEmailBranding>>,
  headline: string,
  paragraphs: string[],
): string {
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${branding.softTextColor};font-size:15px;line-height:1.6;">${p}</p>`,
    )
    .join('');
  const body = `<tr><td style="padding:28px 28px 8px;color:${branding.textColor};">
<h2 style="margin:0 0 18px;color:${branding.textColor};font-family:${branding.headingFont};font-size:24px;font-weight:700;">${esc(headline)}</h2>
${bodyHtml}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${branding.ctaGradient};">
<a href="${esc(branding.siteUrl)}" style="display:inline-block;padding:14px 28px;color:${branding.ctaTextColor};font-size:15px;font-weight:700;text-decoration:none;">Book now</a>
</td></tr></table>
</td></tr>`;
  return wrapStyldEmail(branding, body, headline);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  const secret = Deno.env.get('CRON_SECRET')?.trim();
  const auth = req.headers.get('Authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const resendFromFallback = Deno.env.get('RESEND_FROM') ?? 'Styld <bookings@styldd.com>';
  const rootDomain = Deno.env.get('STYLD_ROOT_DOMAIN') ?? 'styldd.com';

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowMs = Date.now();
  let sent = 0;
  let scanned = 0;

  const { data: settingsRows, error: settingsErr } = await admin
    .from('styld_site_records')
    .select('user_id, data')
    .eq('record_type', 'site_setting')
    .eq('record_key', 'client_reminder_settings');

  if (settingsErr) return jsonResponse({ error: settingsErr.message }, 500);

  for (const settingsRow of settingsRows ?? []) {
    const userId = String(settingsRow.user_id ?? '');
    const settingsValue = (settingsRow.data as { value?: unknown } | undefined)?.value;
    const rules = parseRules(settingsValue).filter((rule) => rule.enabled);
    if (!rules.length || !userId) continue;

    const { data: subdomainRow } = await admin
      .from('styld_site_subdomains')
      .select('subdomain, published_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subdomainRow?.published_at) continue;
    const subdomain = String(subdomainRow.subdomain ?? '').trim();
    const siteUrl = subdomain ? `https://${subdomain}.${rootDomain}` : `https://${rootDomain}`;
    const branding = await loadSiteEmailBranding(admin, userId, siteUrl);
    const fromAddress = subdomain
      ? `${branding.businessName} <${subdomain}@${rootDomain}>`
      : resendFromFallback;

    const { data: bookingRows, error: bookingErr } = await admin
      .from('styld_site_records')
      .select('id, data')
      .eq('user_id', userId)
      .eq('record_type', 'booking');

    if (bookingErr) continue;

    for (const row of bookingRows ?? []) {
      scanned += 1;
      const data = (row.data ?? {}) as Record<string, unknown>;
      if (isCancelled(data)) continue;

      const email = String(data.email ?? '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;

      const startsMs = bookingStartsAt(data);
      if (!startsMs) continue;
      const endsMs = bookingEndsAt(data, startsMs);

      const sentMap =
        data.automated_reminder_sent && typeof data.automated_reminder_sent === 'object'
          ? { ...(data.automated_reminder_sent as Record<string, string>) }
          : {};

      for (const rule of rules) {
        if (sentMap[rule.id]) continue;
        if (!reminderDue(rule, startsMs, endsMs, nowMs)) continue;

        const clientName = String(data.full_name ?? 'there');
        const service = String(data.style_name ?? data.style_id ?? 'your appointment');
        const startsIso = new Date(startsMs).toISOString();
        const context = {
          clientName,
          firstName: firstNameFromFull(clientName),
          styleName: service,
          businessName: branding.businessName,
          appointmentDate: fmtDate(startsIso),
          appointmentTime: fmtTime(startsIso),
          siteUrl: siteUrl.replace(/^https?:\/\//, ''),
        };

        const subject = applyMessagePlaceholders(rule.subject, context);
        const message = applyMessagePlaceholders(rule.message, context);
        const headline = `Hi ${context.firstName},`;
        const paragraphs = messageToHtmlParagraphs(message);
        const html = buildEmailHtml(branding, headline, paragraphs);

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [email],
            subject,
            html,
          }),
        });

        if (!emailRes.ok) continue;

        sentMap[rule.id] = new Date().toISOString();
        sent += 1;

        await admin
          .from('styld_site_records')
          .update({
            data: {
              ...data,
              automated_reminder_sent: sentMap,
            },
          })
          .eq('id', row.id);
      }
    }
  }

  return jsonResponse({ ok: true, sent, scanned });
});
