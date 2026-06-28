import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useServiceCatalog } from '../../context/ServiceCatalogContext';
import { useSiteData } from '../../context/SiteDataContext';
import { CatalogService, groupCatalogByCategory } from '../../data/serviceCatalog';
import {
  DEFAULT_STYLE_CATEGORY,
  DEFAULT_STYLE_DURATION_MINUTES,
  formatStyleDuration,
  formatStylePriceRange,
  getIncompleteStyleAddons,
  getIncompleteStyleVariants,
  hasExtraStyleVariants,
  normalizeStyleAddons,
  normalizeStyleVariants,
  STYLE_DURATION_PRESETS,
  StyleAddon,
  StyleVariant,
} from '../../data/siteStyles';
import { pickSiteImageFromLibrary } from '../../lib/pickSiteImage';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { colors } from '../../theme';
import StyleAddonsEditor from '../../components/site/StyleAddonsEditor';
import StyleVariantsEditor from '../../components/site/StyleVariantsEditor';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Styles'>;

// ─── Style card (grid cell) ───────────────────────────────────────────────────

function StyleCard({
  service,
  onPress,
}: {
  service: CatalogService;
  onPress: () => void;
}) {
  const styles = useResponsiveStyles(BASE_CARD_STYLES);
  const { getPrice, getStyleMeta, getCoverUrl } = useServiceCatalog();
  const meta = getStyleMeta(service.id);
  const title = meta?.title ?? service.name;
  const price = getPrice(service.id);
  const coverUrl = getCoverUrl(service.id);
  const variants = meta?.variants ?? [];
  const addons = meta?.addons ?? [];
  const priceLabel = formatStylePriceRange(price, addons, variants);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* thumbnail */}
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        </View>
      )}

      {/* info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{title}</Text>
        {(meta?.description || service.description) ? (
          <Text style={styles.desc} numberOfLines={1}>
            {meta?.description ?? service.description}
          </Text>
        ) : null}
      </View>

      {/* price */}
      <Text style={styles.price}>{priceLabel}</Text>
    </Pressable>
  );
}

const BASE_CARD_STYLES = {
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    minHeight: 72,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.7 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    flexShrink: 0,
    backgroundColor: colors.background,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  price: {
    color: colors.accentPink,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 0,
  },
};

// ─── Edit / Add modal ─────────────────────────────────────────────────────────

type EditState = {
  service: CatalogService | null; // null = adding new
};

// ─── Folder picker ────────────────────────────────────────────────────────────

function FolderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const styles = useResponsiveStyles(BASE_FP_STYLES);
  const { catalogServices } = useServiceCatalog();
  const [newName, setNewName] = useState('');

  const savedFolders = Array.from(
    new Set(catalogServices.map((s) => s.category).filter(Boolean)),
  ).sort();

  // Include the current value in the chip list even if it's unsaved/new
  const allFolders = savedFolders.includes(value)
    ? savedFolders
    : [...savedFolders, value].filter(Boolean);

  const applyNew = () => {
    const trimmed = newName.trim().toUpperCase();
    if (!trimmed) return;
    onChange(trimmed);
    setNewName('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Folder / Section</Text>

      {/* All known folders + current selection as chips */}
      <View style={styles.chips}>
        {allFolders.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(cat)}
          >
            <Text style={[styles.chipText, value === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* New folder input */}
      <Text style={styles.newLabel}>Create a new folder</Text>
      <View style={styles.newRow}>
        <TextInput
          style={styles.newInput}
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. KNOTLESS"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={applyNew}
        />
        <Pressable
          style={[styles.newConfirm, !newName.trim() && { opacity: 0.4 }]}
          onPress={applyNew}
          disabled={!newName.trim()}
        >
          <Text style={styles.newConfirmText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BASE_FP_STYLES = {
  wrap: { marginBottom: 14 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accentPink,
    fontWeight: '700',
  },
  newLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  newConfirm: {
    backgroundColor: colors.accentPink,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  newConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
};

// ─── Edit / Add modal ─────────────────────────────────────────────────────────

function EditModal({
  state,
  onClose,
}: {
  state: EditState;
  onClose: () => void;
}) {
  const styles = useResponsiveStyles(BASE_MODAL_STYLES);
  const { getStyleMeta, getPrice, upsertStyle, deleteStyle, uploadStyleImage, getCoverUrl } =
    useServiceCatalog();

  const isNew = state.service === null;
  const service = state.service;
  const meta = service ? getStyleMeta(service.id) : null;

  const [title, setTitle] = useState(meta?.title ?? service?.name ?? '');
  const [description, setDescription] = useState(meta?.description ?? service?.description ?? '');
  const [price, setPrice] = useState(String(service ? getPrice(service.id) || '' : ''));
  const [folder, setFolder] = useState(meta?.category ?? service?.category ?? DEFAULT_STYLE_CATEGORY);
  const [durationMinutes, setDurationMinutes] = useState(
    meta?.durationMinutes ?? DEFAULT_STYLE_DURATION_MINUTES,
  );
  const [addons, setAddons] = useState<StyleAddon[]>(meta?.addons ?? []);
  const [variants, setVariants] = useState<StyleVariant[]>(meta?.variants ?? []);
  const [defaultVariantLabel, setDefaultVariantLabel] = useState(meta?.defaultVariantLabel ?? '');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const coverUrl = service ? getCoverUrl(service.id, false) : null;
  const displayUri = localImageUri ?? coverUrl;

  const parsedPrice = Number(price.replace(/[^0-9.]/g, '')) || 0;

  const pickImage = async () => {
    const picked = await pickSiteImageFromLibrary('Allow photo library access to upload style images.');
    if (!picked) return;
    setLocalImageUri(picked.uri);
    setImageMimeType(picked.mimeType ?? null);
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!title.trim()) {
      Alert.alert('Enter a title for this style.');
      return;
    }
    const incompleteAddons = getIncompleteStyleAddons(addons);
    if (incompleteAddons.length > 0) {
      Alert.alert(
        'Add-on name required',
        'Enter a name for each add-on, or tap × to remove empty rows.',
      );
      return;
    }
    const incompleteVariants = getIncompleteStyleVariants(variants);
    if (incompleteVariants.length > 0) {
      Alert.alert(
        'Version label required',
        'Enter a label for each version, or tap × to remove empty rows.',
      );
      return;
    }
    const normalizedAddons = normalizeStyleAddons(addons);
    const normalizedVariants = normalizeStyleVariants(variants);
    const trimmedDefaultLabel = defaultVariantLabel.trim();
    setSaving(true);
    try {
      const cat = folder.trim() || DEFAULT_STYLE_CATEGORY;
      if (isNew) {
        await upsertStyle(
          {
            title: title.trim(),
            description: description.trim(),
            price: parsedPrice,
            durationMinutes,
            category: cat,
            defaultVariantLabel: trimmedDefaultLabel,
            addons: normalizedAddons,
            variants: normalizedVariants,
          },
          localImageUri,
          imageMimeType,
        );
      } else if (service) {
        await upsertStyle({
          id: service.id,
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          durationMinutes,
          category: cat,
          venue: service.venue,
          defaultVariantLabel: trimmedDefaultLabel,
          addons: normalizedAddons,
          variants: normalizedVariants,
        });
        if (localImageUri) {
          await uploadStyleImage(service.id, localImageUri, imageMimeType ?? undefined);
        }
      }
      onClose();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!service) return;
    Alert.alert('Delete style', `Remove "${title.trim() || service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try { await deleteStyle(service.id); onClose(); }
          catch (err) { Alert.alert('Delete failed', err instanceof Error ? err.message : 'Could not delete.'); }
          finally { setSaving(false); }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isNew ? 'Add style' : 'Edit style'}</Text>
        <View style={styles.headerRight}>
          {!isNew && (
            <Pressable onPress={handleDelete} hitSlop={12} disabled={saving}>
              <Ionicons name="trash-outline" size={20} color="#f87171" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        <Pressable style={styles.photoArea} onPress={pickImage} disabled={saving}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
            </View>
          )}
          <View style={styles.photoOverlay}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* Fields */}
        <EditField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Knotless braids" />
        <EditField label="Description" value={description} onChangeText={setDescription} placeholder="What's included" multiline />
        <FolderPicker value={folder} onChange={setFolder} />
        <EditField
          label={hasExtraStyleVariants(variants) ? 'Price (version 1)' : 'Price'}
          value={price}
          onChangeText={setPrice}
          placeholder="150"
          keyboardType="decimal-pad"
          prefix="$"
        />

        {/* Duration */}
        <Text style={styles.fieldLabel}>Duration</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.durationRow}>
          {STYLE_DURATION_PRESETS.map((preset) => {
            const active = durationMinutes === preset.minutes;
            return (
              <Pressable
                key={preset.minutes}
                style={[styles.durationChip, active && styles.durationChipActive]}
                onPress={() => setDurationMinutes(preset.minutes)}
              >
                <Text style={[styles.durationChipText, active && styles.durationChipTextActive]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <StyleVariantsEditor
          basePrice={parsedPrice}
          defaultVariantLabel={defaultVariantLabel}
          onDefaultVariantLabelChange={setDefaultVariantLabel}
          variants={variants}
          onChange={setVariants}
          disabled={saving}
        />
        {hasExtraStyleVariants(normalizeStyleVariants(variants)) ? (
          <Text style={styles.pricePreview}>
            Shown on menu:{' '}
            {formatStylePriceRange(
              parsedPrice,
              normalizeStyleAddons(addons),
              normalizeStyleVariants(variants),
            )}
          </Text>
        ) : null}

        <StyleAddonsEditor addons={addons} onChange={setAddons} disabled={saving} />

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{isNew ? 'Add style' : 'Save changes'}</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  prefix?: string;
}) {
  const styles = useResponsiveStyles(BASE_MODAL_STYLES);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMulti]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          keyboardType={keyboardType ?? 'default'}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const BASE_MODAL_STYLES = {
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerBtn: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  headerRight: { width: 36, alignItems: 'flex-end' },
  content: { padding: 20, paddingBottom: 80, gap: 4 },
  photoArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    position: 'relative',
  },
  photoImg: { ...StyleSheet.absoluteFillObject },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  photoOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  inputRowMulti: { alignItems: 'flex-start' },
  prefix: { color: colors.textMuted, fontSize: 16, fontWeight: '600', marginRight: 4 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  durationRow: { gap: 8, paddingBottom: 4, marginBottom: 20 },
  durationChip: {
    borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 9,
  },
  durationChipActive: { borderColor: colors.accentPinkBorder, backgroundColor: colors.accentPinkMuted },
  durationChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: colors.accentPink, fontWeight: '700' },
  pricePreview: {
    color: colors.accentPink,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: -4,
  },
  saveBtn: {
    backgroundColor: colors.accentPink, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
    shadowColor: colors.accentPink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StylesScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { hasLinkedSite } = useSiteData();
  const { catalogServices, isLoading, error, isSaving, refresh } = useServiceCatalog();
  const [editState, setEditState] = useState<EditState | null>(null);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));


  return (
    <>
      {/* Screen */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Styles & Services</Text>
          <View style={styles.headerRight}>
            {isSaving
              ? <ActivityIndicator size="small" color={colors.accentPink} />
              : (
                <Pressable
                  onPress={() => setEditState({ service: null })}
                  hitSlop={10}
                  style={styles.addBtn}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              )
            }
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accentPink} />
            <Text style={styles.centeredText}>Loading your styles…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !hasLinkedSite ? (
          <View style={styles.centered}>
            <Text style={styles.centeredText}>Link your site to manage styles.</Text>
          </View>
        ) : catalogServices.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cut-outline" size={40} color={colors.textMuted} />
            <Text style={styles.centeredText}>No styles yet</Text>
            <Pressable style={styles.addFirstBtn} onPress={() => setEditState({ service: null })}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addFirstBtnText}>Add your first style</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.hint}>Tap a style to edit it.</Text>
            {groupCatalogByCategory(catalogServices).map((group) => (
              <View key={group.title}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {/* strip "Studio · " / "House call · " prefix — show just the folder name */}
                    {group.title.includes(' · ') ? group.title.split(' · ').slice(1).join(' · ') : group.title}
                  </Text>
                  <View style={styles.sectionRule} />
                </View>
                {group.data.map((service) => (
                  <StyleCard
                    key={service.id}
                    service={service}
                    onPress={() => setEditState({ service })}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Edit / Add modal */}
      <Modal
        visible={editState !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditState(null)}
      >
        {editState !== null && (
          <EditModal
            key={editState.service?.id ?? 'new'}
            state={editState}
            onClose={() => setEditState(null)}
          />
        )}
      </Modal>
    </>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerRight: { width: 36, alignItems: 'flex-end' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    padding: 14,
    gap: 8,
    paddingBottom: 60,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  centeredText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  errorText: { color: '#f87171', fontSize: 14, padding: 20 },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentPink,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  addFirstBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
};
