import { View } from 'react-native';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { BookingHours } from '../../data/bookingHours';
import { getDayOpenCloseBoundaries } from '../../lib/bookingAvailability';
import {
  getMinuteTop,
  getOverlayHeight,
  getOverlayTop,
  overlayFromBlock,
  TimelineOverlay,
} from './timelineUtils';
import { BlockedInterval } from '../../lib/siteAdmin';
import { toDateKey } from '../../lib/siteData';

type TimelineClosedLayersProps = {
  selectedDate: Date;
  bookingHours: BookingHours;
  blocks?: BlockedInterval[];
  timelineStartHour?: number;
  timelineStartMinute?: number;
  hourHeight?: number;
  showBoundaries?: boolean;
};

export default function TimelineClosedLayers({
  selectedDate,
  bookingHours,
  blocks = [],
  timelineStartHour = 0,
  timelineStartMinute,
  hourHeight = 56,
  showBoundaries = true,
}: TimelineClosedLayersProps) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const dateKey = toDateKey(selectedDate);
  const startMinute = timelineStartMinute ?? timelineStartHour * 60;
  const boundaries = showBoundaries
    ? getDayOpenCloseBoundaries(selectedDate, bookingHours)
    : null;
  const blockOverlays = blocks
    .map((block) => overlayFromBlock(block, dateKey))
    .filter((overlay): overlay is TimelineOverlay => overlay !== null);

  return (
    <>
      {boundaries ? (
        <>
          <View
            style={[
              styles.boundaryLine,
              {
                top: getMinuteTop(boundaries.openMinute, startMinute, hourHeight),
              },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.boundaryLine,
              styles.boundaryLineClose,
              {
                top: getMinuteTop(boundaries.closeMinute, startMinute, hourHeight),
              },
            ]}
            pointerEvents="none"
          />
        </>
      ) : null}
      {blockOverlays.map((overlay) => (
        <View
          key={`block-${overlay.id}`}
          style={[
            styles.layerBlock,
            {
              top: getOverlayTop(overlay, startMinute, hourHeight),
              height: getOverlayHeight(overlay, hourHeight),
            },
          ]}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

const BASE_STYLES = {
  boundaryLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(100, 116, 139, 0.55)',
    zIndex: 1,
  },
  boundaryLineClose: {
    borderTopColor: 'rgba(100, 116, 139, 0.4)',
  },
  layerBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
};
