import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createStyleVariantId,
  formatStylePrice,
  hasExtraStyleVariants,
  StyleVariant,
} from '../../data/siteStyles';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type StyleVariantsEditorProps = {
  basePrice: number;
  defaultVariantLabel: string;
  onDefaultVariantLabelChange: (label: string) => void;
  variants: StyleVariant[];
  onChange: (variants: StyleVariant[]) => void;
  disabled?: boolean;
};

export default function StyleVariantsEditor({
  basePrice,
  defaultVariantLabel,
  onDefaultVariantLabelChange,
  variants,
  onChange,
  disabled,
}: StyleVariantsEditorProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const hasExtras = hasExtraStyleVariants(variants);

  const updateVariant = (id: string, patch: Partial<StyleVariant>) => {
    onChange(variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter((variant) => variant.id !== id));
  };

  const addVariant = () => {
    onChange([...variants, { id: createStyleVariantId(), label: '', price: 0 }]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Versions (optional)</Text>
      <Text style={styles.hint}>
        {hasExtras
          ? 'Version 1 uses the price above. Add another version if clients choose between options — e.g. with or without hair.'
          : 'The price above is version 1. Tap below to add a second version clients can pick when booking.'}
      </Text>

      {hasExtras ? (
        <View style={styles.defaultRow}>
          <View style={styles.rowFields}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>1</Text>
            </View>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={defaultVariantLabel}
              onChangeText={onDefaultVariantLabelChange}
              placeholder="e.g. Without hair"
              placeholderTextColor={colors.textMuted}
              editable={!disabled}
            />
            <View style={styles.priceReadonly}>
              <Text style={styles.priceReadonlyText}>
                {formatStylePrice(basePrice)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {variants.map((variant, index) => (
        <View key={variant.id} style={styles.row}>
          <View style={styles.rowFields}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>{hasExtras ? index + 2 : index + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={variant.label}
              onChangeText={(label) => updateVariant(variant.id, { label })}
              placeholder={hasExtras ? `Version ${index + 2}` : `Version ${index + 1}`}
              placeholderTextColor={colors.textMuted}
              editable={!disabled}
            />
            <View style={styles.priceWrap}>
              <Text style={styles.pricePrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={variant.price > 0 ? String(variant.price) : ''}
                onChangeText={(raw) => {
                  const price = Number(raw.replace(/[^0-9.]/g, '')) || 0;
                  updateVariant(variant.id, { price });
                }}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                editable={!disabled}
              />
            </View>
          </View>
          <Pressable
            onPress={() => removeVariant(variant.id)}
            hitSlop={8}
            disabled={disabled}
            style={styles.removeBtn}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <Pressable
        style={[styles.addBtn, disabled && styles.addBtnDisabled]}
        onPress={addVariant}
        disabled={disabled}
      >
        <Ionicons name="add" size={16} color={colors.accentPink} />
        <Text style={styles.addBtnText}>{hasExtras ? 'Add another version' : 'Add version'}</Text>
      </Pressable>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  defaultRow: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowFields: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  versionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  versionBadgeText: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pricePrefix: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  priceInput: {
    width: 72,
    textAlign: 'center',
  },
  priceReadonly: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  priceReadonlyText: {
    color: colors.accentPink,
    fontSize: 14,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: colors.accentPink,
    fontSize: 13,
    fontWeight: '600',
  },
};
