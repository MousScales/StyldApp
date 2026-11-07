-- =============================================================================
-- Travel stylist bookings (is_travel_booking = true)
--
-- Inserts sample bookings with client addresses, travel fees, and distances.
-- Also ensures travel_stylist site setting is enabled for the tenant.
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: removes prior travel seed bookings first (source = seed_travel).
--
-- Targets: 2025mgueye@gmail.com
-- =============================================================================

DO $$
DECLARE
  v_uid   uuid;
  v_email text := '2025mgueye@gmail.com';
  v_home  text := '1420 Peachtree St NE, Atlanta, GA 30309';
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_uid IS NULL THEN
    SELECT id, email INTO v_uid, v_email
    FROM auth.users
    WHERE email ILIKE '2025mgueye@gmail.com%'
    ORDER BY CASE WHEN lower(email) = '2025mgueye@gmail.com' THEN 0 ELSE 1 END, email
    LIMIT 1;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for 2025mgueye@gmail.com — sign up in the app first.';
  END IF;

  RAISE NOTICE 'Seeding travel bookings for % (user_id=%)', v_email, v_uid;

  -- Enable travel stylist on this tenant (upsert site setting)
  INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at)
  VALUES (
    v_uid,
    'site_setting',
    'travel_stylist',
    jsonb_build_object(
      'value', jsonb_build_object(
        'enabled', true,
        'feeMode', 'flat',
        'flatFeeUsd', 25,
        'perMileRateUsd', 2,
        'homeBaseAddress', v_home,
        'homeBaseLat', 33.7925,
        'homeBaseLng', -84.3847,
        'extraTravelMinutes', 30
      )
    ),
    now(),
    now()
  )
  ON CONFLICT (user_id, record_key) WHERE record_type = 'site_setting'
  DO UPDATE SET
    data = EXCLUDED.data,
    updated_at = now();

  -- Remove prior travel seed rows
  DELETE FROM public.styld_site_records
  WHERE user_id = v_uid
    AND record_type = 'booking'
    AND coalesce(data->>'source', '') = 'seed_travel';

  ALTER TABLE public.styld_site_records DISABLE TRIGGER styld_site_records_booking_overlap_guard;

  BEGIN
    INSERT INTO public.styld_site_records (user_id, record_type, record_key, data, created_at, updated_at) VALUES

    -- Pending approval — paid deposit, waiting for stylist to accept
    (v_uid, 'booking', NULL, '{
      "id": "tr-bk-001",
      "full_name": "Amara Johnson",
      "email": "amara.johnson@gmail.com",
      "phone": "(404) 555-0147",
      "style_id": "studio-knotless-md",
      "style_name": "Knotless Braids",
      "hair_length": "Medium",
      "hair_option": "4C Natural",
      "appointment_date": "2026-07-14",
      "appointment_slot": "10:30 AM",
      "appointment_starts_at": "2026-07-14T10:30:00-04:00",
      "duration_minutes": 270,
      "estimated_total": 225,
      "deposit_amount": 50,
      "payment_status": "deposit_paid",
      "booking_status": "pending_approval",
      "service_address": "892 Ponce De Leon Ave NE, Apt 4B\nAtlanta, GA 30306",
      "is_travel_booking": true,
      "travel_fee_usd": 25,
      "travel_distance_miles": 3.2,
      "travel_extra_minutes": 30,
      "notes": "Please ring the side gate — travel appointment.",
      "source": "seed_travel"
    }'::jsonb, now() - interval '2 days', now() - interval '2 days'),

    -- Confirmed — stylist already accepted
    (v_uid, 'booking', NULL, '{
      "id": "tr-bk-002",
      "full_name": "Destiny Williams",
      "email": "d.williams@gmail.com",
      "phone": "(404) 555-0231",
      "style_id": "studio-passion-sm",
      "style_name": "Passion Twists",
      "hair_length": "Long",
      "hair_option": "4B Natural",
      "appointment_date": "2026-07-15",
      "appointment_slot": "1:15 PM",
      "appointment_starts_at": "2026-07-15T13:15:00-04:00",
      "duration_minutes": 210,
      "estimated_total": 205,
      "deposit_amount": 45,
      "payment_status": "deposit_paid",
      "booking_status": "confirmed",
      "service_address": "1550 Southland Pkwy, Unit 12\nJonesboro, GA 30236",
      "is_travel_booking": true,
      "travel_fee_usd": 25,
      "travel_distance_miles": 18.4,
      "travel_extra_minutes": 30,
      "source": "seed_travel"
    }'::jsonb, now() - interval '4 days', now() - interval '1 day'),

    -- Per-mile travel fee example
    (v_uid, 'booking', NULL, '{
      "id": "tr-bk-003",
      "full_name": "Kezia Thompson",
      "email": "kezia.t@icloud.com",
      "phone": "(678) 555-0182",
      "style_id": "studio-boho-sm",
      "style_name": "Boho Braids",
      "hair_length": "Medium",
      "hair_option": "3C Curly",
      "appointment_date": "2026-07-16",
      "appointment_slot": "9:45 AM",
      "appointment_starts_at": "2026-07-16T09:45:00-04:00",
      "duration_minutes": 270,
      "estimated_total": 264,
      "deposit_amount": 55,
      "payment_status": "deposit_paid",
      "booking_status": "pending_approval",
      "service_address": "4100 Chamblee Tucker Rd\nAtlanta, GA 30341",
      "is_travel_booking": true,
      "travel_fee_usd": 44,
      "travel_distance_miles": 22.1,
      "travel_extra_minutes": 30,
      "source": "seed_travel"
    }'::jsonb, now() - interval '1 day', now() - interval '1 day'),

    -- In-person / unpaid travel request
    (v_uid, 'booking', NULL, '{
      "id": "tr-bk-004",
      "full_name": "Naomi Clarke",
      "email": "naomiclarke@gmail.com",
      "phone": "(404) 555-0394",
      "style_id": "studio-fulani-one",
      "style_name": "Fulani Braids",
      "hair_length": "Long",
      "hair_option": "4A Natural",
      "appointment_date": "2026-07-17",
      "appointment_slot": "11:00 AM",
      "appointment_starts_at": "2026-07-17T11:00:00-04:00",
      "duration_minutes": 210,
      "estimated_total": 225,
      "deposit_amount": 0,
      "payment_status": "in_person",
      "booking_status": "pending_approval",
      "service_address": "2200 Peachtree Rd NW, Apt 1802\nAtlanta, GA 30309",
      "is_travel_booking": true,
      "travel_fee_usd": 25,
      "travel_distance_miles": 1.8,
      "travel_extra_minutes": 30,
      "notes": "Client requested travel to condo — parking in visitor deck.",
      "source": "seed_travel"
    }'::jsonb, now() - interval '6 hours', now() - interval '6 hours'),

    -- Completed travel appointment (past)
    (v_uid, 'booking', NULL, '{
      "id": "tr-bk-005",
      "full_name": "Jasmine Reed",
      "email": "jasmine.reed@gmail.com",
      "phone": "(770) 555-0156",
      "style_id": "studio-knotless-sm",
      "style_name": "Knotless Braids",
      "hair_length": "Medium",
      "hair_option": "4C Natural",
      "appointment_date": "2026-07-08",
      "appointment_slot": "2:00 PM",
      "appointment_starts_at": "2026-07-08T14:00:00-04:00",
      "duration_minutes": 210,
      "estimated_total": 185,
      "deposit_amount": 40,
      "payment_status": "paid",
      "booking_status": "completed",
      "service_address": "3180 Roswell Rd NE\nAtlanta, GA 30305",
      "is_travel_booking": true,
      "travel_fee_usd": 25,
      "travel_distance_miles": 5.6,
      "travel_extra_minutes": 30,
      "source": "seed_travel"
    }'::jsonb, now() - interval '10 days', now() - interval '8 days');

    ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.styld_site_records ENABLE TRIGGER styld_site_records_booking_overlap_guard;
    RAISE;
  END;

  RAISE NOTICE 'Done — inserted travel seed bookings for user_id=%', v_uid;
END $$;

-- Verify
-- select
--   data->>'id' as booking_id,
--   data->>'full_name' as client,
--   data->>'booking_status' as status,
--   data->>'is_travel_booking' as travel,
--   data->>'travel_fee_usd' as travel_fee,
--   data->>'service_address' as address
-- from public.styld_site_records
-- where record_type = 'booking'
--   and coalesce(data->>'source', '') = 'seed_travel'
-- order by data->>'appointment_date';
