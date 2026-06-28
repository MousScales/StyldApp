import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TimelineClosedLayers from '../components/calendar/TimelineClosedLayers';
import { CalendarStackParamList } from '../navigation/CalendarNavigator';
import { useSiteData } from '../context/SiteDataContext';
import { isWeekdayClosed, getTimelineBoundsForWeek } from '../lib/bookingAvailability';
import { BlockedInterval, loadBlockedIntervals } from '../lib/siteAdmin';
import { toDateKey } from '../lib/siteData';
import {
  BookingHours,
  DEFAULT_BOOKING_HOURS,
  loadBookingHours,
} from '../lib/siteServices';
import { getCalendarEventColors } from '../lib/styleEventColors';
import { colors } from '../theme';

type Props = NativeStackScreenProps<CalendarStackParamList, 'CalendarHome'>;
type CalendarEvent = import('../data/calendarEvents').CalendarEvent;
type ViewMode = 'day' | 'week' | 'month';

// ─── day-view constants (unchanged) ──────────────────────────────────────────
const HOUR_HEIGHT = 56;
const TIMELINE_START = 0;
const TIMELINE_END = 23;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── week-view constants ──────────────────────────────────────────────────────
const WEEK_DAY_HEADER_HEIGHT = 48;
const WEEK_MIN_HOUR_HEIGHT = 22;
/** Floating tab bar height + gap above it (matches dashboard scroll padding). */
const WEEK_TAB_BAR_CLEARANCE = 156;

