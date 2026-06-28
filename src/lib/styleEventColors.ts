import { colors } from '../theme';

/** Muted solid fills — no neon borders on dark tints. */
const STYLE_EVENT_PALETTE = [
  { backgroundColor: '#5B6EAE', borderColor: '#4A5A8C' },
  { backgroundColor: '#7D6B8C', borderColor: '#63566F' },
  { backgroundColor: '#6B8F71', borderColor: '#55725A' },
  { backgroundColor: '#B87958', borderColor: '#946046' },
  { backgroundColor: '#6E8491', borderColor: '#586974' },
  { backgroundColor: '#9B7A87', borderColor: '#7C616C' },
  { backgroundColor: '#8A8460', borderColor: '#6E6A4D' },
  { backgroundColor: '#915C66', borderColor: '#744A52' },
  { backgroundColor: '#578A88', borderColor: '#466E6C' },
  { backgroundColor: '#9A8568', borderColor: '#7B6A53' },
] as const;

export type CalendarEventColors = {
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getCalendarEventColors(event: {
  styleId?: string;
  title: string;
  completed?: boolean;
}): CalendarEventColors {
  if (event.completed) {
    return {
      backgroundColor: colors.eventCompleted,
      borderColor: colors.eventCompletedBadge,
      accentColor: colors.eventCompletedBadge,
    };
  }

  const key = (event.styleId || event.title || 'booking').trim().toLowerCase();
  const palette = STYLE_EVENT_PALETTE[hashString(key) % STYLE_EVENT_PALETTE.length];

  return {
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    accentColor: palette.backgroundColor,
  };
}
