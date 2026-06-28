-- =============================================================================
-- Mock APP data for 2025mgueye@gmail.com (and common typo 2025mgueye@gmaill.com)
--
-- Seeds: profile, services, bookings, reviews, blocked time, inquiries,
--        working hours, payments, cancellation, onboarding.
--
-- Does NOT touch site editor / live site content:
--   site_content, site_theme, site_publish, style_cover_image
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: wipes bookings + seed-tagged reviews/inquiries, then re-seeds.
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
  v_email        text;
  v_addr         text := '1420 Peachtree St NE, Atlanta, GA 30309';
  v_prices       jsonb := '{
    "studio-knotless-sm": 160,
    "studio-knotless-md": 200,
    "studio-knotless-lg": 240,
    "studio-boho-sm": 220,
    "studio-boho-md": 260,
    "studio-boho-lg": 300,
    "studio-passion-sm": 180,
    "studio-passion-md": 220,
    "studio-fulani-one": 200,
    "studio-locs-starter": 350,
    "studio-locs-retwist": 100,
    "studio-feedin-10plus": 120,
    "studio-wig-install": 150
  }'::jsonb;
  v_meta         jsonb := '{
    "studio-knotless-sm": {"title": "Knotless Braids", "description": "Small individual knotless braids. Lightweight and low tension.", "category": "KNOTLESS", "durationMinutes": 180},
    "studio-knotless-md": {"title": "Knotless Braids", "description": "Medium knotless braids — balance of size, style, and longevity.", "category": "KNOTLESS", "durationMinutes": 240},
    "studio-knotless-lg": {"title": "Knotless Braids", "description": "Large knotless braids for a bold, dramatic look.", "category": "KNOTLESS", "durationMinutes": 300},
    "studio-boho-sm": {"title": "Boho Braids", "description": "Small bohemian knotless braids with flowing curly ends.", "category": "BOHO BRAIDS", "durationMinutes": 240},
    "studio-boho-md": {"title": "Boho Braids", "description": "Medium boho braids — most-requested style.", "category": "BOHO BRAIDS", "durationMinutes": 300},
    "studio-boho-lg": {"title": "Boho Braids", "description": "Large boho braids with voluminous curly ends.", "category": "BOHO BRAIDS", "durationMinutes": 360},
    "studio-passion-sm": {"title": "Passion Twists", "description": "Small passion twists — lightweight and full of texture.", "category": "PASSION TWIST", "durationMinutes": 180},
    "studio-passion-md": {"title": "Passion Twists", "description": "Medium passion twists with gorgeous coily texture.", "category": "PASSION TWIST", "durationMinutes": 240},
    "studio-fulani-one": {"title": "Fulani Braids", "description": "Traditional Fulani-inspired cornrow pattern with free-hanging braids.", "category": "FULANI", "durationMinutes": 180},
    "studio-locs-starter": {"title": "Starter Locs", "description": "Begin your loc journey with precision-sized starter locs.", "category": "LOCS", "durationMinutes": 360},
    "studio-locs-retwist": {"title": "Loc Retwist", "description": "Professional retwist to keep your locs neat and healthy.", "category": "LOCS", "durationMinutes": 120},
    "studio-feedin-10plus": {"title": "Feed-In Braids", "description": "10+ feed-in braids for a full, intricate cornrow look.", "category": "FEED-IN BRAIDS", "durationMinutes": 90},
    "studio-wig-install": {"title": "Wig Install & Style", "description": "Professional wig install with edge styling.", "category": "WIG & WEAVES", "durationMinutes": 90}
  }'::jsonb;
