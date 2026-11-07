-- Travel bookings always require stylist approval, even when global requireBookingApproval is off.

create or replace function public.styld_tenant_mark_booking_paid(
  p_subdomain text,
  p_booking_id uuid,
  p_payment_status text default 'deposit_paid',
  p_unit_payment_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_rows integer := 0;
  v_require_approval boolean := false;
  v_is_travel_booking boolean := false;
  v_next_status text := 'confirmed';
begin
  v_user_id := public.styld_resolve_published_user_id(p_subdomain);
  if v_user_id is null then
    raise exception 'Site not found';
  end if;

  select coalesce((data->'value'->>'requireBookingApproval')::boolean, false)
  into v_require_approval
  from public.styld_site_records
  where user_id = v_user_id
    and record_type = 'site_setting'
    and record_key = 'booking_payment'
  limit 1;

  select coalesce((data->>'is_travel_booking')::boolean, false)
  into v_is_travel_booking
  from public.styld_site_records
  where user_id = v_user_id
    and record_type = 'booking'
    and (
      id = p_booking_id
      or data->>'id' = p_booking_id::text
    )
  limit 1;

  if v_require_approval or v_is_travel_booking then
    v_next_status := 'pending_approval';
  end if;

  update public.styld_site_records
  set
    data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
      'payment_status', coalesce(nullif(trim(p_payment_status), ''), 'deposit_paid'),
      'booking_status', v_next_status,
      'unit_payment_id', p_unit_payment_id,
      'stripe_payment_intent_id', p_unit_payment_id
    ),
    updated_at = now()
  where user_id = v_user_id
    and record_type = 'booking'
    and (
      id = p_booking_id
      or data->>'id' = p_booking_id::text
    );

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'Booking not found for subdomain % and id %', p_subdomain, p_booking_id;
  end if;

  return v_rows;
end;
$$;

grant execute on function public.styld_tenant_mark_booking_paid(text, uuid, text, text) to service_role;
