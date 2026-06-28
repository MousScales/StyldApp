import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SiteProductsEditor from '../../components/site/SiteProductsEditor';
import ScreenGradient from '../../components/ScreenGradient';
import { useSiteContent } from '../../context/SiteContentContext';
import { useSiteData } from '../../context/SiteDataContext';
import {
  DEFAULT_PRODUCTS_SETTINGS,
  ProductsSettings,
  SiteProduct,
  getProductCoverPath,
} from '../../data/productsCatalog';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import {
  loadProductsSettings,
  loadSiteProducts,
  saveProductsSettings,
  saveSiteProducts,
} from '../../lib/siteServices';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { STYLE_COVER_BUCKET } from '../../data/serviceCatalog';
import { getSiteDataSupabaseUrl } from '../../lib/linkedSites';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProductsSettings'>;

function productImageUrl(userId: string, storagePath: string | null): string {
  if (!storagePath) return '';
  const base = getSiteDataSupabaseUrl()?.replace(/\/$/, '') ?? '';
  if (!base) return '';
  return `${base}/storage/v1/object/public/${STYLE_COVER_BUCKET}/${storagePath.replace(/^\/+/, '')}`;
}

export default function ProductsSettingsScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { content, updateContent } = useSiteContent();
  const { linkedSite } = useSiteData();

  const [products, setProducts] = useState<SiteProduct[]>([]);
  const [settings, setSettings] = useState<ProductsSettings>(DEFAULT_PRODUCTS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);

  const isVisible = !content.hiddenSections.includes('products');

  const coverUrls = useMemo(() => {
    if (!linkedSite) return {};
    const out: Record<string, string> = {};
    for (const product of products) {
      const cover = getProductCoverPath(product);
      out[product.id] = productImageUrl(linkedSite.user_id, cover);
    }
    return out;
  }, [linkedSite, products]);

  const load = useCallback(async () => {
    if (!linkedSite) {
      setLoading(false);
      return;
    }
    const silent = hasLoadedOnceRef.current;
    if (!silent) setLoading(true);
    try {
      const [catalog, productSettings] = await Promise.all([
        loadSiteProducts(linkedSite),
        loadProductsSettings(linkedSite),
      ]);
      setProducts(catalog);
      setSettings(productSettings);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      Alert.alert('Could not load products', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [linkedSite]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleVisible = () => {
    updateContent({
      hiddenSections: isVisible
        ? [...content.hiddenSections, 'products']
        : content.hiddenSections.filter((section) => section !== 'products'),
    });
    setSaved(false);
  };

  const save = async () => {
    if (!linkedSite) return;
    setSaving(true);
    try {
      await Promise.all([
        saveSiteProducts(linkedSite, products),
        saveProductsSettings(linkedSite, settings),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenGradient />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Products</Text>
          <Pressable onPress={() => void save()} style={styles.saveBtn} disabled={saving || loading}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accentPink} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <SiteProductsEditor
              products={products}
              coverUrls={coverUrls}
              linkedSite={linkedSite}
              busy={saving}
              onChange={(next) => {
                setProducts(next);
                setSaved(false);
              }}
            />

            <Pressable
              style={styles.shopSettingsToggle}
              onPress={() => setShowShopSettings((v) => !v)}
            >
              <Text style={styles.shopSettingsToggleText}>Shop page & fulfillment</Text>
              <Ionicons
                name={showShopSettings ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {showShopSettings ? (
              <View style={styles.shopSettingsBlock}>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <Text style={styles.rowTitle}>Show on your site</Text>
                      <Text style={styles.rowBody}>Adds a Shop tab in your site header.</Text>
                    </View>
                    <Switch
                      value={isVisible}
                      onValueChange={toggleVisible}
                      trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Page title</Text>
                <TextInput
                  style={styles.input}
                  value={content.productsTitle}
                  onChangeText={(productsTitle) => updateContent({ productsTitle })}
                  placeholder="Shop"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.fieldLabel}>Page blurb</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={content.productsBlurb}
                  onChangeText={(productsBlurb) => updateContent({ productsBlurb })}
                  placeholder="Products available for pickup or shipping."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                <Text style={styles.sectionLabel}>Fulfillment</Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.rowTitle}>Pickup</Text>
                    <Switch
                      value={settings.allowPickup}
                      onValueChange={(allowPickup) => {
                        setSettings({ ...settings, allowPickup });
                        setSaved(false);
                      }}
                      trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowTitle}>Shipping</Text>
                    <Switch
                      value={settings.allowShipping}
                      onValueChange={(allowShipping) => {
                        setSettings({ ...settings, allowShipping });
                        setSaved(false);
                      }}
                      trackColor={{ false: colors.cardBorder, true: colors.accentPink }}
                      thumbColor="#fff"
                    />
                  </View>
                  {settings.allowShipping ? (
                    <>
                      <Text style={styles.fieldLabel}>Flat shipping rate ($)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={settings.shippingFlatRate > 0 ? String(settings.shippingFlatRate) : ''}
                        onChangeText={(raw) => {
                          const shippingFlatRate = Number(raw.replace(/[^0-9.]/g, '')) || 0;
                          setSettings({ ...settings, shippingFlatRate });
                          setSaved(false);
                        }}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={styles.fieldLabel}>Shipping note</Text>
                      <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={settings.shippingNote}
                        onChangeText={(shippingNote) => {
                          setSettings({ ...settings, shippingNote });
                          setSaved(false);
                        }}
                        placeholderTextColor={colors.textMuted}
                        multiline
                      />
                    </>
                  ) : null}
                  {settings.allowPickup ? (
                    <>
                      <Text style={styles.fieldLabel}>Pickup instructions</Text>
                      <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={settings.pickupInstructions}
                        onChangeText={(pickupInstructions) => {
                          setSettings({ ...settings, pickupInstructions });
                          setSaved(false);
                        }}
                        placeholderTextColor={colors.textMuted}
                        multiline
                      />
                    </>
                  ) : null}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const BASE_STYLES = {
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  saveBtnText: { color: colors.accentPink, fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 10 },
  shopSettingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  shopSettingsToggleText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  shopSettingsBlock: { gap: 10, paddingBottom: 8 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 16,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
};
