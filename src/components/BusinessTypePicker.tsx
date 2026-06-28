import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BUSINESS_TYPE_OPTIONS, BusinessType } from '../data/onboarding';
import { colors } from '../theme';

type Props = {
  selected: BusinessType | '';
  otherLabel: string;
  onSelect: (value: BusinessType) => void;
  onOtherLabelChange: (value: string) => void;
};

export default function BusinessTypePicker({
  selected,
  otherLabel,
  onSelect,
  onOtherLabelChange,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.stack}>
      {BUSINESS_TYPE_OPTIONS.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{option.label}</Text>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </Pressable>
        );
      })}

      {selected === 'other' ? (
        <View style={styles.otherField}>
          <Text style={styles.otherLabel}>Describe your business</Text>
          <TextInput
            style={styles.otherInput}
            value={otherLabel}
            onChangeText={onOtherLabelChange}
            placeholder="e.g. Esthetician, tattoo artist, PMU"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const BASE_STYLES = {
  stack: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  cardActive: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  cardLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardLabelActive: {
    color: colors.accentPink,
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  otherField: {
    marginTop: 4,
    gap: 8,
  },
  otherLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  otherInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
};
