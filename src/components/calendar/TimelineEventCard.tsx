import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { Text, View } from 'react-native';
import { getCalendarEventColors } from '../../lib/styleEventColors';
import { colors } from '../../theme';
import { formatEventTime } from './timelineUtils';

export const BOOKING_CARD_MIN_HEIGHT = 52;

type Props = {
  title: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  styleId?: string;
  completed?: boolean;
  top: number;
  height: number;
};

function formatEventRange(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
) {
  return `${formatEventTime(startHour, startMinute)} to ${formatEventTime(endHour, endMinute)}`;
}

/** Day-view booking card — matches CalendarScreen event blocks. */
export default function TimelineEventCard({
  title,
  startHour,
  startMinute,
  endHour,
  endMinute,
  styleId,
  completed = false,
  top,
  height,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const eventColors = getCalendarEventColors({ styleId, title, completed });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: eventColors.backgroundColor,
          borderColor: eventColors.borderColor,
          top,
          height: Math.max(height, BOOKING_CARD_MIN_HEIGHT),
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {formatEventRange(startHour, startMinute, endHour, endMinute)}
        </Text>
      </View>
      {completed ? (
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      ) : null}
    </View>
  );
}

const BASE_STYLES = {
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  time: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: colors.eventCompletedBadge,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  completedBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
};
