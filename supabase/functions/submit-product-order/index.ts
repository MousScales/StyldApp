/**
 * submit-product-order — standalone product shop checkout (pickup or shipping).
 * Payload: { subdomain, fullName, email, phone, productId, fulfillment, shippingAddress? }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type SiteProduct = {
  id: string;
  title: string;
  price: number;
  enabled: boolean;
  trackInventory?: boolean;
  stockQty?: number;
};

type ProductsSettings = {
  allowPickup?: boolean;
  allowShipping?: boolean;
  shippingFlatRate?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const subdomain = String(body.subdomain ?? '').trim();
    const productId = String(body.productId ?? '').trim();
    const fulfillment = String(body.fulfillment ?? 'pickup').toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();

    if (!subdomain || !productId || !fullName || !email) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userId, error: resolveErr } = await supabase
      .rpc('styld_resolve_published_user_id', { p_subdomain: subdomain });
    if (resolveErr || !userId) return json({ error: 'Site not found' }, 404);

    const [{ data: catalogRow }, { data: settingsRow }] = await Promise.all([
      supabase
        .from('styld_site_records')
        .select('data')
        .eq('user_id', userId)
        .eq('record_type', 'site_setting')
        .eq('record_key', 'products_catalog')
        .maybeSingle(),
      supabase
        .from('styld_site_records')
        .select('data')
        .eq('user_id', userId)
        .eq('record_type', 'site_setting')
        .eq('record_key', 'products_settings')
        .maybeSingle(),
    ]);

    const catalogValue =
      catalogRow?.data && typeof catalogRow.data === 'object' && 'value' in catalogRow.data
        ? (catalogRow.data as { value?: unknown }).value
        : catalogRow?.data;
    const products = (Array.isArray(catalogValue) ? catalogValue : []) as SiteProduct[];
    const product = products.find((p) => p.id === productId && p.enabled !== false);
    if (!product) return json({ error: 'Product not found' }, 404);

    const settingsValue =
      settingsRow?.data && typeof settingsRow.data === 'object' && 'value' in settingsRow.data
        ? (settingsRow.data as { value?: unknown }).value
        : settingsRow?.data;
    const settings = (settingsValue ?? {}) as ProductsSettings;

    if (fulfillment === 'shipping' && settings.allowShipping !== true) {
      return json({ error: 'Shipping is not available for this shop' }, 400);
    }
    if (fulfillment === 'pickup' && settings.allowPickup === false) {
      return json({ error: 'Pickup is not available for this shop' }, 400);
    }

    if (product.trackInventory === true && (product.stockQty ?? 0) < 1) {
      return json({ error: `${product.title} is out of stock` }, 400);
    }

    const productsSubtotal = Math.round(Number(product.price) * 100) / 100;

    const { error: inventoryErr } = await supabase.rpc('styld_apply_product_inventory', {
      p_user_id: userId,
      p_order_products: [
        {
          product_id: product.id,
          title: product.title,
          qty: 1,
          unit_price: productsSubtotal,
        },
      ],
    });
    if (inventoryErr) {
      const msg = inventoryErr.message || 'Could not reserve inventory';
      return json({ error: msg.includes('out of stock') ? msg : 'Product is out of stock' }, 400);
    }

    const shippingAmount =
      fulfillment === 'shipping' ? Math.max(0, Number(settings.shippingFlatRate) || 0) : 0;
    const estimatedTotal = Math.round((productsSubtotal + shippingAmount) * 100) / 100;
    const orderId = crypto.randomUUID();

    const orderData = {
      id: orderId,
      is_product_order: true,
      booking_type: 'product_order',
      full_name: fullName,
      email,
      phone,
      style_name: 'Product order',
      style_id: 'product-order',
      order_products: [
        {
          product_id: product.id,
          title: product.title,
          qty: 1,
          unit_price: productsSubtotal,
        },
      ],
      products_subtotal: productsSubtotal,
      shipping_amount: shippingAmount,
      estimated_total: estimatedTotal,
      fulfillment_method: fulfillment,
      shipping_address: fulfillment === 'shipping' ? body.shippingAddress ?? null : null,
      payment_status: 'in_person',
      booking_status: 'confirmed',
      source: 'website',
      notes: body.notes ? String(body.notes) : null,
      created_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from('styld_site_records').insert({
      id: orderId,
      user_id: userId,
      record_type: 'booking',
      data: orderData,
    });

    if (insertErr) return json({ error: insertErr.message }, 500);

    try {
      const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-salon`;
      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: orderId }),
      }).catch(() => undefined);
    } catch {
      /* best effort */
    }

    return json({ ok: true, orderId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('submit-product-order error:', err);
    return json({ error: msg }, 500);
  }
});