BEGIN
  SELECT id, email INTO v_uid, v_email
  FROM auth.users
  WHERE email ILIKE '2025mgueye@gmail.com%'
  ORDER BY CASE WHEN email = '2025mgueye@gmail.com' THEN 0 ELSE 1 END, email
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found for email starting with 2025mgueye@gmail.com — sign up in the app first.';
  END IF;

  RAISE NOTICE 'Seeding mock app data for % (user_id=%)', v_email, v_uid;

  -- ── Profile (Account screen) ───────────────────────────────────────────────
  UPDATE public.profiles
  SET
    full_name = coalesce(nullif(trim(full_name), ''), 'Mariama Gueye'),
    business_name = coalesce(nullif(trim(business_name), ''), 'Hair Heaven Studio'),
    updated_at = now()
  WHERE id = v_uid;

  -- ── Wipe re-seedable app records (NOT site editor settings) ───────────────
  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'booking';

  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'blocked_interval';

  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'review'
    AND coalesce(data->>'source', '') = 'seed';

  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'inquiry'
    AND coalesce(data->>'source', '') = 'seed';

  -- ── Services menu (Styles screen — not site theme/content) ───────────────
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_price_overrides', v_prices);
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_catalog_meta', v_meta);

  -- ── Working hours, payments, cancellation (Schedule / business settings) ─
  PERFORM public._seed_upsert_site_setting(v_uid, 'booking_hours', '{
    "hoursInAdvance": 72,
    "concurrentAppointmentCapacity": 1,
    "days": {
      "0": {"closed": true},
      "1": {"open": "09:00", "close": "18:00", "slots": ["9:00 AM", "1:00 PM", "4:00 PM"]},
      "2": {"open": "09:00", "close": "18:00", "slots": ["9:00 AM", "1:00 PM", "4:00 PM"]},
      "3": {"open": "09:00", "close": "18:00", "slots": ["9:00 AM", "1:00 PM", "4:00 PM"]},
      "4": {"open": "09:00", "close": "18:00", "slots": ["9:00 AM", "1:00 PM", "4:00 PM"]},
      "5": {"open": "09:00", "close": "18:00", "slots": ["9:00 AM", "1:00 PM", "4:00 PM"]},
      "6": {"closed": true}
    }
  }'::jsonb);

  PERFORM public._seed_upsert_site_setting(v_uid, 'booking_payment', '{
    "mode": "in_person",
    "depositKind": "percent",
    "depositValue": 10,
    "depositIncludedInPrice": true,
    "requireCurrentHairPhoto": true,
    "requireReferencePhoto": false,
    "onlinePaymentsEnabled": false
  }'::jsonb);

  PERFORM public._seed_upsert_site_setting(v_uid, 'cancellation_policy', '{
    "preset": "24_hours",
    "cancelNoticeHours": 0,
    "fullRefundNoticeHours": 24,
    "refundAppliesTo": "both",
    "policySummary": "You may cancel online anytime before your appointment. Online deposits and full payments are fully refunded when you cancel at least 24 hours before your appointment. Cancellations after that deadline are non-refundable for online deposits and full payments."
  }'::jsonb);

  -- ── Account onboarding (completed) ───────────────────────────────────────
  PERFORM public._seed_upsert_site_setting(v_uid, 'onboarding_state', jsonb_build_object(
    'completed', true,
    'completedAt', '2026-01-10T14:00:00Z',
    'survey', jsonb_build_object(
      'businessType', 'hair_salon',
      'businessTypeOther', '',
      'whyStyld', jsonb_build_array('booking_site', 'calendar'),
      'heardFrom', 'instagram',
      'excitedAbout', jsonb_build_array('online_booking', 'client_management'),
      'dreamOutcome', 'fill_calendar',
      'dreamNote', 'Grow my chair with online booking and a polished brand.'
    ),
    'responsesSavedAt', '2026-01-10T14:00:00Z'
  ));

  PERFORM public._seed_upsert_site_setting(v_uid, 'onboarding_responses', jsonb_build_object(
    'version', 1,
    'flow', 'account_onboarding',
    'completedAt', '2026-01-10T14:00:00Z',
    'userId', v_uid::text,
    'accountEmail', v_email,
    'fullName', 'Mariama Gueye',
    'survey', jsonb_build_object(
      'businessType', 'hair_salon',
      'businessTypeOther', '',
      'whyStyld', jsonb_build_array('booking_site', 'calendar'),
      'heardFrom', 'instagram',
      'excitedAbout', jsonb_build_array('online_booking', 'client_management'),
      'dreamOutcome', 'fill_calendar',
      'dreamNote', 'Grow my chair with online booking and a polished brand.'
    ),
    'business', jsonb_build_object(
      'name', 'Hair Heaven Studio',
      'phone', '(404) 555-0199',
      'email', v_email,
      'instagram', 'hairheavenstudio',
      'addressLine1', '1420 Peachtree St NE',
      'city', 'Atlanta',
      'state', 'GA',
      'zip', '30309'
    )
  ));

  -- ── Reviews (Reviews settings + client reviews) ──────────────────────────
  PERFORM public._seed_upsert_site_setting(v_uid, 'reviews_settings', '{"enabled": true}'::jsonb);

  INSERT INTO public.styld_site_records (user_id, record_type, data, created_at, updated_at) VALUES
  (v_uid, 'review', '{"client_name":"Amara Johnson","rating":5,"message":"Best knotless braids I have ever had. Super neat parts and she finished right on time. Already booked again.","published":true,"source":"seed"}'::jsonb, now() - interval '12 days', now() - interval '12 days'),
  (v_uid, 'review', '{"client_name":"Destiny Williams","rating":5,"message":"The boho braids were everything! Full, flowy, and they lasted weeks. Studio was clean and the vibe was amazing.","published":true,"source":"seed"}'::jsonb, now() - interval '10 days', now() - interval '10 days'),
  (v_uid, 'review', '{"client_name":"Kezia Thompson","rating":4,"message":"Really loved my passion twists. Style came out beautiful — just book a little extra time if your hair is long.","published":true,"source":"seed"}'::jsonb, now() - interval '8 days', now() - interval '8 days'),
  (v_uid, 'review', '{"client_name":"Naomi Clarke","rating":5,"message":"Professional from start to finish. Deposit was easy and my hair looks incredible.","published":true,"source":"seed"}'::jsonb, now() - interval '6 days', now() - interval '6 days'),
  (v_uid, 'review', '{"client_name":"Jasmine Reed","rating":5,"message":"I was nervous trying a new stylist but she made me feel comfortable. My feed-ins are crisp.","published":true,"source":"seed"}'::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid, 'review', '{"client_name":"Priya Washington","rating":5,"message":"Wig install was seamless — looked like it grew from my scalp. Will be back for braids next month.","published":true,"source":"seed"}'::jsonb, now() - interval '2 days', now() - interval '2 days'),
  (v_uid, 'review', '{"client_name":"Rochelle King","rating":4,"message":"Great experience overall. Booking online was simple and the results matched my inspo pics.","published":true,"source":"seed"}'::jsonb, now() - interval '1 day', now() - interval '1 day');

  -- ── Blocked time (Calendar) ──────────────────────────────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'blocked_interval', NULL, jsonb_build_object(
    'starts_at', (date_trunc('week', now()) + interval '3 days' + interval '12 hours')::timestamptz,
    'ends_at', (date_trunc('week', now()) + interval '3 days' + interval '14 hours')::timestamptz,
    'note', 'Supply run'
  ), now(), now()),
  (v_uid, 'blocked_interval', NULL, jsonb_build_object(
    'starts_at', (date_trunc('week', now()) + interval '8 days' + interval '9 hours')::timestamptz,
    'ends_at', (date_trunc('week', now()) + interval '8 days' + interval '13 hours')::timestamptz,
    'note', 'Personal appointment'
  ), now(), now());

  -- ── Site inquiries (Notifications / dashboard) ─────────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  (v_uid, 'inquiry', NULL, '{"full_name":"Michelle Carter","email":"michelle.carter@email.com","phone":"(404) 555-0181","message":"Hi! Do you have availability for passion twists next week?","source":"seed"}'::jsonb, now() - interval '2 days', now() - interval '2 days'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Taylor Reed","email":"taylor.reed@email.com","phone":"(678) 555-0144","message":"Looking for a consultation before booking knotless braids.","source":"seed"}'::jsonb, now() - interval '5 hours', now() - interval '5 hours'),
  (v_uid, 'inquiry', NULL, '{"full_name":"Simone Davis","email":"simone.d@gmail.com","phone":"(678) 555-0341","message":"Can you do boho braids on short natural hair?","source":"seed"}'::jsonb, now() - interval '30 minutes', now() - interval '30 minutes');

  -- ── Bookings (Calendar, clients, dashboard, stats) ───────────────────────
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES
  -- Completed (past)
  (v_uid,'booking',NULL,format('{"id":"mg-bk-001","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '45 days', 'YYYY-MM-DD'), to_char(now() - interval '45 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '47 days', now() - interval '45 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-002","full_name":"Destiny Williams","email":"d.williams@gmail.com","phone":"(404) 555-0231","style_id":"studio-boho-md","style_name":"Boho Braids","hair_length":"Long","appointment_date":"%s","appointment_slot":"1:00 PM","appointment_starts_at":"%sT13:00:00-04:00","duration_minutes":300,"estimated_total":260,"deposit_amount":65,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '42 days', 'YYYY-MM-DD'), to_char(now() - interval '42 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '44 days', now() - interval '42 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-003","full_name":"Kezia Thompson","email":"kezia.t@icloud.com","phone":"(678) 555-0182","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '38 days', 'YYYY-MM-DD'), to_char(now() - interval '38 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '40 days', now() - interval '38 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-004","full_name":"Naomi Clarke","email":"naomiclarke@gmail.com","phone":"(404) 555-0394","style_id":"studio-knotless-lg","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":300,"estimated_total":240,"deposit_amount":60,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '35 days', 'YYYY-MM-DD'), to_char(now() - interval '35 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '37 days', now() - interval '35 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-005","full_name":"Jasmine Reed","email":"jasmine.reed@gmail.com","phone":"(770) 555-0156","style_id":"studio-boho-sm","style_name":"Boho Braids","hair_length":"Medium","appointment_date":"%s","appointment_slot":"1:00 PM","appointment_starts_at":"%sT13:00:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '32 days', 'YYYY-MM-DD'), to_char(now() - interval '32 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '34 days', now() - interval '32 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-006","full_name":"Tanya Mitchell","email":"t.mitchell@outlook.com","phone":"(404) 555-0278","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Medium","appointment_date":"%s","appointment_slot":"4:00 PM","appointment_starts_at":"%sT16:00:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '28 days', 'YYYY-MM-DD'), to_char(now() - interval '28 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '30 days', now() - interval '28 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-007","full_name":"Simone Davis","email":"simone.d@gmail.com","phone":"(678) 555-0341","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Medium","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '25 days', 'YYYY-MM-DD'), to_char(now() - interval '25 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '27 days', now() - interval '25 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-008","full_name":"Priya Washington","email":"priya.w@gmail.com","phone":"(404) 555-0189","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Short","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '22 days', 'YYYY-MM-DD'), to_char(now() - interval '22 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '24 days', now() - interval '22 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-009","full_name":"Aaliyah Brown","email":"aaliyah.b@icloud.com","phone":"(770) 555-0267","style_id":"studio-boho-lg","style_name":"Boho Braids","hair_length":"Long","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":360,"estimated_total":300,"deposit_amount":75,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '18 days', 'YYYY-MM-DD'), to_char(now() - interval '18 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '20 days', now() - interval '18 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-010","full_name":"Maya Santos","email":"maya.santos@gmail.com","phone":"(404) 555-0423","style_id":"studio-passion-md","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"%s","appointment_slot":"1:00 PM","appointment_starts_at":"%sT13:00:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '14 days', 'YYYY-MM-DD'), to_char(now() - interval '14 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '16 days', now() - interval '14 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-011","full_name":"Rochelle King","email":"rking@gmail.com","phone":"(678) 555-0315","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '10 days', 'YYYY-MM-DD'), to_char(now() - interval '10 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '12 days', now() - interval '10 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-012","full_name":"Fatima Diallo","email":"fatima.d@gmail.com","phone":"(404) 555-0198","style_id":"studio-locs-starter","style_name":"Starter Locs","hair_length":"Short","appointment_date":"%s","appointment_slot":"9:00 AM","appointment_starts_at":"%sT09:00:00-04:00","duration_minutes":360,"estimated_total":350,"deposit_amount":88,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '7 days', 'YYYY-MM-DD'), to_char(now() - interval '7 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '9 days', now() - interval '7 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-013","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Medium","appointment_date":"%s","appointment_slot":"4:00 PM","appointment_starts_at":"%sT16:00:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"paid","booking_status":"completed","service_address":"%s","source":"seed"}', to_char(now() - interval '3 days', 'YYYY-MM-DD'), to_char(now() - interval '3 days', 'YYYY-MM-DD'), v_addr)::jsonb, now() - interval '5 days', now() - interval '3 days'),
  -- Upcoming — full week Jul 5–11, 2026 (America/New_York)
  -- Slot-safe durations: 9 AM ≤240 min, 1 PM ≤180 min, 4 PM ≤120 min (no overlap)
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0509","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-05","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-05T09:00:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 days', now() - interval '3 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0513","full_name":"Destiny Williams","email":"d.williams@gmail.com","phone":"(404) 555-0231","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Long","appointment_date":"2026-07-05","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-05T13:00:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '2 days', now() - interval '2 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0609","full_name":"Kezia Thompson","email":"kezia.t@icloud.com","phone":"(678) 555-0182","style_id":"studio-boho-sm","style_name":"Boho Braids","hair_length":"Medium","appointment_date":"2026-07-06","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-06T09:00:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0613","full_name":"Naomi Clarke","email":"naomiclarke@gmail.com","phone":"(404) 555-0394","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Long","appointment_date":"2026-07-06","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-06T13:00:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0616","full_name":"Jasmine Reed","email":"jasmine.reed@gmail.com","phone":"(770) 555-0156","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Medium","appointment_date":"2026-07-06","appointment_slot":"4:00 PM","appointment_starts_at":"2026-07-06T16:00:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '3 days', now() - interval '3 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0709","full_name":"Priya Washington","email":"priya.w@gmail.com","phone":"(404) 555-0189","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Short","appointment_date":"2026-07-07","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-07T09:00:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0713","full_name":"Aaliyah Brown","email":"aaliyah.b@icloud.com","phone":"(770) 555-0267","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Long","appointment_date":"2026-07-07","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-07T13:00:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0716","full_name":"Maya Santos","email":"maya.santos@gmail.com","phone":"(404) 555-0423","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"2026-07-07","appointment_slot":"4:00 PM","appointment_starts_at":"2026-07-07T16:00:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '4 days', now() - interval '4 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0809","full_name":"Simone Davis","email":"simone.d@gmail.com","phone":"(678) 555-0341","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"2026-07-08","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-08T09:00:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0813","full_name":"Rochelle King","email":"rking@gmail.com","phone":"(678) 555-0315","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-08","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-08T13:00:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0816","full_name":"Fatima Diallo","email":"fatima.d@gmail.com","phone":"(404) 555-0198","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Short","appointment_date":"2026-07-08","appointment_slot":"4:00 PM","appointment_starts_at":"2026-07-08T16:00:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '5 days', now() - interval '5 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0909","full_name":"Tanya Mitchell","email":"t.mitchell@outlook.com","phone":"(404) 555-0278","style_id":"studio-boho-sm","style_name":"Boho Braids","hair_length":"Medium","appointment_date":"2026-07-09","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-09T09:00:00-04:00","duration_minutes":240,"estimated_total":220,"deposit_amount":55,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '7 days', now() - interval '7 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0913","full_name":"Amara Johnson","email":"amara.johnson@gmail.com","phone":"(404) 555-0147","style_id":"studio-passion-sm","style_name":"Passion Twists","hair_length":"Medium","appointment_date":"2026-07-09","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-09T13:00:00-04:00","duration_minutes":180,"estimated_total":180,"deposit_amount":45,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '7 days', now() - interval '7 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-0916","full_name":"Destiny Williams","email":"d.williams@gmail.com","phone":"(404) 555-0231","style_id":"studio-locs-retwist","style_name":"Loc Retwist","hair_length":"Long","appointment_date":"2026-07-09","appointment_slot":"4:00 PM","appointment_starts_at":"2026-07-09T16:00:00-04:00","duration_minutes":120,"estimated_total":100,"deposit_amount":25,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '6 days', now() - interval '6 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-1009","full_name":"Kezia Thompson","email":"kezia.t@icloud.com","phone":"(678) 555-0182","style_id":"studio-knotless-md","style_name":"Knotless Braids","hair_length":"Long","appointment_date":"2026-07-10","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-10T09:00:00-04:00","duration_minutes":240,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '8 days', now() - interval '8 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-1013","full_name":"Naomi Clarke","email":"naomiclarke@gmail.com","phone":"(404) 555-0394","style_id":"studio-fulani-one","style_name":"Fulani Braids","hair_length":"Long","appointment_date":"2026-07-10","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-10T13:00:00-04:00","duration_minutes":180,"estimated_total":200,"deposit_amount":50,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '8 days', now() - interval '8 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-1016","full_name":"Jasmine Reed","email":"jasmine.reed@gmail.com","phone":"(770) 555-0156","style_id":"studio-wig-install","style_name":"Wig Install & Style","hair_length":"Medium","appointment_date":"2026-07-10","appointment_slot":"4:00 PM","appointment_starts_at":"2026-07-10T16:00:00-04:00","duration_minutes":90,"estimated_total":150,"deposit_amount":38,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '7 days', now() - interval '7 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-1109","full_name":"Priya Washington","email":"priya.w@gmail.com","phone":"(404) 555-0189","style_id":"studio-knotless-sm","style_name":"Knotless Braids","hair_length":"Medium","appointment_date":"2026-07-11","appointment_slot":"9:00 AM","appointment_starts_at":"2026-07-11T09:00:00-04:00","duration_minutes":180,"estimated_total":160,"deposit_amount":40,"payment_status":"deposit_paid","booking_status":"confirmed","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '9 days', now() - interval '9 days'),
  (v_uid,'booking',NULL,format('{"id":"mg-bk-jul-1113","full_name":"Aaliyah Brown","email":"aaliyah.b@icloud.com","phone":"(770) 555-0267","style_id":"studio-feedin-10plus","style_name":"Feed-In Braids","hair_length":"Medium","appointment_date":"2026-07-11","appointment_slot":"1:00 PM","appointment_starts_at":"2026-07-11T13:00:00-04:00","duration_minutes":90,"estimated_total":120,"deposit_amount":30,"payment_status":"pending_payment","booking_status":"pending_payment","service_address":"%s","source":"seed"}', v_addr)::jsonb, now() - interval '1 day', now() - interval '1 day');

  RAISE NOTICE 'Done — mock app data seeded for % (bookings, reviews, services, hours, etc.). Site editor settings untouched.', v_email;
END;
$$;

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT u.email, p.full_name, p.business_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email ILIKE '2025mgueye@gmail.com%';

SELECT
  u.email,
  r.record_type,
  count(*) AS rows
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.email ILIKE '2025mgueye@gmail.com%'
GROUP BY u.email, r.record_type
ORDER BY r.record_type;

SELECT
  u.email,
  r.record_key,
  left(r.data::text, 60) AS preview
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.email ILIKE '2025mgueye@gmail.com%'
  AND r.record_type = 'site_setting'
  AND r.record_key NOT IN ('site_content', 'site_theme', 'site_publish')
ORDER BY r.record_key;

-- Optional cleanup helper:
-- DROP FUNCTION IF EXISTS public._seed_upsert_site_setting(uuid, text, jsonb);
