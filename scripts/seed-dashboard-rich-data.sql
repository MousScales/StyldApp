-- =============================================================================
-- Rich dashboard mock data — pending requests, inquiries, extra bookings
--
-- Targets: 2025mgueye@gmail.com
-- Run AFTER seed-july-12-19-bookings.sql (or on its own).
-- Safe to re-run: removes prior mg-dash-* seed rows first.
--
-- Fills dashboard sections:
--   • Pending bookings (manual approval queue)
--   • Upcoming appointments (Jul 19–22)
--   • Recent bookings (just placed)
--   • Revenue stats (~$15,000 collected in June 2026 on dashboard)
--   • Notification bell (inquiries + pending requests)
-- =============================================================================

CREATE OR REPLACE FUNCTION public._seed_upsert_site_setting(
  p_user_id uuid,
  p_record_key text,
  p_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.styld_site_records
  SET
    data = jsonb_build_object('value', p_value),
    updated_at = now()
  WHERE user_id = p_user_id
    AND record_type = 'site_setting'
    AND record_key = p_record_key;

  IF NOT FOUND THEN
    INSERT INTO public.styld_site_records (user_id, record_type, record_key, data)
    VALUES (p_user_id, 'site_setting', p_record_key, jsonb_build_object('value', p_value));
  END IF;
END;
$$;

DO $$
DECLARE
  v_uid          uuid;
  v_email        text := '2025mgueye@gmail.com';
  v_addr         text := '1420 Peachtree St NE, Atlanta, GA 30309';
  v_i            int;
  v_appt_day     date;
  v_rev_count    int;
  v_base_price   int;
  v_price        int;
  v_hour         int;
  v_minute       int;
  v_slot         text;
  v_date_text    text;
  v_starts_at    text;
  v_style_id     text;
  v_style_name   text;
  v_duration     int;
  v_names        text[] := ARRAY[
    'Amara Johnson', 'Destiny Williams', 'Kezia Thompson', 'Naomi Clarke',
    'Jasmine Reed', 'Priya Washington', 'Aaliyah Brown', 'Maya Santos',
    'Simone Davis', 'Rochelle King', 'Fatima Diallo', 'Tanya Mitchell'
  ];
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

  RAISE NOTICE 'Seeding dashboard mock data for % (user_id=%)', v_email, v_uid;

  -- Turn on manual approval so Pending bookings section appears
  PERFORM public._seed_upsert_site_setting(v_uid, 'booking_payment', '{
    "mode": "in_person",
    "depositKind": "percent",
    "depositValue": 10,
    "depositIncludedInPrice": true,
    "requireCurrentHairPhoto": true,
    "requireReferencePhoto": false,
    "onlinePaymentsEnabled": true,
    "requireBookingApproval": true
  }'::jsonb);

  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND (
      (record_type = 'booking' AND coalesce(data->>'id', '') LIKE 'mg-dash-%')
      OR (record_type = 'inquiry' AND coalesce(data->>'source', '') = 'dashboard_seed')
      OR (record_type = 'review' AND coalesce(data->>'source', '') = 'dashboard_seed')
    );

  -- Seed scripts bypass overlap guard (mock data may share a calendar with other seeds).
  ALTER TABLE public.styld_site_records DISABLE TRIGGER styld_site_records_booking_overlap_guard;

  BEGIN
  -- ── Pending approval (dashboard “Pending bookings”) ───────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-01","full_name":"Zara Ellis","email":"zara.ellis@gmail.com","phone":"(404) 555-0612","style_id":"studio-boho-md","style_name":"Boho Braids","hair_length":"Long","appointment_date":"2026-07-19","appointment_slot":"10:30 AM","appointment_starts_at":"2026-07-19T10:30:00-04:00","duration_minutes":300,"estimated_total":260,"deposit_amount":65,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","notes":"Client sent inspo pics — wants medium length curls.","source":"seed"}', v_addr)::jsonb, now() - interval '2 hours', now() - interval '2 hours'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-02","full_name":"Layla Morris","email":"layla.m@icloud.com","phone":"(678) 555-0728","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"2026-07-20","appointment_slot":"9:45 AM","appointment_starts_at":"2026-07-20T09:45:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 hours', now() - interval '5 hours'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-03","full_name":"Brianna Cole","email":"brianna.cole@gmail.com","phone":"(770) 555-0881","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-20","appointment_slot":"3:05 PM","appointment_starts_at":"2026-07-20T15:05:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","notes":"First time client — asked about parking.","source":"seed"}', v_addr)::jsonb, now() - interval '8 hours', now() - interval '8 hours'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-04","full_name":"Carmen Ortiz","email":"cortiz@gmail.com","phone":"(404) 555-0933","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Medium","appointment_date":"2026-07-21","appointment_slot":"11:15 AM","appointment_starts_at":"2026-07-21T11:15:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '1 day', now() - interval '1 day'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-05","full_name":"Danielle Brooks","email":"d.brooks@outlook.com","phone":"(678) 555-0442","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Medium","appointment_date":"2026-07-22","appointment_slot":"10:05 AM","appointment_starts_at":"2026-07-22T10:05:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 hours', now() - interval '3 hours'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-pend-06","full_name":"Michelle Carter","email":"michelle.carter@email.com","phone":"(404) 555-0181","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Short","appointment_date":"2026-07-19","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-19T09:00:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","notes":"Just submitted — needs a quick feed-in before the weekend.","source":"seed"}', v_addr)::jsonb, now() - interval '35 minutes', now() - interval '35 minutes');

  -- ── Extra confirmed upcoming (Jul 19–22) ─────────────────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-01","full_name":"Taylor Reed","email":"taylor.reed@email.com","phone":"(678) 555-0144","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"2026-07-19","appointment_slot":"4:15 PM","appointment_starts_at":"2026-07-19T16:15:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '2 days', now() - interval '2 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-02","full_name":"Simone Davis","email":"simone.d@gmail.com","phone":"(678) 555-0341","style_id":"studio-passion-md","style_name":"Passion Twists","hair_length":"Long","appointment_date":"2026-07-23","appointment_slot":"2:15 PM","appointment_starts_at":"2026-07-23T14:15:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 days', now() - interval '3 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-03","full_name":"Naomi Clarke","email":"naomiclarke@gmail.com","phone":"(404) 555-0394","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-21","appointment_slot":"2:40 PM","appointment_starts_at":"2026-07-21T14:40:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-04","full_name":"Jasmine Reed","email":"jasmine.reed@gmail.com","phone":"(770) 555-0156","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Short","appointment_date":"2026-07-20","appointment_slot":"1:10 PM","appointment_starts_at":"2026-07-20T13:10:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 days', now() - interval '3 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-05","full_name":"Aaliyah Brown","email":"aaliyah.b@icloud.com","phone":"(770) 555-0267","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-22","appointment_slot":"12:35 PM","appointment_starts_at":"2026-07-22T12:35:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-up-06","full_name":"Maya Santos","email":"maya.santos@gmail.com","phone":"(404) 555-0423","style_id":"studio-boho-sm","style_name":"Boho Braids","hair_length":"Medium","appointment_date":"2026-07-24","appointment_slot":"9:50 AM","appointment_starts_at":"2026-07-24T09:50:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days');

  -- ── Just placed (Recent bookings on dashboard) — Jul 26–28, clear of other seeds ─
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-new-01","full_name":"Imani Foster","email":"imani.f@gmail.com","phone":"(404) 555-0774","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"2026-07-26","appointment_slot":"10:40 AM","appointment_starts_at":"2026-07-26T10:40:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"pending_approval","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '18 minutes', now() - interval '18 minutes'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-new-02","full_name":"Kayla Nguyen","email":"kayla.n@gmail.com","phone":"(678) 555-0519","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-27","appointment_slot":"2:10 PM","appointment_starts_at":"2026-07-27T14:10:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '42 minutes', now() - interval '42 minutes'),
  (v_uid, 'booking', NULL, format('{"id":"mg-dash-new-03","full_name":"Renee Powell","email":"renee.p@icloud.com","phone":"(770) 555-0633","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Short","appointment_date":"2026-07-28","appointment_slot":"11:00 AM","appointment_starts_at":"2026-07-28T11:00:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"pending","booking_status":"pending_payment","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '55 minutes', now() - interval '55 minutes');

  -- ── Monthly revenue (~$15,000) — all in June 2026, late-day slots ───────────
  -- 15 completed bookings × $1,000 on Jun 16–30 @ 4:00 PM (avoids other seed data).
  v_rev_count := 15;
  v_base_price := 1000;

  FOR v_i IN 1..v_rev_count LOOP
    v_appt_day := date '2026-06-16' + (v_i - 1);
    v_price := v_base_price;
    v_hour := 16;
    v_minute := (v_i - 1) * 4;
    v_date_text := to_char(v_appt_day, 'YYYY-MM-DD');
    v_starts_at := format('%sT%s-04:00', v_date_text, to_char(make_time(v_hour, v_minute, 0), 'HH24:MI:SS'));
    v_slot := trim(to_char(make_time(v_hour, v_minute, 0), 'FMHH12:MI AM'));
    v_duration := 90;

    v_style_id := (ARRAY[
      'studio-knotless-md', 'studio-boho-md', 'studio-passion-md',
      'studio-knotless-lg', 'studio-boho-sm', 'studio-locs-starter'
    ])[1 + ((v_i - 1) % 6)];
    v_style_name := (ARRAY[
      'Knotless Braids', 'Boho Braids', 'Passion Twists',
      'Knotless Braids', 'Boho Braids', 'Starter Locs'
    ])[1 + ((v_i - 1) % 6)];

    INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at)
    VALUES (
      v_uid,
      'booking',
      NULL,
      jsonb_build_object(
        'id', 'mg-dash-rev-' || lpad(v_i::text, 2, '0'),
        'full_name', v_names[1 + ((v_i - 1) % array_length(v_names, 1))],
        'email', format('client%02s@example.com', v_i),
        'phone', format('(404) 555-%04s', 2000 + v_i),
        'style_id', v_style_id,
        'style_name', v_style_name,
        'hair_length', (ARRAY['Medium', 'Long', 'Short'])[1 + ((v_i - 1) % 3)],
        'appointment_date', v_date_text,
        'appointment_slot', v_slot,
        'appointment_starts_at', v_starts_at,
        'duration_minutes', v_duration,
        'estimated_total', v_price,
        'deposit_amount', round(v_price * 0.25),
        'payment_status', 'paid',
        'booking_status', 'completed',
        'service_address', v_addr,
        'source', 'seed'
      ),
      (v_appt_day::timestamp + interval '8 hours') AT TIME ZONE 'America/New_York',
      (v_appt_day::timestamp + interval '8 hours') AT TIME ZONE 'America/New_York'
    );
  END LOOP;

  RAISE NOTICE 'Seeded % completed June bookings totaling $% (Jun 16–30, 2025mgueye@gmail.com)', v_rev_count, v_rev_count * v_base_price;

  ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
    RAISE;
  END;

  -- ── Site inquiries (notification bell) ───────────────────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'inquiry', NULL, '{"full_name":"Alexis Parker","email":"alexis.p@gmail.com","phone":"(404) 555-1022","message":"Hi! Do you have any openings for knotless braids the week of July 20th? Medium length.","source":"dashboard_seed"}'::jsonb, now() - interval '20 minutes', now() - interval '20 minutes'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Jordan Price","email":"jprice@gmail.com","phone":"(678) 555-1108","message":"Are you taking walk-ins this Saturday or appointment only?","source":"dashboard_seed"}'::jsonb, now() - interval '1 hour', now() - interval '1 hour'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Emma Phillips","email":"emma.p@icloud.com","phone":"(770) 555-1190","message":"How much for boho braids with medium length hair? Also do you provide the hair?","source":"dashboard_seed"}'::jsonb, now() - interval '3 hours', now() - interval '3 hours'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Nia Washington","email":"nia.w@gmail.com","phone":"(404) 555-1244","message":"I need a loc retwist before a wedding on July 25 — any late afternoon slots?","source":"dashboard_seed"}'::jsonb, now() - interval '6 hours', now() - interval '6 hours'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Chloe Bennett","email":"chloe.b@outlook.com","phone":"(678) 555-1301","message":"Can I book a consultation before committing to starter locs?","source":"dashboard_seed"}'::jsonb, now() - interval '1 day', now() - interval '1 day'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Monique Harris","email":"monique.h@gmail.com","phone":"(404) 555-1388","message":"Do you offer kids braids? My daughter is 11.","source":"dashboard_seed"}'::jsonb, now() - interval '1 day 4 hours', now() - interval '1 day 4 hours'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Sydney Adams","email":"sydney.adams@gmail.com","phone":"(770) 555-1420","message":"What is your cancellation policy if I need to reschedule?","source":"dashboard_seed"}'::jsonb, now() - interval '2 days', now() - interval '2 days'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Trinity Moore","email":"trinity.m@icloud.com","phone":"(678) 555-1499","message":"Interested in passion twists — how far out are you booking right now?","source":"dashboard_seed"}'::jsonb, now() - interval '2 days 6 hours', now() - interval '2 days 6 hours');

  -- ── Fresh reviews (notifications + social proof) ───────────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, data, created_at, updated_at) VALUES
  (v_uid, 'review', '{"client_name":"Alexis Parker","rating":5,"message":"Booked online and got approved same day. My knotless braids are flawless — already told two friends.","published":true,"source":"dashboard_seed"}'::jsonb, now() - interval '6 hours', now() - interval '6 hours'),
  (v_uid, 'review', '{"client_name":"Jordan Price","rating":5,"message":"Super professional and the studio vibe is calm. Passion twists came out exactly like my reference photo.","published":true,"source":"dashboard_seed"}'::jsonb, now() - interval '1 day', now() - interval '1 day');

  RAISE NOTICE 'Done — pending approvals, inquiries, extra bookings, and revenue data seeded.';
