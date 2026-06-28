/**
 * client-contact-email
 *
 * Sends branded outreach emails from a salon owner to selected clients via Resend.
 * Auth required. Supports {firstName}, {styleName}, etc. placeholders per recipient.
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
  StyldEmailBranding,
  wrapStyldEmail,
} from '../_shared/styld-email-brand.ts';

type TemplateId = 'book_again' | 'thank_you' | 'promo' | 'check_in' | 'custom';

type Recipient = {
  email: string;
  name: string;
  merge?: Record<string, string>;
};

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFromAddress(businessName: string, subdomain: string, rootDomain: string, fallback: string): string {
  const brand = businessName.trim() || 'Your stylist';
  if (subdomain) {
    return `${brand} <${subdomain}@${rootDomain}>`;
  }
  return fallback;
}

function defaultTemplateCopy(templateId: TemplateId): { subject: string; message: string; ctaLabel: string } {
  switch (templateId) {
    case 'thank_you':
      return {
        subject: 'Thank you for visiting {businessName}!',
        message: 'Hi {firstName}! Thanks for choosing us for {styleName}. We hope you loved your look!',
        ctaLabel: 'Book your next visit',
      };
    case 'promo':
      return {
        subject: 'A special offer from {businessName} ✨',
        message:
          'Hey {firstName}! We have something special for you this week. Book {styleName} or any service at {siteUrl}.',
        ctaLabel: 'View services & book',
      };
    case 'check_in':
      return {
        subject: 'Checking in from {businessName}',
        message:
          'Hi {firstName}! Hope your {styleName} is still slaying. Let us know if you need a touch-up or want to book again.',
        ctaLabel: 'Book an appointment',
      };
    case 'custom':
      return {
        subject: 'A message from {businessName}',
        message: 'Hi {firstName}! Thanks for being a valued client.',
        ctaLabel: 'Visit our site',
      };
    case 'book_again':
    default:
      return {
        subject: 'Ready for your next {styleName} at {businessName}?',
        message:
          'Hi {firstName}! We would love to see you again for {styleName}. Book your next visit at {siteUrl}.',
        ctaLabel: 'Book now',
      };
  }
}

function buildEmailHtml(
  branding: StyldEmailBranding,
  opts: {
    headline: string;
    paragraphs: string[];
    ctaLabel: string;
    replyEmail: string;
  },
): string {
  const { headline, paragraphs, ctaLabel, replyEmail } = opts;
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${branding.softTextColor};font-size:15px;line-height:1.6;">${p}</p>`,
    )
    .join('');

  const siteLabel = branding.siteUrl.replace(/^https?:\/\//, '');

  const body = `<tr>
      <td style="padding:28px 28px 8px;color:${branding.textColor};">
        <h2 style="margin:0 0 18px;color:${branding.textColor};font-family:${branding.headingFont};font-size:24px;font-weight:700;letter-spacing:-0.3px;">${esc(headline)}</h2>
        ${bodyHtml}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
          <tr>
            <td style="border-radius:999px;background:${branding.ctaGradient};">
              <a href="${esc(branding.siteUrl)}" style="display:inline-block;padding:14px 28px;color:${branding.ctaTextColor};font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">${esc(ctaLabel)}</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px;color:${branding.mutedColor};font-size:13px;">
          Or visit
          <a href="${esc(branding.siteUrl)}" style="color:${branding.primaryColor};text-decoration:none;font-weight:600;">${esc(siteLabel)}</a>
        </p>
        ${
          replyEmail
            ? `<p style="margin:12px 0 0;color:${branding.mutedColor};font-size:13px;">Questions? Email us at <a href="mailto:${esc(replyEmail)}" style="color:${branding.primaryColor};text-decoration:none;">${esc(replyEmail)}</a>.</p>`
            : ''
        }
      </td>
    </tr>`;

  return wrapStyldEmail(branding, body, headline);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userId = userData.user.id;
    const body = await req.json();
    const templateId = String(body.templateId ?? 'book_again') as TemplateId;
    const recipients = Array.isArray(body.recipients) ? body.recipients as Recipient[] : [];
    const customSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const customMessage = typeof body.message === 'string' ? body.message.trim() : '';

    if (!recipients.length) return jsonResponse({ error: 'No recipients provided' }, 400);
    if (recipients.length > 50) return jsonResponse({ error: 'Maximum 50 recipients per send' }, 400);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const resendFromFallback = Deno.env.get('RESEND_FROM') ?? 'Styld <bookings@styldd.com>';
    const rootDomain = Deno.env.get('STYLD_ROOT_DOMAIN') ?? 'styldd.com';
    if (!resendKey) return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: subdomainRow } = await admin
      .from('styld_site_subdomains')
      .select('subdomain')
      .eq('user_id', userId)
      .maybeSingle();

    const subdomain = String(subdomainRow?.subdomain ?? '').trim();

    const { data: settingRow } = await admin
      .from('styld_site_records')
      .select('data')
      .eq('user_id', userId)
      .eq('record_type', 'site_setting')
      .eq('record_key', 'site_content')
      .maybeSingle();

    const siteContent =
      (settingRow?.data as Record<string, unknown> | undefined)?.value as Record<string, unknown> ?? {};
    const replyEmail = String(siteContent.email ?? '').trim();
    const siteUrl = subdomain ? `https://${subdomain}.${rootDomain}` : `https://${rootDomain}`;
    const branding = await loadSiteEmailBranding(admin, userId, siteUrl);
    const siteUrlLabel = siteUrl.replace(/^https?:\/\//, '');

    const fromAddress = buildFromAddress(branding.businessName, subdomain, rootDomain, resendFromFallback);
    const defaults = defaultTemplateCopy(templateId);
    const subjectTemplate = customSubject || defaults.subject;
    const messageTemplate = customMessage || defaults.message;

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const email = String(recipient.email ?? '').trim().toLowerCase();
      const name = String(recipient.name ?? '').trim() || 'there';

      if (!email || !email.includes('@')) {
        skipped += 1;
        continue;
      }

      const merge = recipient.merge ?? {};
      const context = {
        clientName: merge.clientName ?? name,
        firstName: merge.firstName ?? firstNameFromFull(name),
        styleName: merge.styleName ?? 'your style',
        businessName: merge.businessName ?? branding.businessName,
        appointmentDate: merge.appointmentDate ?? '',
        appointmentTime: merge.appointmentTime ?? '',
        siteUrl: merge.siteUrl ?? siteUrlLabel,
      };

      const subject = applyMessagePlaceholders(subjectTemplate, context);
      const message = applyMessagePlaceholders(messageTemplate, context);
      const headline = `Hi ${context.firstName},`;
      const paragraphs = messageToHtmlParagraphs(message);
      if (!paragraphs.length) {
        paragraphs.push(`Thanks for being a client of <strong>${esc(branding.businessName)}</strong>.`);
      }

      const html = buildEmailHtml(branding, {
        headline,
        paragraphs,
        ctaLabel: defaults.ctaLabel,
        replyEmail,
      });

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
          ...(replyEmail ? { reply_to: replyEmail } : {}),
        }),
      });

      if (!emailRes.ok) {
        failed += 1;
        const errText = await emailRes.text();
        errors.push(`${email}: ${errText.slice(0, 120)}`);
        continue;
      }

      sent += 1;
    }

    return jsonResponse({
      ok: sent > 0,
      sent,
      skipped,
      failed,
      ...(errors.length ? { errors } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('client-contact-email error:', err);
    return jsonResponse({ error: msg }, 500);
  }
});
