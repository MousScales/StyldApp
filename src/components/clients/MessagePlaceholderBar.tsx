import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MESSAGE_PLACEHOLDERS } from '../../lib/messagePlaceholders';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type MessagePlaceholderBarProps = {
  onInsert: (token: string) => void;
  disabled?: boolean;
};

export default function MessagePlaceholderBar({ onInsert, disabled }: MessagePlaceholderBarProps) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Insert placeholder</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MESSAGE_PLACEHOLDERS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.chip, disabled && styles.chipDisabled]}
            onPress={() => onInsert(item.token)}
            disabled={disabled}
          >
            <Text style={styles.chipText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    gap: 6,
    marginBottom: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  row: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '600',
  },
};
