-- Enforce no overlapping bookings on direct inserts/updates (manual app bookings, scripts, etc.).
-- Public tenant RPC styld_tenant_insert_booking already checks; this closes the gap for authenticated inserts.

create or replace function public.styld_assert_booking_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at     timestamptz;
  v_duration_mins integer;
  v_ends_at       timestamptz;
  v_status        text;
  v_conflict      boolean := false;
begin
  if new.record_type is distinct from 'booking' then
    return new;
  end if;

  v_status := lower(coalesce(new.data->>'booking_status', ''));
  if v_status in ('cancelled', 'canceled') then
    return new;
  end if;

  v_starts_at := nullif(trim(new.data->>'appointment_starts_at'), '')::timestamptz;
  if v_starts_at is null then
    return new;
  end if;

  v_duration_mins := greatest(coalesce((new.data->>'duration_minutes')::integer, 120), 30);
  v_ends_at := v_starts_at + make_interval(mins => v_duration_mins);

  select exists (
    select 1
    from public.styld_site_records r
    where r.user_id = new.user_id
      and r.record_type = 'booking'
      and r.id is distinct from new.id
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
    where r.user_id = new.user_id
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

  return new;
end;
$$;

drop trigger if exists styld_site_records_booking_overlap_guard on public.styld_site_records;

create trigger styld_site_records_booking_overlap_guard
  before insert or update of data, record_type
  on public.styld_site_records
  for each row
  execute function public.styld_assert_booking_no_overlap();

-- Normalize saved booking_hours capacity to 1 for existing sites.
update public.styld_site_records
set data = jsonb_set(
  data,
  '{value,concurrentAppointmentCapacity}',
  '1'::jsonb,
  true
)
where record_type = 'site_setting'
  and record_key = 'booking_hours'
  and coalesce((data->'value'->>'concurrentAppointmentCapacity')::integer, 0) <> 1;
