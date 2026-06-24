-- =============================================================================
-- Patch About Me + Policies for bizmoustaphagueyey@gmail.com (and bizmous* users)
-- Safe to re-run — upserts only, does NOT wipe bookings or styles.
-- Run in Supabase Dashboard → SQL Editor
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
  v_uid uuid;
  v_existing jsonb;
  v_content jsonb;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email ILIKE 'bizmous%'
  ORDER BY email
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found with email starting with "bizmous"';
  END IF;

  SELECT coalesce(r.data -> 'value', '{}'::jsonb)
  INTO v_existing
  FROM public.styld_site_records r
  WHERE r.user_id = v_uid
    AND r.record_type = 'site_setting'
    AND r.record_key = 'site_content';

  v_content := v_existing || jsonb_build_object(
    'heroDescription', 'I''m Biz, founder of Luxe Hair Studio in Atlanta. With 8+ years behind the chair, I specialize in knotless braids, boho styles, passion twists, and healthy loc care. Every appointment is unhurried and detail-driven — whether you want soft everyday glam or a bold statement look, your crown leaves my chair feeling light, neat, and photo-ready.',
    'bookingPolicy', E'25% deposit required to secure your appointment\nArrive with hair washed, blown out, and free of heavy oils or product\nPlease be on time — arrivals 15+ minutes late may need to be rescheduled\nCancellations within 24 hours forfeit your deposit\nNo-show appointments forfeit the full deposit\nOne guest per chair unless approved in advance\nKids under 10 must be accompanied by a parent or guardian',
    'aboutTitle', 'About Me',
    'aboutBody', 'Luxe Hair Studio is my love letter to protective styling done right. I trained under top Atlanta braiders before opening my own chair, and I still treat every head like my first — clean parts, even tension, and styles built to last. When you book with me, you get honest consults, realistic timing, and results you''ll want to show off for weeks.',
    'visitTitle', 'Visit & connect',
    'visitBody', 'Studio appointments in Southwest Atlanta. Message on Instagram with any questions before you book.'
  );

  PERFORM public._seed_upsert_site_setting(v_uid, 'site_content', v_content);

  PERFORM public._seed_upsert_site_setting(v_uid, 'cancellation_policy', '{
    "preset": "24_hours",
    "cancelNoticeHours": 0,
    "fullRefundNoticeHours": 24,
    "refundAppliesTo": "both",
    "policySummary": "You may cancel online anytime before your appointment. Online deposits and full payments are fully refunded when you cancel at least 24 hours before your appointment. Cancellations after that deadline are non-refundable for online deposits and full payments."
  }'::jsonb);

  RAISE NOTICE 'Patched About Me + Policies for user %', v_uid;
END;
$$;

-- Verify
SELECT
  u.email,
  left(r.data #>> '{value,heroDescription}', 80) AS about_preview,
  left(r.data #>> '{value,bookingPolicy}', 80) AS policies_preview
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.email ILIKE 'bizmous%'
  AND r.record_type = 'site_setting'
  AND r.record_key = 'site_content';
