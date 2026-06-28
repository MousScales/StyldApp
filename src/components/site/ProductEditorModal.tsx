import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MAX_PRODUCT_IMAGES,
  SiteProduct,
  createEmptySiteProduct,
} from '../../data/productsCatalog';
import { STYLE_COVER_BUCKET } from '../../data/serviceCatalog';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { LinkedSite, getSiteDataSupabaseUrl } from '../../lib/linkedSites';
import { uploadProductImageFromUri } from '../../lib/siteAdmin';
import { pickSiteImageFromLibrary } from '../../lib/pickSiteImage';
import { colors } from '../../theme';

type Step = 'photos' | 'details' | 'price';

const STEPS: { id: Step; label: string }[] = [
  { id: 'photos', label: 'Photos' },
  { id: 'details', label: 'Details' },
  { id: 'price', label: 'Price' },
];

type Props = {
  visible: boolean;
  product: SiteProduct | null;
  linkedSite: LinkedSite | null;
  onClose: () => void;
  onSave: (product: SiteProduct) => void;
  onDelete?: () => void;
};

function storageUrl(userId: string, path: string): string {
  const base = getSiteDataSupabaseUrl()?.replace(/\/$/, '') ?? '';
  if (!base || !path) return '';
  return `${base}/storage/v1/object/public/${STYLE_COVER_BUCKET}/${path.replace(/^\/+/, '')}`;
}

