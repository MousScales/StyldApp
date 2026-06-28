export type MessagePlaceholderContext = {
  clientName: string;
  firstName: string;
  styleName: string;
  businessName: string;
  appointmentDate: string;
  appointmentTime: string;
  siteUrl: string;
};

const TOKEN_PATTERN = /\{(clientName|firstName|styleName|businessName|appointmentDate|appointmentTime|siteUrl)\}/g;

export function firstNameFromFull(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? 'there';
}

export function applyMessagePlaceholders(
  text: string,
  context: Partial<MessagePlaceholderContext>,
): string {
  if (!text) return text;
  return text.replace(TOKEN_PATTERN, (match, key: keyof MessagePlaceholderContext) => {
    const value = context[key];
    return value?.trim() ? value.trim() : match;
  });
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function messageToHtmlParagraphs(message: string): string[] {
  const trimmed = message.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => esc(block).replace(/\n/g, '<br />'));
}
