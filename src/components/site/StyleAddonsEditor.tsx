import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createStyleAddonId, StyleAddon } from '../../data/siteStyles';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type StyleAddonsEditorProps = {
  addons: StyleAddon[];
  onChange: (addons: StyleAddon[]) => void;
  disabled?: boolean;
};

export default function StyleAddonsEditor({ addons, onChange, disabled }: StyleAddonsEditorProps) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const updateAddon = (id: string, patch: Partial<StyleAddon>) => {
    onChange(addons.map((addon) => (addon.id === id ? { ...addon, ...patch } : addon)));
  };

  const removeAddon = (id: string) => {
    onChange(addons.filter((addon) => addon.id !== id));
  };

  const addAddon = () => {
    onChange([...addons, { id: createStyleAddonId(), name: '', price: 0 }]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Add-ons (optional)</Text>
      <Text style={styles.hint}>
        Optional extras for this service. Each add-on needs a name — your menu shows a price range when add-ons exist.
      </Text>

      {addons.map((addon, index) => (
        <View key={addon.id} style={styles.row}>
          <View style={styles.rowFields}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={addon.name}
              onChangeText={(name) => updateAddon(addon.id, { name })}
              placeholder={`Add-on ${index + 1}`}
              placeholderTextColor={colors.textMuted}
              editable={!disabled}
            />
            <View style={styles.priceWrap}>
              <Text style={styles.pricePrefix}>+$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={addon.price > 0 ? String(addon.price) : ''}
                onChangeText={(raw) => {
                  const price = Number(raw.replace(/[^0-9.]/g, '')) || 0;
                  updateAddon(addon.id, { price });
                }}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                editable={!disabled}
              />
            </View>
          </View>
          <Pressable
            onPress={() => removeAddon(addon.id)}
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
        onPress={addAddon}
        disabled={disabled}
      >
        <Ionicons name="add" size={16} color={colors.accentPink} />
        <Text style={styles.addBtnText}>Add add-on</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowFields: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
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
