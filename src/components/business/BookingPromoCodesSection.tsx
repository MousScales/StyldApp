import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BookingPromoCode,
  createBookingPromoCode,
  formatPromoDiscountLabel,
} from '../../data/bookingPromoCodes';
import { colors } from '../../theme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type Props = {
  promos: BookingPromoCode[];
  onChange: (next: BookingPromoCode[]) => void;
};

type EditorState = {
  id: string | null;
  code: string;
  label: string;
  discountKind: 'percent' | 'fixed';
  discountValue: string;
  maxUses: string;
  expiresAt: string;
};

const EMPTY_EDITOR: EditorState = {
  id: null,
  code: '',
  label: '',
  discountKind: 'percent',
  discountValue: '10',
  maxUses: '',
  expiresAt: '',
};

function FormSection({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lead ? <Text style={styles.sectionLead}>{lead}</Text> : null}
      {children}
    </View>
  );
}

export default function BookingPromoCodesSection({ promos, onChange }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const sortedPromos = useMemo(
    () => [...promos].sort((a, b) => a.code.localeCompare(b.code)),
    [promos],
  );

  const openNew = () => setEditor({ ...EMPTY_EDITOR });

  const openEdit = (promo: BookingPromoCode) => {
    setEditor({
      id: promo.id,
      code: promo.code,
      label: promo.label,
      discountKind: promo.discountKind,
      discountValue: String(promo.discountValue),
      maxUses: promo.maxUses != null ? String(promo.maxUses) : '',
      expiresAt: promo.expiresAt ?? '',
    });
  };

  const closeEditor = () => setEditor(null);

  const saveEditor = () => {
    if (!editor) return;
    const code = editor.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      Alert.alert('Invalid code', 'Use 3–24 letters, numbers, dashes, or underscores.');
      return;
    }

    const discountValue = Number(editor.discountValue.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      Alert.alert('Invalid discount', 'Enter a discount amount greater than zero.');
      return;
    }
    if (editor.discountKind === 'percent' && discountValue > 100) {
      Alert.alert('Invalid discount', 'Percent discount cannot exceed 100%.');
      return;
    }

    const maxUsesRaw = editor.maxUses.trim();
    const maxUses = maxUsesRaw ? Math.max(1, Math.round(Number(maxUsesRaw))) : null;
    if (maxUsesRaw && !Number.isFinite(maxUses ?? NaN)) {
      Alert.alert('Invalid limit', 'Max uses must be a whole number.');
      return;
    }

    const expiresAt = editor.expiresAt.trim() || null;
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for expiry or leave blank.');
      return;
    }

    const duplicate = promos.some(
      (item) => item.code === code && item.id !== editor.id,
    );
    if (duplicate) {
      Alert.alert('Duplicate code', 'You already have a promo code with that name.');
      return;
    }

    const nextPromo = createBookingPromoCode({
      id: editor.id ?? `promo-${Date.now()}`,
      code,
      label: editor.label.trim(),
      discountKind: editor.discountKind,
      discountValue,
      enabled: true,
      maxUses,
      expiresAt,
    });

    if (editor.id) {
      onChange(promos.map((item) => (item.id === editor.id ? nextPromo : item)));
    } else {
      onChange([nextPromo, ...promos]);
    }
    closeEditor();
  };

  const toggleEnabled = (id: string) => {
    onChange(
      promos.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const removePromo = (promo: BookingPromoCode) => {
    Alert.alert('Delete promo code?', `Remove ${promo.code}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onChange(promos.filter((item) => item.id !== promo.id)),
      },
    ]);
  };

  return (
    <FormSection
      title="Promo codes"
      lead="Clients can enter these on your booking form at checkout. Discount applies to the service total before deposit or pay-in-person balance."
    >
      <Pressable style={styles.addBtn} onPress={openNew}>
        <Ionicons name="add-circle-outline" size={20} color={colors.accentPink} />
        <Text style={styles.addBtnText}>Add promo code</Text>
      </Pressable>

      {sortedPromos.length === 0 ? (
        <Text style={styles.emptyText}>No promo codes yet.</Text>
      ) : (
        sortedPromos.map((promo) => (
          <View key={promo.id} style={styles.promoRow}>
            <Pressable style={styles.promoMain} onPress={() => openEdit(promo)}>
              <View style={styles.promoTop}>
                <Text style={styles.promoCode}>{promo.code}</Text>
                <Text style={styles.promoDiscount}>{formatPromoDiscountLabel(promo)}</Text>
              </View>
              {promo.label ? <Text style={styles.promoLabel}>{promo.label}</Text> : null}
              <Text style={styles.promoMeta}>
                {promo.maxUses != null ? `Max ${promo.maxUses} uses` : 'Unlimited uses'}
                {promo.expiresAt ? ` · Expires ${promo.expiresAt}` : ''}
              </Text>
            </Pressable>
            <Switch
              value={promo.enabled}
              onValueChange={() => toggleEnabled(promo.id)}
              trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
            />
            <Pressable onPress={() => removePromo(promo)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))
      )}

      {editor ? (
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>{editor.id ? 'Edit promo' : 'New promo code'}</Text>

          <Text style={styles.fieldLabel}>Code</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="SUMMER10"
            placeholderTextColor={colors.textMuted}
            value={editor.code}
            onChangeText={(text) => setEditor({ ...editor, code: text.toUpperCase() })}
          />

          <Text style={styles.fieldLabel}>Label (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Instagram launch"
            placeholderTextColor={colors.textMuted}
            value={editor.label}
            onChangeText={(label) => setEditor({ ...editor, label })}
          />

          <Text style={styles.fieldLabel}>Discount type</Text>
          <View style={styles.kindRow}>
            {(['percent', 'fixed'] as const).map((kind) => {
              const selected = editor.discountKind === kind;
              return (
                <Pressable
                  key={kind}
                  style={[styles.kindChip, selected && styles.kindChipSelected]}
                  onPress={() => setEditor({ ...editor, discountKind: kind })}
                >
                  <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                    {kind === 'percent' ? 'Percent off' : 'Fixed amount'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>
            {editor.discountKind === 'percent' ? 'Percent off' : 'Amount off ($)'}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={editor.discountValue}
            onChangeText={(discountValue) => setEditor({ ...editor, discountValue })}
          />

          <Text style={styles.fieldLabel}>Max uses (optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Unlimited"
            placeholderTextColor={colors.textMuted}
            value={editor.maxUses}
            onChangeText={(maxUses) => setEditor({ ...editor, maxUses })}
          />

          <Text style={styles.fieldLabel}>Expiry date (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={editor.expiresAt}
            onChangeText={(expiresAt) => setEditor({ ...editor, expiresAt })}
          />

          <View style={styles.editorActions}>
            <Pressable style={styles.cancelBtn} onPress={closeEditor}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveEditorBtn} onPress={saveEditor}>
              <Text style={styles.saveEditorBtnText}>Save code</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </FormSection>
  );
}

const BASE_STYLES = {
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionLead: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: -4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  addBtnText: { color: colors.accentPink, fontSize: 15, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  promoMain: { flex: 1, gap: 4 },
  promoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  promoCode: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  promoDiscount: { color: colors.accentPink, fontSize: 13, fontWeight: '600' },
  promoLabel: { color: colors.text, fontSize: 13 },
  promoMeta: { color: colors.textMuted, fontSize: 12 },
  editorCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 8,
  },
  editorTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  kindChipSelected: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  kindChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  kindChipTextSelected: { color: colors.accentPink },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  saveEditorBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.accentPink,
  },
  saveEditorBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
};
