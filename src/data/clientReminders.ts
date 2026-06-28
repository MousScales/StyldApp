export type ReminderTiming = 'before_booking' | 'after_booking';

export type ClientReminderRule = {
  id: string;
  enabled: boolean;
  label: string;
  timing: ReminderTiming;
  /** Hours before start (before_booking) or after end (after_booking). */
  offsetHours: number;
  subject: string;
  message: string;
};

export type ClientReminderSettings = {
  rules: ClientReminderRule[];
};

export const REMINDER_OFFSET_PRESETS = [
  { hours: 1, label: '1 hour' },
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
] as const;

export const DEFAULT_CLIENT_REMINDER_RULES: ClientReminderRule[] = [
  {
    id: 'before_24h',
    enabled: true,
    label: 'Appointment reminder',
    timing: 'before_booking',
    offsetHours: 24,
    subject: 'Reminder: {styleName} on {appointmentDate}',
    message:
      'Hi {firstName}! Just a friendly reminder about your {styleName} appointment on {appointmentDate} at {appointmentTime}. See you soon!',
  },
  {
    id: 'after_1h',
    enabled: false,
    label: 'Thank you',
    timing: 'after_booking',
    offsetHours: 1,
    subject: 'Thank you for visiting {businessName}!',
    message: 'Hi {firstName}! Thanks for coming in for {styleName}. We hope you love your look!',
  },
  {
    id: 'after_72h',
    enabled: false,
    label: 'Book again',
    timing: 'after_booking',
    offsetHours: 72,
    subject: 'Ready for your next visit?',
    message:
      'Hey {firstName}! We would love to see you again for {styleName}. Book anytime at {siteUrl}.',
  },
];

export const DEFAULT_CLIENT_REMINDER_SETTINGS: ClientReminderSettings = {
  rules: DEFAULT_CLIENT_REMINDER_RULES,
};

export function normalizeClientReminderSettings(value: unknown): ClientReminderSettings {
  if (!value || typeof value !== 'object') return DEFAULT_CLIENT_REMINDER_SETTINGS;

  const raw = value as Record<string, unknown>;
  const rulesRaw = Array.isArray(raw.rules) ? raw.rules : [];

  const rules: ClientReminderRule[] = rulesRaw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const rule = entry as Record<string, unknown>;
      const id = typeof rule.id === 'string' && rule.id.trim() ? rule.id.trim() : `rule-${index + 1}`;
      const timing = rule.timing === 'after_booking' ? 'after_booking' : 'before_booking';
      const offsetHours = typeof rule.offsetHours === 'number' ? rule.offsetHours : Number(rule.offsetHours);
      const subject = typeof rule.subject === 'string' ? rule.subject : '';
      const message = typeof rule.message === 'string' ? rule.message : '';
      if (!subject.trim() && !message.trim()) return null;

      return {
        id,
        enabled: rule.enabled !== false,
        label: typeof rule.label === 'string' && rule.label.trim() ? rule.label.trim() : 'Reminder',
        timing,
        offsetHours: Number.isFinite(offsetHours) && offsetHours > 0 ? Math.round(offsetHours) : 24,
        subject: subject.trim(),
        message: message.trim(),
      } satisfies ClientReminderRule;
    })
    .filter((rule): rule is ClientReminderRule => rule !== null);

  if (!rules.length) return DEFAULT_CLIENT_REMINDER_SETTINGS;
  return { rules };
}
