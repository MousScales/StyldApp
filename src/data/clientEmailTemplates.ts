export type ClientEmailTemplateId =
  | 'book_again'
  | 'thank_you'
  | 'promo'
  | 'check_in'
  | 'custom';

export type ClientEmailTemplate = {
  id: ClientEmailTemplateId;
  label: string;
  description: string;
  defaultSubject: string;
  defaultMessage: string;
  previewLine: string;
};

export const CLIENT_EMAIL_TEMPLATES: ClientEmailTemplate[] = [
  {
    id: 'book_again',
    label: 'Book again',
    description: 'Invite them back for their next appointment',
    defaultSubject: 'Ready for your next {styleName} at {businessName}?',
    defaultMessage:
      'Hi {firstName}! We would love to see you again for {styleName}. Book your next visit at {siteUrl}.',
    previewLine: "We'd love to see you again — book your next visit in just a few taps.",
  },
  {
    id: 'thank_you',
    label: 'Thank you',
    description: 'Show appreciation after a recent visit',
    defaultSubject: 'Thank you for visiting {businessName}!',
    defaultMessage:
      'Hi {firstName}! Thanks for choosing us for {styleName}. We hope you loved your look!',
    previewLine: 'Thanks for choosing us. We hope you loved your style!',
  },
  {
    id: 'promo',
    label: 'Special offer',
    description: 'Share a promotion or limited-time deal',
    defaultSubject: 'A special offer from {businessName} ✨',
    defaultMessage:
      'Hey {firstName}! We have something special for you this week. Book {styleName} or any service at {siteUrl}.',
    previewLine: 'We have a special offer just for our clients this week.',
  },
  {
    id: 'check_in',
    label: 'Check in',
    description: 'Friendly follow-up to stay in touch',
    defaultSubject: 'Checking in from {businessName}',
    defaultMessage:
      'Hi {firstName}! Hope your {styleName} is still slaying. Let us know if you need a touch-up or want to book again.',
    previewLine: 'Hope your style is still slaying! Let us know if you need anything.',
  },
  {
    id: 'custom',
    label: 'Custom message',
    description: 'Write your own subject and message',
    defaultSubject: '',
    defaultMessage: '',
    previewLine: '',
  },
];

export function getClientEmailTemplate(id: ClientEmailTemplateId): ClientEmailTemplate {
  return CLIENT_EMAIL_TEMPLATES.find((t) => t.id === id) ?? CLIENT_EMAIL_TEMPLATES[0];
}
