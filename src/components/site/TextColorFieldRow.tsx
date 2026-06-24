import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSiteTheme } from '../../context/SiteThemeContext';
import {
  SITE_COLOR_SOURCE_LABELS,
  SiteColorSource,
  SiteTextColorField,
  SiteTextColorKey,
} from '../../data/siteTheme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import {
  getSiteTextColorDefault,
  getSiteTextColorSource,
  resolveSiteTextColor,
} from '../../lib/siteTextColors';
import { colors } from '../../theme';
import ColorPicker from './ColorPicker';

type TextColorFieldRowProps = {
  field: SiteTextColorField;
};

const PALETTE_SOURCES: Exclude<SiteColorSource, 'custom'>[] = [
  'accent',
  'text',
  'background',
  'navbar',
];

function presetForField(key: SiteTextColorKey): 'primary' | 'secondary' | 'background' {
  if (key === 'splashBrand' || key === 'splashButtonBg') return 'background';
  if (key.includes('Button') || key === 'accent' || key === 'link') return 'primary';
  return 'secondary';
}

export default function TextColorFieldRow({ field }: TextColorFieldRowProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { theme, updateTheme } = useSiteTheme();

  const displayHex = resolveSiteTextColor(field.key, theme);
  const activeSource = getSiteTextColorSource(field.key, theme);
  const hasOverride = activeSource !== null;

  const setCustomColor = (hex: string) => {
    updateTheme({
      textColors: { ...(theme.textColors ?? {}), [field.key]: hex },
      textColorSources: { ...(theme.textColorSources ?? {}), [field.key]: 'custom' },
    });
  };

  const setLinkedSource = (source: Exclude<SiteColorSource, 'custom'>) => {
    const nextColors = { ...(theme.textColors ?? {}) };
    const nextSources = { ...(theme.textColorSources ?? {}), [field.key]: source };
    delete nextColors[field.key];
    updateTheme({ textColors: nextColors, textColorSources: nextSources });
  };

  const resetToDefault = () => {
    const nextColors = { ...(theme.textColors ?? {}) };
    const nextSources = { ...(theme.textColorSources ?? {}) };
    delete nextColors[field.key];
    delete nextSources[field.key];
    updateTheme({ textColors: nextColors, textColorSources: nextSources });
  };

  const defaultHex = getSiteTextColorDefault(field.key, theme);

  return (
    <View style={styles.row}>
      <ColorPicker
        label={field.label}
        value={displayHex}
        presets={presetForField(field.key)}
        onChange={setCustomColor}
      />
      <Text style={styles.hint}>{field.hint}</Text>

      <Text style={styles.matchLabel}>Match a brand color</Text>
      <View style={styles.chipRow}>
        {PALETTE_SOURCES.map((source) => {
          const active = activeSource === source;
          return (
            <Pressable
              key={source}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLinkedSource(source)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {SITE_COLOR_SOURCE_LABELS[source]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hasOverride ? (
        <Pressable onPress={resetToDefault} hitSlop={8}>
          <Text style={styles.reset}>
            {activeSource && activeSource !== 'custom'
              ? `Linked to ${SITE_COLOR_SOURCE_LABELS[activeSource].toLowerCase()} · Reset`
              : 'Reset to site default'}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.defaultNote}>
          Using site default ({defaultHex.toUpperCase()})
        </Text>
      )}
    </View>
  );
}

const BASE_STYLES = StyleSheet.create({
  row: {
    marginBottom: 8,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  matchLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.accentPinkMuted,
    borderColor: colors.accentPink,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accentPink,
  },
  reset: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  defaultNote: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
    paddingHorizontal: 2,
    fontStyle: 'italic',
  },
});