// ─── helpers ─────────────────────────────────────────────────────────────────
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  next.setDate(1);
  return next;
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleString('default', { month: 'long' });
  const endMonth = weekEnd.toLocaleString('default', { month: 'long' });
  const year = weekStart.getFullYear();
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} – ${weekEnd.getDate()} ${year}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()} ${year}`;
}

function formatMonthYear(date: Date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatEventTime(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const paddedMinute = `${minute}`.padStart(2, '0');
  return `${displayHour}:${paddedMinute} ${period}`;
}

function formatEventRange(event: CalendarEvent) {
  return `${formatEventTime(event.startHour, event.startMinute)} to ${formatEventTime(
    event.endHour,
    event.endMinute,
  )}`;
}

// ─── day-view position helpers (unchanged) ───────────────────────────────────
function getEventTop(event: CalendarEvent) {
  const startMinutes = event.startHour * 60 + event.startMinute;
  const timelineStartMinutes = TIMELINE_START * 60;
  return ((startMinutes - timelineStartMinutes) / 60) * HOUR_HEIGHT;
}

function getEventHeight(event: CalendarEvent) {
  const startMinutes = event.startHour * 60 + event.startMinute;
  const endMinutes = event.endHour * 60 + event.endMinute;
  return Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 52);
}

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

// ─── week-view helpers ────────────────────────────────────────────────────────
function weekMinuteToTop(minute: number, timelineStartMinute: number, hourHeight: number) {
  return ((minute - timelineStartMinute) / 60) * hourHeight;
}

function getWeekHourLines(startMinute: number, endMinute: number) {
  const lines: number[] = [];
  for (let minute = Math.ceil(startMinute / 60) * 60; minute < endMinute; minute += 60) {
    lines.push(minute);
  }
  return lines;
}

function getWeekEventTop(
  event: CalendarEvent,
  hourHeight: number,
  timelineStartMinute: number,
) {
  const startMinutes = event.startHour * 60 + event.startMinute;
  return Math.max(0, weekMinuteToTop(startMinutes, timelineStartMinute, hourHeight));
}

function getWeekEventHeight(
  event: CalendarEvent,
  hourHeight: number,
  timelineStartMinute: number,
  timelineEndMinute: number,
) {
  const startMinutes = Math.max(event.startHour * 60 + event.startMinute, timelineStartMinute);
  const endMinutes = Math.min(event.endHour * 60 + event.endMinute, timelineEndMinute);
  return Math.max(weekMinuteToTop(endMinutes, timelineStartMinute, hourHeight) - weekMinuteToTop(startMinutes, timelineStartMinute, hourHeight), 16);
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({
  weekDays,
  today,
  selectedDate,
  bookingHours,
  blocks,
  getEvents,
  onEventPress,
  onDayPress,
  headerHeight,
}: {
  weekDays: Date[];
  today: Date;
  selectedDate: Date;
  bookingHours: BookingHours;
  blocks: BlockedInterval[];
  getEvents: (key: string) => CalendarEvent[];
  onEventPress: (id: string) => void;
  onDayPress: (day: Date) => void;
  headerHeight: number;
}) {
  const wkStyles = useResponsiveStyles(BASE_WK_STYLES);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, scrollBottomPadding } = useDeviceLayout('wide');
  const tabBarClearance = isTablet ? scrollBottomPadding : WEEK_TAB_BAR_CLEARANCE;
  const { startMinute: timelineStartMinute, endMinute: timelineEndMinute } = useMemo(
    () => getTimelineBoundsForWeek(weekDays, bookingHours),
    [bookingHours, weekDays],
  );
  const spanMinutes = Math.max(60, timelineEndMinute - timelineStartMinute);
  const spanHours = spanMinutes / 60;
  const hourLines = useMemo(
    () => getWeekHourLines(timelineStartMinute, timelineEndMinute),
    [timelineEndMinute, timelineStartMinute],
  );
  const currentMinuteOfDay = new Date().getHours() * 60 + new Date().getMinutes();

  const { hourHeight, timelineHeight } = useMemo(() => {
    const bottomChrome = Math.max(insets.bottom, 16) + tabBarClearance;
    const chromeHeight = Math.max(headerHeight, 108) + WEEK_DAY_HEADER_HEIGHT;
    const availableGridHeight = Math.max(
      spanHours * WEEK_MIN_HOUR_HEIGHT,
      windowHeight - chromeHeight - bottomChrome,
    );
    return {
      hourHeight: availableGridHeight / spanHours,
      timelineHeight: availableGridHeight,
    };
  }, [headerHeight, insets.bottom, spanHours, tabBarClearance, windowHeight]);

  return (
    <View style={wkStyles.wrapper}>
      <View style={wkStyles.dayHeaderRow}>
        <View style={wkStyles.timeGutter} />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const isClosed = isWeekdayClosed(day, bookingHours);
          return (
            <Pressable
              key={toDateKey(day)}
              style={wkStyles.dayHeaderCell}
              onPress={() => onDayPress(day)}
            >
              <Text
                style={[
                  wkStyles.dayHeaderLabel,
                  isToday && wkStyles.dayHeaderToday,
                  isClosed && wkStyles.dayHeaderClosed,
                ]}
              >
                {DAY_LABELS[i]}
              </Text>
              <View style={[wkStyles.dayHeaderNum, isSelected && wkStyles.dayHeaderNumSelected, isToday && !isSelected && wkStyles.dayHeaderNumToday]}>
                <Text
                  style={[
                    wkStyles.dayHeaderNumText,
                    isSelected && wkStyles.dayHeaderNumTextSelected,
                    isClosed && wkStyles.dayHeaderClosed,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Timeline grid */}
      <View style={[wkStyles.grid, { height: timelineHeight }]}>
        {/* Time gutter */}
        <View style={wkStyles.timeGutterGrid}>
          <View
            style={[
              wkStyles.hourGutterCell,
              { top: 0 },
            ]}
          >
            <Text style={wkStyles.hourGutterText}>
              {formatEventTime(
                Math.floor(timelineStartMinute / 60),
                timelineStartMinute % 60,
              )}
            </Text>
          </View>
          {hourLines.map((minute) => (
            <View
              key={minute}
              style={[
                wkStyles.hourGutterCell,
                { top: weekMinuteToTop(minute, timelineStartMinute, hourHeight) },
              ]}
            >
              <Text style={wkStyles.hourGutterText}>{formatHourLabel(minute / 60)}</Text>
            </View>
          ))}
        </View>

        {/* Day columns */}
        {weekDays.map((day) => {
          const events = getEvents(toDateKey(day));
          const isCurrentDay = isSameDay(day, new Date());
          return (
            <View key={toDateKey(day)} style={wkStyles.dayCol}>
              <TimelineClosedLayers
                selectedDate={day}
                bookingHours={bookingHours}
                blocks={blocks}
                timelineStartMinute={timelineStartMinute}
                hourHeight={hourHeight}
              />
              {/* Hour lines */}
              {hourLines.map((minute) => (
                <View
                  key={minute}
                  style={[
                    wkStyles.hourLine,
                    { top: weekMinuteToTop(minute, timelineStartMinute, hourHeight) },
                  ]}
                />
              ))}
              {/* Current time indicator */}
              {isCurrentDay &&
              currentMinuteOfDay >= timelineStartMinute &&
              currentMinuteOfDay <= timelineEndMinute ? (
                <View
                  style={[
                    wkStyles.nowLine,
                    {
                      top: weekMinuteToTop(currentMinuteOfDay, timelineStartMinute, hourHeight),
                    },
                  ]}
                />
              ) : null}
              {/* Events */}
              {events.map((event) => {
                const eventColors = getCalendarEventColors(event);
                return (
                <Pressable
                  key={event.id}
                  style={[
                    wkStyles.eventBlock,
                    {
                      backgroundColor: eventColors.backgroundColor,
                      borderColor: eventColors.borderColor,
                      top: getWeekEventTop(event, hourHeight, timelineStartMinute),
                      height: getWeekEventHeight(
                        event,
                        hourHeight,
                        timelineStartMinute,
                        timelineEndMinute,
                      ),
                    },
                  ]}
                  onPress={() => onEventPress(event.appointmentId)}
                >
                  <Text style={wkStyles.eventBlockTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── month-view constants ───────────────────────────────────────────────────
const MONTH_TAB_BAR_CLEARANCE = 156;
const MONTH_COL_HEADER_HEIGHT = 34;
const MONTH_PREVIEW_SLOT = 15;

function getMonthPreviewLimit(weekRowHeight: number) {
  const reserved = 30;
  return Math.max(1, Math.min(4, Math.floor((weekRowHeight - reserved) / MONTH_PREVIEW_SLOT)));
}

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({
  selectedDate,
  today,
  bookingHours,
  getEvents,
  onDayPress,
  headerHeight,
}: {
  selectedDate: Date;
  today: Date;
  bookingHours: BookingHours;
  getEvents: (key: string) => CalendarEvent[];
  onDayPress: (day: Date) => void;
  headerHeight: number;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, scrollBottomPadding } = useDeviceLayout('wide');
  const tabBarClearance = isTablet ? scrollBottomPadding : MONTH_TAB_BAR_CLEARANCE;
  const moStyles = useResponsiveStyles(BASE_MO_STYLES);
  const monthStart = getMonthStart(selectedDate);
  const startPadding = monthStart.getDay();
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startPadding + daysInMonth) / 7) * 7;
  const weeks = totalCells / 7;

  const weekRowHeight = useMemo(() => {
    const chromeHeight =
      Math.max(headerHeight, 108) + MONTH_COL_HEADER_HEIGHT + tabBarClearance;
    const availableHeight = Math.max(weeks * 72, windowHeight - chromeHeight - Math.max(insets.bottom, 16));
    return availableHeight / weeks;
  }, [headerHeight, insets.bottom, tabBarClearance, weeks, windowHeight]);

  const previewLimit = getMonthPreviewLimit(weekRowHeight);

  return (
    <View style={moStyles.container}>
      <View style={moStyles.colHeaders}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={moStyles.colHeaderCell}>
            <Text style={moStyles.colHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={moStyles.weeksGrid}>
        {Array.from({ length: weeks }, (_, weekIndex) => (
          <View key={weekIndex} style={[moStyles.weekRow, { height: weekRowHeight }]}>
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const cellIndex = weekIndex * 7 + dayIndex;
              const dayOffset = cellIndex - startPadding;
              const date =
                dayOffset >= 0 && dayOffset < daysInMonth
                  ? addDays(monthStart, dayOffset)
                  : null;

              const isToday = date ? isSameDay(date, today) : false;
              const isSelected = date ? isSameDay(date, selectedDate) : false;
              const isClosed = date ? isWeekdayClosed(date, bookingHours) : false;
              const events = date ? getEvents(toDateKey(date)) : [];
              const previewEvents = events.slice(0, previewLimit);
              const overflowCount = Math.max(0, events.length - previewEvents.length);

              return (
                <Pressable
                  key={dayIndex}
                  style={[
                    moStyles.dayCell,
                    dayIndex === 6 && moStyles.dayCellLast,
                    isSelected && !isToday && moStyles.dayCellSelected,
                  ]}
                  onPress={() => date && onDayPress(date)}
                  disabled={!date}
                >
                  {date ? (
                    <>
                      <View
                        style={[
                          moStyles.dayNum,
                          isToday && moStyles.dayNumToday,
                          isSelected && !isToday && moStyles.dayNumSelected,
                        ]}
                      >
                        <Text
                          style={[
                            moStyles.dayNumText,
                            isToday && moStyles.dayNumTextToday,
                            isSelected && !isToday && moStyles.dayNumTextSelected,
                            isClosed && !isToday && !isSelected && moStyles.dayNumClosed,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>

                      <View style={moStyles.previews}>
                        {previewEvents.map((event) => {
                          const eventColors = getCalendarEventColors(event);
                          return (
                            <View
                              key={event.id}
                              style={[
                                moStyles.previewPill,
                                { backgroundColor: eventColors.backgroundColor },
                              ]}
                            >
                              <Text style={moStyles.previewText} numberOfLines={1}>
                                {event.title}
                              </Text>
                            </View>
                          );
                        })}
                        {overflowCount > 0 ? (
                          <Text style={moStyles.moreText}>{overflowCount} more</Text>
                        ) : null}
                      </View>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── CalendarScreen ───────────────────────────────────────────────────────────
export default function CalendarScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { linkedSite, getCalendarEventsForDateKey, hasLinkedSite, isLoading } = useSiteData();
  const [bookingHours, setBookingHours] = useState<BookingHours>(DEFAULT_BOOKING_HOURS);
  const [blocks, setBlocks] = useState<BlockedInterval[]>([]);

  const refreshScheduleMeta = useCallback(async () => {
    if (!linkedSite) {
      setBookingHours(DEFAULT_BOOKING_HOURS);
      setBlocks([]);
      return;
    }
    try {
      const [hours, nextBlocks] = await Promise.all([
        loadBookingHours(linkedSite),
        loadBlockedIntervals(linkedSite),
      ]);
      setBookingHours(hours);
      setBlocks(nextBlocks);
    } catch {
      /* keep last known values */
    }
  }, [linkedSite]);

  useFocusEffect(useCallback(() => { void refreshScheduleMeta(); }, [refreshScheduleMeta]));
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarHeaderHeight, setCalendarHeaderHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const selectedDateKey = toDateKey(selectedDate);

  const dayEvents = useMemo(
    () => getCalendarEventsForDateKey(selectedDateKey),
    [getCalendarEventsForDateKey, selectedDateKey],
  );

  const timelineHeight = (TIMELINE_END - TIMELINE_START + 1) * HOUR_HEIGHT;
  const currentHour = new Date().getHours();

  // Auto-scroll to current time in day view
  useEffect(() => {
    if (viewMode !== 'day' || !isSameDay(selectedDate, new Date())) return;
    const scrollOffset = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: scrollOffset, animated: true });
    });
  }, [selectedDate, currentHour, viewMode]);

  // Header navigation
  function goBack() {
    if (viewMode === 'month') {
      setSelectedDate((d) => addMonths(d, -1));
    } else {
      setSelectedDate((d) => addDays(d, -7));
    }
  }

  function goForward() {
    if (viewMode === 'month') {
      setSelectedDate((d) => addMonths(d, 1));
    } else {
      setSelectedDate((d) => addDays(d, 7));
    }
  }

  function handleMonthDayPress(day: Date) {
    setSelectedDate(day);
    setViewMode('day');
  }

  const headerLabel = viewMode === 'month'
    ? formatMonthYear(selectedDate)
    : formatWeekRange(weekStart);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View
        style={styles.header}
        onLayout={(event) => setCalendarHeaderHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.weekNav}>
          <Pressable style={styles.navButton} onPress={goBack}>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.weekRange}>{headerLabel}</Text>
          <Pressable style={styles.navButton} onPress={goForward}>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* View mode toggle */}
        <View style={styles.viewToggle}>
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Week strip — day view only */}
        {viewMode === 'day' ? (
          <View style={styles.weekStrip}>
            {weekDays.map((day, index) => {
              const selected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const isClosed = isWeekdayClosed(day, bookingHours);
              return (
                <Pressable
                  key={toDateKey(day)}
                  style={styles.dayColumn}
                  onPress={() => {
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                >
                  <View
                    style={[
                      styles.dayPill,
                      selected && styles.dayPillSelected,
                      isClosed && !selected && styles.dayPillClosed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        selected && styles.dayLabelSelected,
                        isClosed && !selected && styles.dayLabelClosed,
                      ]}
                    >
                      {DAY_LABELS[index]}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        selected && styles.dayNumberSelected,
                        isClosed && !selected && styles.dayNumberClosed,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {isToday ? (
                      <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {viewMode === 'day' ? (
          <Text style={styles.hoursLegend}>Lines = business hours · Red tint = blocked time</Text>
        ) : null}

        {viewMode === 'day' && isWeekdayClosed(selectedDate, bookingHours) ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>Closed today — matches your site booking hours</Text>
          </View>
        ) : null}
      </View>

      {/* ── Day view ── */}
      {viewMode === 'day' ? (
        <ScrollView
          ref={scrollRef}
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.timeline, { height: timelineHeight }]}>
            {Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, index) => {
              const hour = TIMELINE_START + index;
              const isCurrentHour = isSameDay(selectedDate, new Date()) && hour === currentHour;
              return (
                <View key={hour} style={[styles.hourRow, { top: index * HOUR_HEIGHT }]}>
                  <Text style={[styles.hourLabel, isCurrentHour && styles.hourLabelCurrent]}>
                    {formatHourLabel(hour)}
                  </Text>
                  <View style={[styles.hourLine, isCurrentHour && styles.hourLineCurrent]} />
                </View>
              );
            })}

            {isSameDay(selectedDate, new Date()) ? (
              <View
                style={[
                  styles.currentTimeLine,
                  { top: currentHour * HOUR_HEIGHT + HOUR_HEIGHT / 2 },
                ]}
              />
            ) : null}

            <View style={styles.eventsColumn}>
              <TimelineClosedLayers
                selectedDate={selectedDate}
                bookingHours={bookingHours}
                blocks={blocks}
                timelineStartHour={TIMELINE_START}
                hourHeight={HOUR_HEIGHT}
              />

              {dayEvents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
                  <Text style={styles.emptyStateTitle}>
                    {!hasLinkedSite
                      ? 'Link a site first'
                      : isLoading
                      ? 'Loading bookings'
                      : 'No bookings'}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {!hasLinkedSite
                      ? 'Connect your site table from the Site tab.'
                      : 'Red tint = blocked time'}
                  </Text>
                </View>
              ) : null}

              {dayEvents.map((event) => {
                const eventColors = getCalendarEventColors(event);
                return (
                  <Pressable
                    key={event.id}
                    style={({ pressed }) => [
                      styles.eventCard,
                      {
                        backgroundColor: eventColors.backgroundColor,
                        borderColor: eventColors.borderColor,
                        top: getEventTop(event),
                        height: getEventHeight(event),
                      },
                      pressed && styles.eventCardPressed,
                    ]}
                    onPress={() =>
                      navigation.navigate('AppointmentDetail', {
                        appointmentId: event.appointmentId,
                      })
                    }
                  >
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>{formatEventRange(event)}</Text>
                    </View>
                    {event.completed ? (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : null}

      {/* ── Week view ── */}
      {viewMode === 'week' ? (
        <WeekView
          weekDays={weekDays}
          today={today}
          selectedDate={selectedDate}
          bookingHours={bookingHours}
          blocks={blocks}
          getEvents={getCalendarEventsForDateKey}
          headerHeight={calendarHeaderHeight}
          onEventPress={(id) => navigation.navigate('AppointmentDetail', { appointmentId: id })}
          onDayPress={(day) => {
            setSelectedDate(day);
            setViewMode('day');
          }}
        />
      ) : null}

      {/* ── Month view ── */}
      {viewMode === 'month' ? (
        <MonthView
          selectedDate={selectedDate}
          today={today}
          bookingHours={bookingHours}
          getEvents={getCalendarEventsForDateKey}
          onDayPress={handleMonthDayPress}
          headerHeight={calendarHeaderHeight}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Day-view styles (completely unchanged) ───────────────────────────────────
const BASE_STYLES = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRange: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 4,
    padding: 3,
    marginBottom: 14,
    alignSelf: 'center',
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 2,
  },
  toggleBtnActive: {
    backgroundColor: colors.calendarSelectedDay,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.text,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayPill: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 4,
  },
  dayPillSelected: {
    backgroundColor: colors.calendarSelectedDay,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  dayLabelSelected: {
    color: colors.text,
  },
  dayNumber: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: colors.text,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accentBlue,
    marginTop: 6,
  },
  todayDotSelected: {
    backgroundColor: colors.text,
  },
  dayPillClosed: {
    opacity: 0.45,
  },
  dayLabelClosed: {
    textDecorationLine: 'line-through',
  },
  dayNumberClosed: {
    textDecorationLine: 'line-through',
  },
  hoursLegend: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  closedBanner: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
  },
  closedBannerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  timeline: {
    position: 'relative',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: 52,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: -6,
  },
  hourLabelCurrent: {
    color: colors.accentBlue,
    fontWeight: '700',
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.calendarGridLine,
  },
  hourLineCurrent: {
    backgroundColor: colors.accentPinkGlow,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 52,
    right: 0,
    height: 2,
    backgroundColor: colors.accentBlue,
    zIndex: 2,
  },
  eventsColumn: {
    position: 'absolute',
    left: 60,
    right: 0,
    top: 0,
    bottom: 0,
  },
  emptyState: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  eventCard: {
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
  eventCardPressed: {
    opacity: 0.82,
  },
  eventContent: {
    flex: 1,
    paddingRight: 12,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  eventTime: {
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

// ─── Week-view styles ─────────────────────────────────────────────────────────
const BASE_WK_STYLES = {
  wrapper: {
    flex: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.calendarGridLine,
  },
  timeGutter: {
    width: 44,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayHeaderToday: {
    color: colors.accentPink,
  },
  dayHeaderClosed: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  dayHeaderNum: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderNumSelected: {
    backgroundColor: colors.calendarSelectedDay,
  },
  dayHeaderNumToday: {
    backgroundColor: colors.accentPinkMuted,
  },
  dayHeaderNumText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  dayHeaderNumTextSelected: {
    color: colors.text,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    position: 'relative',
    marginTop: 4,
    overflow: 'hidden',
  },
  timeGutterGrid: {
    width: 44,
    alignSelf: 'stretch',
    position: 'relative',
  },
  hourGutterCell: {
    position: 'absolute',
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  hourGutterText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: -6,
  },
  dayCol: {
    flex: 1,
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.calendarGridLine,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.calendarGridLine,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accentPink,
    zIndex: 2,
    borderRadius: 1,
  },
  eventBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    zIndex: 2,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  eventBlockTitle: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
};

// ─── Month-view styles ────────────────────────────────────────────────────────
const BASE_MO_STYLES = {
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  colHeaders: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
    height: MONTH_COL_HEADER_HEIGHT,
  },
  colHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colHeaderText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  weeksGrid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  dayCell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.calendarGridLine,
    paddingHorizontal: 3,
    paddingTop: 3,
    paddingBottom: 2,
    overflow: 'hidden',
  },
  dayCellLast: {
    borderRightWidth: 0,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  dayNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  dayNumToday: {
    backgroundColor: colors.accentPink,
  },
  dayNumSelected: {
    backgroundColor: colors.calendarSelectedDay,
  },
  dayNumText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dayNumTextToday: {
    color: colors.background,
    fontWeight: '700',
  },
  dayNumTextSelected: {
    color: colors.text,
  },
  dayNumClosed: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  previews: {
    flex: 1,
    gap: 2,
  },
  previewPill: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 13,
    justifyContent: 'center',
  },
  previewText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 11,
  },
  moreText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 4,
    marginTop: 1,
  },
} as const;