export default function ProductEditorModal({
  visible,
  product,
  linkedSite,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const heroSize = Math.min(windowWidth - 56, 320);
  const carouselPageWidth = windowWidth - 40;
  const isNew = !product?.title;

  const [step, setStep] = useState<Step>('photos');
  const [draft, setDraft] = useState<SiteProduct>(createEmptySiteProduct());
  const [uploading, setUploading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const openedProductIdRef = useRef<string | null>(null);
  const carouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      openedProductIdRef.current = null;
      return;
    }
    const productId = product?.id ?? null;
    if (productId && openedProductIdRef.current === productId) return;
    if (!productId && openedProductIdRef.current === '__new__') return;

    openedProductIdRef.current = productId ?? '__new__';
    setStep('photos');
    setActivePhotoIndex(0);
    setDraft(
      product
        ? { ...product, imagePaths: [...product.imagePaths] }
        : createEmptySiteProduct(),
    );
    // Only re-init when the modal opens or a different product is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- product body read when id changes
  }, [visible, product?.id]);

  const imageUrls = useMemo(() => {
    if (!linkedSite) return [];
    return draft.imagePaths.map((path) => storageUrl(linkedSite.user_id, path));
  }, [draft.imagePaths, linkedSite]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  const canContinuePhotos = draft.imagePaths.length > 0;
  const canContinueDetails = draft.title.trim().length > 0;
  const canSave = canContinueDetails && draft.price >= 0;

  const patch = (next: Partial<SiteProduct>) => {
    setDraft((prev) => {
      const merged = { ...prev, ...next };
      const paths = merged.imagePaths ?? prev.imagePaths;
      return { ...merged, storagePath: paths[0] ?? null };
    });
  };

  const scrollCarouselTo = (index: number, animated = true) => {
    carouselRef.current?.scrollTo({ x: index * carouselPageWidth, animated });
  };

  const onCarouselScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / carouselPageWidth);
    const clamped = Math.max(0, Math.min(index, imageUrls.length - 1));
    setActivePhotoIndex(clamped);
  };

  const addPhoto = async () => {
    if (!linkedSite) return;
    if (draft.imagePaths.length >= MAX_PRODUCT_IMAGES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PRODUCT_IMAGES} photos per product.`);
      return;
    }
    const picked = await pickSiteImageFromLibrary('Allow photo library access to add product photos.');
    if (!picked) return;

    setUploading(true);
    try {
      const storagePath = await uploadProductImageFromUri(linkedSite, picked.uri, picked.mimeType);
      const newIndex = draft.imagePaths.length;
      setDraft((prev) => {
        const imagePaths = [...prev.imagePaths, storagePath];
        return { ...prev, imagePaths, storagePath: imagePaths[0] ?? null };
      });
      setActivePhotoIndex(newIndex);
      requestAnimationFrame(() => scrollCarouselTo(newIndex, true));
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  const setCoverPhoto = (index: number) => {
    if (index === 0) return;
    let nextActive = activePhotoIndex;
    if (activePhotoIndex === index) nextActive = 0;
    else if (activePhotoIndex === 0) nextActive = 1;
    else if (activePhotoIndex < index) nextActive = activePhotoIndex + 1;

    setDraft((prev) => {
      const imagePaths = [...prev.imagePaths];
      const [pickedPath] = imagePaths.splice(index, 1);
      imagePaths.unshift(pickedPath);
      return { ...prev, imagePaths, storagePath: imagePaths[0] ?? null };
    });
    setActivePhotoIndex(nextActive);
    requestAnimationFrame(() => scrollCarouselTo(nextActive, true));
  };

  const removePhoto = (index: number) => {
    let nextActive = activePhotoIndex;
    if (index > activePhotoIndex) nextActive = activePhotoIndex;
    else if (index === activePhotoIndex) nextActive = Math.max(0, activePhotoIndex - 1);
    else nextActive = activePhotoIndex - 1;

    setDraft((prev) => {
      const imagePaths = prev.imagePaths.filter((_, i) => i !== index);
      return { ...prev, imagePaths, storagePath: imagePaths[0] ?? null };
    });
    setActivePhotoIndex(nextActive);
    requestAnimationFrame(() => scrollCarouselTo(nextActive, false));
  };

  const goNext = () => {
    if (step === 'photos' && !canContinuePhotos) {
      Alert.alert('Add a photo', 'Upload at least one product photo to continue.');
      return;
    }
    if (step === 'details' && !canContinueDetails) {
      Alert.alert('Name required', 'Give your product a name before continuing.');
      return;
    }
    if (isLastStep) {
      if (!canSave) {
        Alert.alert('Almost there', 'Add a name and price before saving.');
        return;
      }
      onSave({ ...draft, storagePath: draft.imagePaths[0] ?? null });
      onClose();
      return;
    }
    setStep(STEPS[stepIndex + 1].id);
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id);
    else onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Delete product?', 'This removes it from your shop.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.headerSide}>
            <Ionicons name={stepIndex > 0 ? 'chevron-back' : 'close'} size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isNew && step === 'photos' ? 'New product' : 'Edit product'}</Text>
            <View style={styles.stepRow}>
              {STEPS.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.stepDot,
                    index <= stepIndex && styles.stepDotActive,
                    index < stepIndex && styles.stepDotDone,
                  ]}
                />
              ))}
            </View>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12} style={styles.headerSide} disabled={!onDelete}>
            {onDelete ? <Ionicons name="trash-outline" size={20} color="#f87171" /> : null}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            step === 'photos' && styles.contentPhotos,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepLabel, step === 'photos' && styles.stepLabelCentered]}>
            {STEPS[stepIndex].label}
          </Text>
          <Text style={[styles.stepHint, step === 'photos' && styles.stepHintCentered]}>
            {step === 'photos'
              ? 'Swipe left or right to browse photos. Pick your cover image below.'
              : step === 'details'
                ? 'Help clients understand what they are buying.'
                : 'Set your price and choose whether this product is visible.'}
          </Text>

          {step === 'photos' ? (
            <View style={styles.photosStep}>
              <View style={styles.photosCenter}>
                {imageUrls.length === 0 ? (
                  <Pressable
                    style={[styles.heroAddPhoto, { width: heroSize, height: heroSize }]}
                    onPress={() => void addPhoto()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={colors.accentPink} size="large" />
                    ) : (
                      <>
                        <View style={styles.heroAddIconWrap}>
                          <Ionicons name="camera-outline" size={40} color={colors.accentPink} />
                        </View>
                        <Text style={styles.heroAddTitle}>Add product photo</Text>
                        <Text style={styles.heroAddSub}>Tap to choose from your library</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <>
                    <ScrollView
                      ref={carouselRef}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      onMomentumScrollEnd={onCarouselScrollEnd}
                      style={[styles.carousel, { width: carouselPageWidth }]}
                      contentContainerStyle={styles.carouselContent}
                    >
                      {imageUrls.map((url, index) => (
                        <View
                          key={`${url}-${index}`}
                          style={[styles.carouselPage, { width: carouselPageWidth }]}
                        >
                          <View style={[styles.heroPhotoTile, { width: heroSize, height: heroSize }]}>
                            <Image source={{ uri: url }} style={styles.heroPhotoImage} contentFit="cover" />
                            {index === 0 ? (
                              <View style={styles.coverBadge}>
                                <Text style={styles.coverBadgeText}>Cover</Text>
                              </View>
                            ) : null}
                            <Pressable
                              style={styles.photoRemoveHero}
                              onPress={() => removePhoto(index)}
                              hitSlop={8}
                            >
                              <Ionicons name="trash-outline" size={18} color="#fff" />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    {imageUrls.length > 1 ? (
                      <View style={styles.carouselMeta}>
                        <View style={styles.carouselDots}>
                          {imageUrls.map((url, index) => (
                            <View
                              key={`dot-${url}-${index}`}
                              style={[styles.carouselDot, index === activePhotoIndex && styles.carouselDotActive]}
                            />
                          ))}
                        </View>
                        <Text style={styles.carouselCounter}>
                          {activePhotoIndex + 1} of {imageUrls.length}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.coverPickerSection}>
                      <Text style={styles.coverPickerLabel}>Choose cover image</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.coverStrip}
                      >
                        {imageUrls.map((url, index) => (
                          <View key={`cover-${url}-${index}`} style={styles.coverThumbWrap}>
                            <Pressable
                              style={[
                                styles.coverThumb,
                                index === 0 && styles.coverThumbSelected,
                                index === activePhotoIndex && index !== 0 && styles.coverThumbViewing,
                              ]}
                              onPress={() => {
                                if (index === 0) {
                                  setActivePhotoIndex(0);
                                  scrollCarouselTo(0, true);
                                  return;
                                }
                                setCoverPhoto(index);
                              }}
                            >
                              <Image source={{ uri: url }} style={styles.coverThumbImage} contentFit="cover" />
                              {index === 0 ? (
                                <View style={styles.coverThumbBadge}>
                                  <Text style={styles.coverThumbBadgeText}>Cover</Text>
                                </View>
                              ) : null}
                            </Pressable>
                            <Pressable
                              style={styles.coverThumbRemove}
                              onPress={() => removePhoto(index)}
                              hitSlop={6}
                            >
                              <Ionicons name="close" size={11} color="#fff" />
                            </Pressable>
                          </View>
                        ))}
                        {draft.imagePaths.length < MAX_PRODUCT_IMAGES ? (
                          <Pressable
                            style={styles.coverAddTile}
                            onPress={() => void addPhoto()}
                            disabled={uploading}
                          >
                            {uploading ? (
                              <ActivityIndicator color={colors.accentPink} size="small" />
                            ) : (
                              <Ionicons name="add" size={26} color={colors.accentPink} />
                            )}
                          </Pressable>
                        ) : null}
                      </ScrollView>
                    </View>
                  </>
                )}

                <Text style={styles.photoHelper}>
                  {draft.imagePaths.length}/{MAX_PRODUCT_IMAGES} photos
                </Text>
              </View>
            </View>
          ) : null}

          {step === 'details' ? (
            <View style={styles.fieldsBlock}>
              <Text style={styles.fieldLabel}>Product name</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(title) => patch({ title })}
                placeholder="e.g. Moisture lock serum"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputDescription]}
                value={draft.description}
                onChangeText={(description) => patch({ description })}
                placeholder="What is it, who is it for, size, ingredients, how to use…"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.fieldHint}>This shows on your shop page under the product name.</Text>
            </View>
          ) : null}

          {step === 'price' ? (
            <View style={styles.fieldsBlock}>
              <Text style={styles.fieldLabel}>Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={draft.price > 0 ? String(draft.price) : ''}
                  onChangeText={(raw) => {
                    const price = Number(raw.replace(/[^0-9.]/g, '')) || 0;
                    patch({ price });
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.visibilityRow}>
                <View style={styles.visibilityCopy}>
                  <Text style={styles.visibilityTitle}>Visible on your site</Text>
                  <Text style={styles.visibilityBody}>
                    Turn off to hide while you are still setting things up.
                  </Text>
                </View>
                <Switch
                  value={draft.enabled}
                  onValueChange={(enabled) => patch({ enabled })}
                  trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.inventoryBlock}>
                <View style={styles.visibilityRow}>
                  <View style={styles.visibilityCopy}>
                    <Text style={styles.visibilityTitle}>Track inventory</Text>
                    <Text style={styles.visibilityBody}>
                      Set how many units you have in stock. Orders reduce this count automatically.
                    </Text>
                  </View>
                  <Switch
                    value={draft.trackInventory}
                    onValueChange={(trackInventory) => patch({ trackInventory })}
                    trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                    thumbColor="#fff"
                  />
                </View>

                {draft.trackInventory ? (
                  <View style={styles.stockRow}>
                    <Text style={styles.fieldLabel}>Quantity in stock</Text>
                    <View style={styles.stockStepper}>
                      <Pressable
                        style={styles.stockStepBtn}
                        onPress={() => patch({ stockQty: Math.max(0, draft.stockQty - 1) })}
                      >
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </Pressable>
                      <TextInput
                        style={styles.stockInput}
                        value={String(draft.stockQty)}
                        onChangeText={(raw) => {
                          const parsed = Number.parseInt(raw.replace(/\D/g, ''), 10);
                          patch({ stockQty: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 });
                        }}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                      <Pressable
                        style={styles.stockStepBtn}
                        onPress={() => patch({ stockQty: draft.stockQty + 1 })}
                      >
                        <Ionicons name="add" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.fieldHint}>
                      {draft.stockQty <= 0
                        ? 'Out of stock — clients cannot order this until you add units.'
                        : `${draft.stockQty} unit${draft.stockQty === 1 ? '' : 's'} available to sell`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryHeading}>Preview</Text>
                {imageUrls[0] ? (
                  <Image source={{ uri: imageUrls[0] }} style={styles.summaryImage} contentFit="cover" />
                ) : null}
                <Text style={styles.summaryTitle}>{draft.title.trim() || 'Product name'}</Text>
                {draft.description.trim() ? (
                  <Text style={styles.summaryDesc} numberOfLines={4}>{draft.description.trim()}</Text>
                ) : null}
                <Text style={styles.summaryPrice}>
                  ${draft.price > 0 ? draft.price.toFixed(2) : '0.00'}
                </Text>
                {draft.trackInventory ? (
                  <Text style={styles.summaryStock}>
                    {draft.stockQty <= 0 ? 'Out of stock' : `${draft.stockQty} in stock`}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, (!isLastStep && step === 'photos' && !canContinuePhotos) && styles.primaryBtnDisabled]}
            onPress={goNext}
          >
            <Text style={styles.primaryBtnText}>{isLastStep ? 'Save product' : 'Continue'}</Text>
            {!isLastStep ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const BASE_STYLES = {
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerSide: { width: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.cardBorder,
  },
  stepDotActive: { backgroundColor: colors.accentPink },
  stepDotDone: { backgroundColor: colors.accentPink, opacity: 0.55 },
  content: { padding: 20, paddingBottom: 32 },
  contentPhotos: { flexGrow: 1 },
  stepLabel: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
  stepLabelCentered: { textAlign: 'center' },
  stepHint: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: 20 },
  stepHintCentered: { textAlign: 'center', paddingHorizontal: 12 },
  photosStep: { flex: 1, minHeight: 360 },
  photosCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  heroAddPhoto: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.accentPink,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  heroAddIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentPinkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAddTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  heroAddSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  heroPhotoTile: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroPhotoImage: { width: '100%', height: '100%' },
  carousel: { alignSelf: 'center' },
  carouselContent: { alignItems: 'center' },
  carouselPage: { alignItems: 'center', justifyContent: 'center' },
  carouselMeta: { alignItems: 'center', gap: 8, marginTop: 4 },
  carouselDots: { flexDirection: 'row', gap: 6 },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
  },
  carouselDotActive: { backgroundColor: colors.accentPink, width: 18 },
  carouselCounter: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  coverPickerSection: { width: '100%', gap: 10, marginTop: 8 },
  coverPickerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  coverStrip: { gap: 10, paddingHorizontal: 4, alignItems: 'center' },
  coverThumbWrap: { position: 'relative' },
  coverThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  coverThumbSelected: { borderColor: colors.accentPink },
  coverThumbViewing: { borderColor: colors.textMuted },
  coverThumbImage: { width: '100%', height: '100%' },
  coverThumbBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.accentPinkDeep,
    paddingVertical: 3,
    alignItems: 'center',
  },
  coverThumbBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  coverThumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  coverAddTile: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accentPink,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveHero: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  coverBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoHelper: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  fieldsBlock: { gap: 8 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  fieldHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.card,
  },
  inputDescription: { minHeight: 140, lineHeight: 22 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix: { color: colors.text, fontSize: 22, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 22, fontWeight: '700' },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  visibilityCopy: { flex: 1, gap: 4 },
  visibilityTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  visibilityBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  inventoryBlock: { marginTop: 16, gap: 12 },
  stockRow: { gap: 8 },
  stockStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stockStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInput: {
    minWidth: 72,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: colors.card,
  },
  summaryCard: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  summaryHeading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  summaryImage: { width: '100%', height: 160, borderRadius: 12 },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  summaryDesc: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  summaryPrice: { color: colors.accentPink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  summaryStock: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentPink,
    borderRadius: 999,
    paddingVertical: 15,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
};
