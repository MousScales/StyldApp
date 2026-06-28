-- Send client confirmation email when a booking becomes confirmed (e.g. stylist accepts a request).

create or replace function public.styld_booking_client_email_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text;
  new_status text;
  v_subdomain text;
  payload jsonb;
begin
  if tg_op <> 'UPDATE' or new.record_type <> 'booking' then
    return new;
  end if;

  old_status := lower(coalesce(old.data->>'booking_status', ''));
  new_status := lower(coalesce(new.data->>'booking_status', ''));

  if new_status <> 'confirmed' or old_status = 'confirmed' then
    return new;
  end if;

  select s.subdomain
  into v_subdomain
  from public.styld_site_subdomains s
  where s.user_id = new.user_id
  limit 1;

  if v_subdomain is null or trim(v_subdomain) = '' then
    return new;
  end if;

  payload := jsonb_build_object(
    'bookingId', new.id::text,
    'subdomain', trim(v_subdomain),
    'force', true
  );

  begin
    if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
      perform net.http_post(
        url := 'https://gogpjxxsrcjpbugocvnd.supabase.co/functions/v1/booking-client-email',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := payload
      );
    end if;
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists styld_site_records_client_email_on_confirm on public.styld_site_records;
create trigger styld_site_records_client_email_on_confirm
  after update on public.styld_site_records
  for each row
  execute function public.styld_booking_client_email_on_confirm();
