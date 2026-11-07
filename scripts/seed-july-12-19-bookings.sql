-- =============================================================================
-- Staggered bookings for Jul 12–19, 2026 (America/New_York)
--
-- Targets: 2025mgueye@gmail.com (Hair Heaven mock account)
-- Skips Sun Jul 19 (studio closed in booking_hours); includes Sun Jul 12 special booking.
-- Start times are staggered with realistic gaps — not fixed 9 / 1 / 4 slots.
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: removes prior seed bookings on these dates first.
-- =============================================================================

DO $$
DECLARE
  v_uid   uuid;
  v_email text := '2025mgueye@gmail.com';
  v_addr  text := '1420 Peachtree St NE, Atlanta, GA 30309';
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_uid IS NULL THEN
    SELECT id, email INTO v_uid, v_email
    FROM auth.users
    WHERE email ILIKE '2025mgueye@gmail.com%'
    ORDER BY CASE WHEN email = '2025mgueye@gmail.com' THEN 0 ELSE 1 END, email
    LIMIT 1;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for 2025mgueye@gmail.com — sign up in the app first.';
  END IF;

  RAISE NOTICE 'Seeding Jul 12–19 bookings for % (user_id=%)', v_email, v_uid;

  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'booking'
    AND coalesce(data->>'source', '') = 'seed'
    AND (data->>'appointment_date')::date BETWEEN '2026-07-12' AND '2026-07-19';

  ALTER TABLE public.styld_site_records DISABLE TRIGGER styld_site_records_booking_overlap_guard;

  BEGIN
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  -- Sun Jul 12 — special Sunday appointment
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul12-1120","full_name":"Rochelle King","email":"rking@gmail.com","phone":"(678) 555-0315","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-12","appointment_slot":"11:20 AM","appointment_starts_at":"2026-07-12T11:20:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),

  -- Mon Jul 13 — full day, long styles + quick finish
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul13-0910","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-13","appointment_slot":"9:10 AM","appointment_starts_at":"2026-07-13T09:10:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul13-1345","full_name":"Simone Davis","email":"simone.d@gmail.com","phone":"(678) 555-0341","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"2026-07-13","appointment_slot":"1:50 PM","appointment_starts_at":"2026-07-13T13:50:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 days', now() - interval '3 days'),

  -- Tue Jul 14 — mid-morning start, long boho + afternoon install
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul14-1005","full_name":"Destiny Williams","email":"d.williams@gmail.com","phone":"(404) 555-0231","style_id":"studio-boho-md","style_name":"Boho Braids","hair_length":"Long","appointment_date":"2026-07-14","appointment_slot":"10:05 AM","appointment_starts_at":"2026-07-14T10:05:00-04:00","duration_minutes":300,"estimated_total":260,"deposit_amount":65,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul14-1535","full_name":"Kezia Thompson","email":"kezia.t@icloud.com","phone":"(678) 555-0182","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"2026-07-14","appointment_slot":"3:35 PM","appointment_starts_at":"2026-07-14T15:35:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),

  -- Wed Jul 15 — three staggered clients
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul15-0925","full_name":"Naomi Clarke","email":"naomiclarke@gmail.com","phone":"(404) 555-0394","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Short","appointment_date":"2026-07-15","appointment_slot":"9:25 AM","appointment_starts_at":"2026-07-15T09:25:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul15-1300","full_name":"Priya Washington","email":"priya.w@gmail.com","phone":"(404) 555-0189","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Long","appointment_date":"2026-07-15","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-15T13:00:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul15-1630","full_name":"Jasmine Reed","email":"jasmine.reed@gmail.com","phone":"(770) 555-0156","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Medium","appointment_date":"2026-07-15","appointment_slot":"4:30 PM","appointment_starts_at":"2026-07-15T16:30:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),

  -- Thu Jul 16 — late-morning long style
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul16-0940","full_name":"Aaliyah Brown","email":"aaliyah.b@icloud.com","phone":"(770) 555-0267","style_id":"studio-knotless-lg","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-16","appointment_slot":"9:40 AM","appointment_starts_at":"2026-07-16T09:40:00-04:00","duration_minutes":300,"estimated_total":240,"deposit_amount":60,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '7 days', now() - interval '7 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul16-1520","full_name":"Maya Santos","email":"maya.santos@gmail.com","phone":"(404) 555-0423","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"2026-07-16","appointment_slot":"3:20 PM","appointment_starts_at":"2026-07-16T15:20:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),

  -- Fri Jul 17 — busy Friday: quick open, long mid-day, retwist close-out
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul17-0905","full_name":"Fatima Diallo","email":"fatima.d@gmail.com","phone":"(404) 555-0198","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Medium","appointment_date":"2026-07-17","appointment_slot":"9:05 AM","appointment_starts_at":"2026-07-17T09:05:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '8 days', now() - interval '8 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul17-1105","full_name":"Tanya Mitchell","email":"t.mitchell@outlook.com","phone":"(404) 555-0278","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-17","appointment_slot":"11:05 AM","appointment_starts_at":"2026-07-17T11:05:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '7 days', now() - interval '7 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul17-1535","full_name":"Kezia Thompson","email":"kezia.t@icloud.com","phone":"(678) 555-0182","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Medium","appointment_date":"2026-07-17","appointment_slot":"3:35 PM","appointment_starts_at":"2026-07-17T15:35:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),

  -- Sat Jul 18 — lighter Saturday
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul18-1020","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-boho-sm","style_name":"Boho Braids","hair_length":"Medium","appointment_date":"2026-07-18","appointment_slot":"10:20 AM","appointment_starts_at":"2026-07-18T10:20:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '9 days', now() - interval '9 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-bk-jul18-1455","full_name":"Destiny Williams","email":"d.williams@gmail.com","phone":"(404) 555-0231","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Long","appointment_date":"2026-07-18","appointment_slot":"2:55 PM","appointment_starts_at":"2026-07-18T14:55:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"pending_payment","booking_status":"pending_payment","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '1 day', now() - interval '1 day');

  ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
    RAISE;
  END;

  RAISE NOTICE 'Inserted 14 bookings (Sun Jul 12 through Sat Jul 18). Sun Jul 19 skipped (closed).';
END;
$$;

-- Verify
SELECT
  data->>'appointment_date' AS appt_date,
  data->>'appointment_slot' AS slot,
  data->>'full_name' AS client,
  data->>'style_name' AS service,
  data->>'duration_minutes' AS mins,
  data->>'booking_status' AS status
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND (r.data->>'appointment_date')::date BETWEEN '2026-07-12' AND '2026-07-19'
ORDER BY (r.data->>'appointment_starts_at')::timestamptz;
