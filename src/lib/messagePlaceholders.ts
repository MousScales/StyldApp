import { Client } from '../data/clients';

export type MessagePlaceholderContext = {
  clientName: string;
  firstName: string;
  styleName: string;
  businessName: string;
  appointmentDate: string;
  appointmentTime: string;
  siteUrl: string;
};

export type MessagePlaceholderKey = keyof MessagePlaceholderContext;

export const MESSAGE_PLACEHOLDERS: { key: MessagePlaceholderKey; label: string; token: string }[] = [
  { key: 'firstName', label: 'First name', token: '{firstName}' },
  { key: 'clientName', label: 'Full name', token: '{clientName}' },
  { key: 'styleName', label: 'Style name', token: '{styleName}' },
  { key: 'businessName', label: 'Business', token: '{businessName}' },
  { key: 'appointmentDate', label: 'Appt date', token: '{appointmentDate}' },
  { key: 'appointmentTime', label: 'Appt time', token: '{appointmentTime}' },
  { key: 'siteUrl', label: 'Site link', token: '{siteUrl}' },
];

export const SAMPLE_PLACEHOLDER_CONTEXT: MessagePlaceholderContext = {
  clientName: 'Jordan Smith',
  firstName: 'Jordan',
  styleName: 'Knotless Braids',
  businessName: 'Your Salon',
  appointmentDate: 'Sat, Jun 21',
  appointmentTime: '2:00 PM',
  siteUrl: 'yoursite.styldd.com',
};

const TOKEN_PATTERN = /\{(clientName|firstName|styleName|businessName|appointmentDate|appointmentTime|siteUrl)\}/g;

export function applyMessagePlaceholders(
  text: string,
  context: Partial<MessagePlaceholderContext>,
): string {
  if (!text) return text;
  return text.replace(TOKEN_PATTERN, (match, key: MessagePlaceholderKey) => {
    const value = context[key];
    return value?.trim() ? value.trim() : match;
  });
}

export function buildClientMergeContext(client: Client): Partial<MessagePlaceholderContext> {
  const upcoming = client.pastBookings.find((booking) => booking.status === 'upcoming');
  const recent = client.pastBookings[0];
  const booking = upcoming ?? recent;
  const favorite = client.favoriteOrders[0];

  return {
    clientName: client.name,
    firstName: client.name.trim().split(/\s+/)[0] || 'there',
    styleName: booking?.service ?? favorite?.service ?? 'your style',
    appointmentDate: booking?.date ?? '',
    appointmentTime: booking?.time ?? '',
  };
}

export function previewWithSamplePlaceholders(text: string, businessName: string, siteUrl: string): string {
  return applyMessagePlaceholders(text, {
    ...SAMPLE_PLACEHOLDER_CONTEXT,
    businessName,
    siteUrl: siteUrl.replace(/^https?:\/\//, '') || SAMPLE_PLACEHOLDER_CONTEXT.siteUrl,
  });
}