END;
$$;

-- ── Verify account + dashboard slices ───────────────────────────────────────
SELECT u.email, p.full_name, p.business_name, u.id AS user_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = '2025mgueye@gmail.com';

SELECT 'pending_approval' AS slice, count(*) AS n
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND r.data->>'booking_status' = 'pending_approval'
UNION ALL
SELECT 'inquiries', count(*)
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'inquiry'
UNION ALL
SELECT 'upcoming_confirmed', count(*)
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND r.data->>'booking_status' = 'confirmed'
  AND (r.data->>'appointment_starts_at')::timestamptz >= now();

-- June 2026 revenue (mg-dash-rev-* completed bookings)
SELECT round(sum((r.data->>'estimated_total')::numeric)) AS june_2026_revenue_usd
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND coalesce(r.data->>'id', '') LIKE 'mg-dash-rev-%';

-- Approximate dashboard "Month" revenue when viewing June 2026
SELECT round(sum(
  CASE
    WHEN lower(coalesce(r.data->>'payment_status', '')) = 'paid'
      OR lower(coalesce(r.data->>'booking_status', '')) = 'completed'
      THEN coalesce((r.data->>'estimated_total')::numeric, 0)
    WHEN lower(coalesce(r.data->>'payment_status', '')) IN ('deposit_paid', 'confirmed')
      THEN coalesce((r.data->>'deposit_amount')::numeric, 0)
    ELSE 0
  END
)) AS month_revenue_usd
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND lower(coalesce(r.data->>'booking_status', '')) NOT IN ('cancelled', 'canceled')
  AND r.created_at >= timestamptz '2026-06-01 00:00:00-04:00'
  AND r.created_at < timestamptz '2026-07-01 00:00:00-04:00';

SELECT
  data->>'appointment_date' AS date,
  data->>'appointment_slot' AS slot,
  data->>'full_name' AS client,
  data->>'booking_status' AS status
FROM public.styld_site_records r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '2025mgueye@gmail.com'
  AND r.record_type = 'booking'
  AND coalesce(r.data->>'id', '') LIKE 'mg-dash-%'
ORDER BY (r.data->>'appointment_starts_at')::timestamptz;
