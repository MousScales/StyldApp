-- Product inventory: track stockQty on products_catalog and decrement on orders.

create or replace function public.styld_apply_product_inventory(
  p_user_id uuid,
  p_order_products jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog jsonb;
  v_products jsonb;
  v_new_products jsonb := '[]'::jsonb;
  v_needs jsonb := '{}'::jsonb;
  v_line jsonb;
  v_product jsonb;
  v_product_id text;
  v_key text;
  v_qty integer;
  v_need integer;
  v_track boolean;
  v_stock integer;
  v_title text;
  v_i integer;
  v_j integer;
  v_updated jsonb;
  v_record_id uuid;
begin
  if p_order_products is null
    or jsonb_typeof(p_order_products) <> 'array'
    or jsonb_array_length(p_order_products) = 0 then
    return;
  end if;

  select r.id, r.data->'value'
  into v_record_id, v_catalog
  from public.styld_site_records r
  where r.user_id = p_user_id
    and r.record_type = 'site_setting'
    and r.record_key = 'products_catalog'
  limit 1;

  if v_catalog is null or jsonb_typeof(v_catalog) <> 'array' then
    return;
  end if;

  v_products := v_catalog;

  for v_i in 0 .. jsonb_array_length(p_order_products) - 1 loop
    v_line := p_order_products->v_i;
    v_key := trim(coalesce(v_line->>'product_id', ''));
    if v_key = '' then
      continue;
    end if;
    v_qty := greatest(coalesce((v_line->>'qty')::integer, 1), 1);
    v_need := coalesce((v_needs->>v_key)::integer, 0) + v_qty;
    v_needs := jsonb_set(v_needs, array[v_key], to_jsonb(v_need), true);
  end loop;

  for v_j in 0 .. jsonb_array_length(v_products) - 1 loop
    v_product := v_products->v_j;
    v_product_id := coalesce(v_product->>'id', '');
    v_track := coalesce((v_product->>'trackInventory')::boolean, false);

    if v_track and v_product_id <> '' and v_needs ? v_product_id then
      v_need := greatest((v_needs->>v_product_id)::integer, 0);
      v_stock := greatest(coalesce((v_product->>'stockQty')::integer, 0), 0);
      v_title := coalesce(v_product->>'title', 'Product');
      if v_stock < v_need then
        raise exception '% is out of stock or does not have enough quantity available.', v_title
          using errcode = 'P0001';
      end if;
    end if;
  end loop;

  for v_j in 0 .. jsonb_array_length(v_products) - 1 loop
    v_product := v_products->v_j;
    v_product_id := coalesce(v_product->>'id', '');
    v_track := coalesce((v_product->>'trackInventory')::boolean, false);

    if v_track and v_product_id <> '' and v_needs ? v_product_id then
      v_need := greatest((v_needs->>v_product_id)::integer, 0);
      v_stock := greatest(coalesce((v_product->>'stockQty')::integer, 0), 0);
      v_updated := v_product || jsonb_build_object('stockQty', v_stock - v_need);
    else
      v_updated := v_product;
    end if;

    v_new_products := v_new_products || jsonb_build_array(v_updated);
  end loop;

  update public.styld_site_records
  set
    data = jsonb_build_object('value', v_new_products),
    updated_at = now()
  where id = v_record_id;
end;
$$;

grant execute on function public.styld_apply_product_inventory(uuid, jsonb) to service_role;

create or replace function public.styld_tenant_insert_booking(
  p_subdomain text,
  p_booking jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid;
  v_id            uuid;
  v_payload       jsonb;
  v_starts_at     timestamptz;
  v_duration_mins integer;
  v_ends_at       timestamptz;
  v_conflict      boolean := false;
begin
  v_user_id := public.styld_resolve_published_user_id(p_subdomain);
  if v_user_id is null then
    raise exception 'Site not found or not published';
  end if;

  if p_booking ? 'order_products'
    and jsonb_typeof(p_booking->'order_products') = 'array'
    and jsonb_array_length(p_booking->'order_products') > 0 then
    perform public.styld_apply_product_inventory(v_user_id, p_booking->'order_products');
  end if;

  v_starts_at := nullif(trim(p_booking->>'appointment_starts_at'), '')::timestamptz;

  if v_starts_at is not null then
    v_duration_mins := greatest(coalesce((p_booking->>'duration_minutes')::integer, 120), 30);
    v_ends_at := v_starts_at + make_interval(mins => v_duration_mins);

    select exists (
      select 1
      from public.styld_site_records r
      where r.user_id = v_user_id
        and r.record_type = 'booking'
        and coalesce(r.data->>'booking_status', '') not in ('cancelled', 'canceled')
        and (r.data->>'appointment_starts_at') is not null
        and (r.data->>'appointment_starts_at')::timestamptz < v_ends_at
        and (
          (r.data->>'appointment_starts_at')::timestamptz
          + make_interval(mins => greatest(coalesce((r.data->>'duration_minutes')::integer, 120), 30))
        ) > v_starts_at
    )
    into v_conflict;

    if v_conflict then
      raise exception 'That time slot is no longer available. Please choose a different time.'
        using errcode = 'P0001';
    end if;

    select exists (
      select 1
      from public.styld_site_records r
      where r.user_id = v_user_id
        and r.record_type = 'blocked_interval'
        and (r.data->>'starts_at') is not null
        and (r.data->>'ends_at') is not null
        and (r.data->>'starts_at')::timestamptz < v_ends_at
        and (r.data->>'ends_at')::timestamptz > v_starts_at
    )
    into v_conflict;

    if v_conflict then
      raise exception 'That time slot is blocked. Please choose a different time.'
        using errcode = 'P0001';
    end if;
  end if;

  v_id := coalesce((p_booking->>'id')::uuid, gen_random_uuid());
  v_payload := p_booking || jsonb_build_object('id', v_id::text);

  insert into public.styld_site_records (id, user_id, record_type, data)
  values (v_id, v_user_id, 'booking', v_payload);

  return v_id;
end;
$$;

grant execute on function public.styld_tenant_insert_booking(text, jsonb) to anon, authenticated;
