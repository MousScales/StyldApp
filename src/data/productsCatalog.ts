export type ProductFulfillmentMethod = 'pickup' | 'shipping' | 'at_appointment';

export type SiteProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  /** First image — kept for site/booking backward compatibility */
  storagePath: string | null;
  imagePaths: string[];
  enabled: boolean;
  /** When true, `stockQty` is enforced on the site and decremented on orders. */
  trackInventory: boolean;
  /** Units on hand — only enforced when trackInventory is true. */
  stockQty: number;
};

export type ProductsSettings = {
  allowPickup: boolean;
  allowShipping: boolean;
  shippingFlatRate: number;
  pickupInstructions: string;
  shippingNote: string;
  defaultFulfillment: 'pickup' | 'shipping';
};

export type OrderProductLine = {
  product_id: string;
  title: string;
  qty: number;
  unit_price: number;
};

export const DEFAULT_PRODUCTS_SETTINGS: ProductsSettings = {
  allowPickup: true,
  allowShipping: false,
  shippingFlatRate: 0,
  pickupInstructions: 'Pick up during studio hours. We will email you when your order is ready.',
  shippingNote: 'Orders ship within 3–5 business days.',
  defaultFulfillment: 'pickup',
};

export const MAX_SITE_PRODUCTS = 48;
export const MAX_PRODUCT_IMAGES = 8;

export function createSiteProductId(): string {
  return `prod-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function normalizeProductImagePaths(source: Record<string, unknown>): string[] {
  const fromArray = Array.isArray(source.imagePaths)
    ? source.imagePaths
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];
  if (fromArray.length) return fromArray.slice(0, MAX_PRODUCT_IMAGES);

  const legacy =
    typeof source.storagePath === 'string' && source.storagePath.trim()
      ? source.storagePath.trim()
      : '';
  return legacy ? [legacy] : [];
}

export function getProductCoverPath(product: Pick<SiteProduct, 'imagePaths' | 'storagePath'>): string | null {
  if (product.imagePaths.length) return product.imagePaths[0];
  return product.storagePath;
}

export function normalizeStockQty(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

export function isProductInStock(product: Pick<SiteProduct, 'trackInventory' | 'stockQty'>, qty = 1): boolean {
  if (!product.trackInventory) return true;
  return product.stockQty >= qty;
}

export function formatProductStockLabel(product: Pick<SiteProduct, 'trackInventory' | 'stockQty'>): string | null {
  if (!product.trackInventory) return null;
  if (product.stockQty <= 0) return 'Out of stock';
  if (product.stockQty === 1) return '1 in stock';
  return `${product.stockQty} in stock`;
}

export function createEmptySiteProduct(): SiteProduct {
  return {
    id: createSiteProductId(),
    title: '',
    description: '',
    price: 0,
    storagePath: null,
    imagePaths: [],
    enabled: true,
    trackInventory: true,
    stockQty: 0,
  };
}

export function normalizeSiteProduct(raw: unknown): SiteProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (!id || !title) return null;

  let price =
    typeof source.price === 'number' && Number.isFinite(source.price)
      ? source.price
      : 0;
  price = Math.max(0, Math.round(price * 100) / 100);

  const imagePaths = normalizeProductImagePaths(source);
  const storagePath = imagePaths[0] ?? null;

  const trackInventory = source.trackInventory === true;
  const stockQty = normalizeStockQty(source.stockQty);

  return {
    id,
    title,
    description: typeof source.description === 'string' ? source.description.trim() : '',
    price,
    storagePath,
    imagePaths,
    enabled: source.enabled !== false,
    trackInventory,
    stockQty,
  };
}

export function normalizeSiteProducts(value: unknown): SiteProduct[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SiteProduct[] = [];
  for (const item of value) {
    const product = normalizeSiteProduct(item);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
  }
  return out.slice(0, MAX_SITE_PRODUCTS);
}

export function normalizeProductsSettings(value: unknown): ProductsSettings {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const allowPickup = source.allowPickup !== false;
  const allowShipping = source.allowShipping === true;
  const defaultFulfillment =
    source.defaultFulfillment === 'shipping' && allowShipping ? 'shipping' : 'pickup';

  let shippingFlatRate =
    typeof source.shippingFlatRate === 'number' && Number.isFinite(source.shippingFlatRate)
      ? source.shippingFlatRate
      : DEFAULT_PRODUCTS_SETTINGS.shippingFlatRate;
  shippingFlatRate = Math.max(0, Math.round(shippingFlatRate * 100) / 100);

  return {
    allowPickup,
    allowShipping,
    shippingFlatRate,
    pickupInstructions:
      typeof source.pickupInstructions === 'string' && source.pickupInstructions.trim()
        ? source.pickupInstructions.trim()
        : DEFAULT_PRODUCTS_SETTINGS.pickupInstructions,
    shippingNote:
      typeof source.shippingNote === 'string' && source.shippingNote.trim()
        ? source.shippingNote.trim()
        : DEFAULT_PRODUCTS_SETTINGS.shippingNote,
    defaultFulfillment,
  };
}

export function normalizeOrderProductLines(value: unknown): OrderProductLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const productId = typeof row.product_id === 'string' ? row.product_id : '';
      const title = typeof row.title === 'string' ? row.title : '';
      const qty = typeof row.qty === 'number' && row.qty > 0 ? Math.round(row.qty) : 1;
      const unitPrice =
        typeof row.unit_price === 'number' && Number.isFinite(row.unit_price)
          ? row.unit_price
          : 0;
      if (!productId || !title) return null;
      return { product_id: productId, title, qty, unit_price: unitPrice };
    })
    .filter((line): line is OrderProductLine => line !== null);
}

export function orderProductsSubtotal(lines: OrderProductLine[]): number {
  return Math.round(
    lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0) * 100,
  ) / 100;
}

export function formatOrderProductsSummary(lines: OrderProductLine[]): string {
  if (!lines.length) return '';
  return lines.map((line) => `${line.qty}× ${line.title}`).join(', ');
}
