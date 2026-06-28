import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MAX_SITE_PRODUCTS,
  SiteProduct,
  createEmptySiteProduct,
  formatProductStockLabel,
} from '../../data/productsCatalog';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { LinkedSite } from '../../lib/linkedSites';
import { colors } from '../../theme';
import ProductEditorModal from './ProductEditorModal';

type Props = {
  products: SiteProduct[];
  coverUrls: Record<string, string>;
  linkedSite: LinkedSite | null;
  busy?: boolean;
  onChange: (products: SiteProduct[]) => void;
};

function ProductRow({
  product,
  coverUrl,
  onPress,
}: {
  product: SiteProduct;
  coverUrl: string;
  onPress: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const photoCount = product.imagePaths.length;
  const stockLabel = formatProductStockLabel(product);
  const outOfStock = product.trackInventory && product.stockQty <= 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="bag-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{product.title}</Text>
          {!product.enabled ? (
            <View style={styles.hiddenBadge}>
              <Text style={styles.hiddenBadgeText}>Hidden</Text>
            </View>
          ) : outOfStock ? (
            <View style={styles.stockBadgeOut}>
              <Text style={styles.stockBadgeOutText}>Out of stock</Text>
            </View>
          ) : null}
        </View>
        {product.description ? (
          <Text style={styles.rowDesc} numberOfLines={2}>{product.description}</Text>
        ) : (
          <Text style={styles.rowDescMuted}>No description yet</Text>
        )}
        <View style={styles.rowMeta}>
          <Text style={styles.rowPrice}>${product.price.toFixed(2)}</Text>
          {stockLabel && !outOfStock ? (
            <Text style={styles.rowStock}>{stockLabel}</Text>
          ) : null}
          {photoCount > 1 ? (
            <Text style={styles.rowPhotos}>{photoCount} photos</Text>
          ) : photoCount === 1 ? (
            <Text style={styles.rowPhotos}>1 photo</Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SiteProductsEditor({
  products,
  coverUrls,
  linkedSite,
  busy,
  onChange,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [editing, setEditing] = useState<SiteProduct | 'new' | null>(null);
  const newProductDraftRef = useRef<SiteProduct | null>(null);

  const openNew = () => {
    if (products.length >= MAX_SITE_PRODUCTS) return;
    newProductDraftRef.current = createEmptySiteProduct();
    setEditing('new');
  };

  const openEdit = (product: SiteProduct) => setEditing(product);

  const closeEditor = () => {
    setEditing(null);
    newProductDraftRef.current = null;
  };

  const saveProduct = (saved: SiteProduct) => {
    const exists = products.some((item) => item.id === saved.id);
    if (exists) {
      onChange(products.map((item) => (item.id === saved.id ? saved : item)));
    } else {
      onChange([saved, ...products]);
    }
  };

  const deleteEditing = () => {
    if (editing === 'new' || !editing) return;
    onChange(products.filter((item) => item.id !== editing.id));
  };

  const editorProduct =
    editing === 'new'
      ? newProductDraftRef.current
      : editing === null
        ? null
        : editing;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.addHero, (busy || products.length >= MAX_SITE_PRODUCTS) && styles.addHeroDisabled]}
        onPress={openNew}
        disabled={busy || products.length >= MAX_SITE_PRODUCTS}
      >
        <View style={styles.addHeroIcon}>
          <Ionicons name="add" size={26} color={colors.accentPink} />
        </View>
        <View style={styles.addHeroCopy}>
          <Text style={styles.addHeroTitle}>Add a product</Text>
          <Text style={styles.addHeroBody}>
            Photos, description, and price — step by step
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.accentPink} />
      </Pressable>

      {products.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="storefront-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your shop is empty</Text>
          <Text style={styles.emptyBody}>
            Add hair care, merch, or anything clients can buy or add when booking.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.listHeading}>
            {products.length} product{products.length === 1 ? '' : 's'}
          </Text>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              coverUrl={coverUrls[product.id] ?? ''}
              onPress={() => openEdit(product)}
            />
          ))}
        </View>
      )}

      <Text style={styles.helper}>
        Up to {MAX_SITE_PRODUCTS} products · tap any item to edit
      </Text>

      <ProductEditorModal
        visible={editing !== null}
        product={editorProduct}
        linkedSite={linkedSite}
        onClose={closeEditor}
        onSave={saveProduct}
        onDelete={editing !== 'new' && editing ? deleteEditing : undefined}
      />
    </View>
  );
}

const BASE_STYLES = {
  wrap: { gap: 14 },
  addHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.subtleTintBg,
  },
  addHeroDisabled: { opacity: 0.5 },
  addHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeroCopy: { flex: 1, gap: 4 },
  addHeroTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addHeroBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: 28,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptyBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  list: { gap: 10 },
  listHeading: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.05,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  rowPressed: { opacity: 0.75 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  hiddenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  hiddenBadgeText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  stockBadgeOut: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
  },
  stockBadgeOutText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  rowDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  rowDescMuted: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rowPrice: { color: colors.accentPink, fontSize: 15, fontWeight: '700' },
  rowStock: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  rowPhotos: { color: colors.textMuted, fontSize: 12 },
  helper: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
};
