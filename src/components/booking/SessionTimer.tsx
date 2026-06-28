import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '../../lib/sessionTimer';
import { colors, fonts } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = {
  startedAt: Date | null;
  endedAt?: Date | null;
  live?: boolean;
  compact?: boolean;
  hero?: boolean;
};

export default function SessionTimer({
  startedAt,
  endedAt,
  live = true,
  compact = false,
  hero = false,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!live || !startedAt || endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live, startedAt, endedAt]);

  if (!startedAt) return null;

  const end = endedAt?.getTime() ?? now;
  const elapsed = Math.max(0, end - startedAt.getTime());

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, hero && styles.wrapHero]}>
      <Text style={[styles.label, compact && styles.labelCompact, hero && styles.labelHero]}>
        {endedAt ? 'Session time' : 'In session'}
      </Text>
      <Text style={[styles.time, compact && styles.timeCompact, hero && styles.timeHero]}>
        {formatElapsed(elapsed)}
      </Text>
    </View>
  );
}

const BASE_STYLES = {
  wrap: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  wrapCompact: { alignItems: 'flex-start', paddingVertical: 0 },
  wrapHero: { gap: 8, paddingVertical: 16 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelCompact: { fontSize: 11 },
  labelHero: { fontSize: 13, letterSpacing: 1 },
  time: {
    color: colors.accentPink,
    fontSize: 36,
    fontWeight: '700',
    fontFamily: fonts.number,
    letterSpacing: -1,
  },
  timeCompact: { fontSize: 22 },
  timeHero: { fontSize: 64, letterSpacing: -2 },
};
