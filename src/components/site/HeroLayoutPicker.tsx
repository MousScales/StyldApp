import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HERO_LAYOUT_OPTIONS, HeroLayout } from '../../data/siteTheme';
import { colors } from '../../theme';

type HeroLayoutPickerProps = {
  value: HeroLayout;
  onChange: (layout: HeroLayout) => void;
};

function LayoutPreview({ layout }: { layout: HeroLayout }) {
  const previewStyles = useResponsiveStyles(BASE_PREVIEW_STYLES);

  if (layout === 'banner') {
    return (
      <View style={previewStyles.stack}>
        <View style={[previewStyles.block, previewStyles.imageBlockWide]} />
        <View style={[previewStyles.block, previewStyles.textLine]} />
        <View style={[previewStyles.block, previewStyles.textLineShort]} />
      </View>
    );
  }

  if (layout === 'cover') {
    return (
      <View style={previewStyles.coverWrap}>
        <View style={[previewStyles.block, previewStyles.coverBlock]} />
        <View style={[previewStyles.block, previewStyles.textLineShort]} />
      </View>
    );
  }

  if (layout === 'stack') {
    return (
      <View style={previewStyles.stack}>
        <View style={[previewStyles.block, previewStyles.imageBlockWide]} />
        <View style={[previewStyles.block, previewStyles.textLine]} />
      </View>
    );
  }

  return (
    <View style={previewStyles.stack}>
      <View style={[previewStyles.block, previewStyles.textLine]} />
      <View style={[previewStyles.block, previewStyles.textLineShort]} />
    </View>
  );
}

export default function HeroLayoutPicker({ value, onChange }: HeroLayoutPickerProps) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.list}>
      {HERO_LAYOUT_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option.id)}
          >
            <View style={styles.previewWrap}>
              <LayoutPreview layout={option.id} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionBody}>{option.description}</Text>
            </View>
            {selected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.accentPink} />
            ) : (
              <Ionicons name="ellipse-outline" size={22} color={colors.textMuted} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const BASE_PREVIEW_STYLES = {
  stack: {
    gap: 4,
    alignItems: 'center',
  },
  block: {
    backgroundColor: colors.accentPinkMuted,
    borderRadius: 4,
  },
  imageBlockWide: {
    width: 56,
    height: 28,
    backgroundColor: colors.accentPinkSoft,
  },
  textLine: {
    width: 48,
    height: 6,
  },
  textLineShort: {
    width: 32,
    height: 6,
  },
  coverWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  coverBlock: {
    width: '100%',
    height: 32,
    backgroundColor: colors.accentPinkSoft,
    borderRadius: 4,
  },
};

const BASE_STYLES = {
  list: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  optionSelected: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  previewWrap: {
    width: 72,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  optionBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
};
