-- Push notifications for booking updates (session started, payment collected, completed).

create or replace function public.styld_push_notify_on_site_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  old_status text;
  new_status text;
  old_balance text;
  new_balance text;
begin
  if new.record_type not in ('booking', 'review', 'inquiry') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.record_type <> 'booking' then
      return new;
    end if;

    old_status := lower(coalesce(old.data->>'booking_status', ''));
    new_status := lower(coalesce(new.data->>'booking_status', ''));
    old_balance := coalesce(old.data->>'balance_collected_cents', '0');
    new_balance := coalesce(new.data->>'balance_collected_cents', '0');

    if old_status = new_status and old_balance = new_balance then
      return new;
    end if;
  end if;

  payload := jsonb_build_object(
    'event', lower(tg_op),
    'record', jsonb_build_object(
      'id', new.id,
      'user_id', new.user_id,
      'record_type', new.record_type,
      'data', new.data,
      'created_at', new.created_at,
      'updated_at', new.updated_at
    )
  );

  if tg_op = 'UPDATE' then
    payload := payload || jsonb_build_object(
      'old_record', jsonb_build_object(
        'id', old.id,
        'user_id', old.user_id,
        'record_type', old.record_type,
        'data', old.data,
        'created_at', old.created_at,
        'updated_at', old.updated_at
      )
    );
  end if;

  begin
    if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
      perform net.http_post(
        url := 'https://gogpjxxsrcjpbugocvnd.supabase.co/functions/v1/styld-push-notify',
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

drop trigger if exists styld_site_records_push_notify on public.styld_site_records;
create trigger styld_site_records_push_notify
  after insert or update on public.styld_site_records
  for each row
  execute function public.styld_push_notify_on_site_record();
