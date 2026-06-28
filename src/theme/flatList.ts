import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Flat list + detail sections (dashboard booking rows). */
export const flatListStyles = {
  listGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingRight: 2,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: 10,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    paddingLeft: 2,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingLeft: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.calendarGridLine,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
};
