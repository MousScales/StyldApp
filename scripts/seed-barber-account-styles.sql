-- =============================================================================
-- Barber account — haircuts, fades, beard & grooming services
-- User ID: 592fb4b7-dff2-4fdc-bac0-c837c1228278
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: replaces style catalog + merges barber copy into site_content.
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
  v_uid      uuid := '592fb4b7-dff2-4fdc-bac0-c837c1228278'::uuid;
  v_email    text;
  v_existing jsonb;
  v_content  jsonb;
  v_prices   jsonb := '{
    "studio-classic-cut": 35,
    "studio-skin-fade": 40,
    "studio-taper-fade": 38,
    "studio-buzz-cut": 25,
    "studio-scissor-cut": 45,
    "studio-fade-beard": 55,
    "studio-beard-trim": 20,
    "studio-line-up": 15,
    "studio-hot-towel-shave": 30,
    "studio-kids-cut": 25,
    "studio-hair-design": 25
  }'::jsonb;
  v_meta     jsonb := '{
    "studio-classic-cut": {
      "title": "Classic Haircut",
      "description": "Clean all-over cut with clippers and scissors. Includes a quick style finish.",
      "category": "HAIRCUTS",
      "durationMinutes": 30
    },
    "studio-skin-fade": {
      "title": "Skin Fade",
      "description": "Sharp skin fade blended to your preferred height — low, mid, or high.",
      "category": "FADES",
      "durationMinutes": 45
    },
    "studio-taper-fade": {
      "title": "Taper Fade",
      "description": "Gradual taper with more length on top. Great for everyday wear.",
      "category": "FADES",
      "durationMinutes": 40
    },
    "studio-buzz-cut": {
      "title": "Buzz Cut",
      "description": "One-length buzz with optional guard size. Fast, fresh, and low maintenance.",
      "category": "HAIRCUTS",
      "durationMinutes": 20
    },
    "studio-scissor-cut": {
      "title": "Scissor Cut",
      "description": "Full scissor work for texture, layers, and a natural finish on top.",
      "category": "HAIRCUTS",
      "durationMinutes": 45
    },
    "studio-fade-beard": {
      "title": "Fade + Beard",
      "description": "Your choice of fade plus beard shape, trim, and line-up.",
      "category": "COMBO",
      "durationMinutes": 60
    },
    "studio-beard-trim": {
      "title": "Beard Trim",
      "description": "Beard shape, trim, and oil finish. Cheeks and neckline cleaned up.",
      "category": "BEARD",
      "durationMinutes": 20
    },
    "studio-line-up": {
      "title": "Line Up",
      "description": "Crisp edge-up for hairline, temples, and beard outline.",
      "category": "GROOMING",
      "durationMinutes": 15
    },
    "studio-hot-towel-shave": {
      "title": "Hot Towel Shave",
      "description": "Traditional hot towel prep with a clean razor finish.",
      "category": "GROOMING",
      "durationMinutes": 30
    },
    "studio-kids-cut": {
      "title": "Kids Cut (12 & under)",
      "description": "Patient, kid-friendly cut in the chair. One guard or scissor style.",
      "category": "KIDS",
      "durationMinutes": 30
    },
    "studio-hair-design": {
      "title": "Hair Design",
      "description": "Custom parts, patterns, or line work added to your cut.",
      "category": "DESIGN",
      "durationMinutes": 25
    }
  }'::jsonb;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid LIMIT 1;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for user_id %', v_uid;
  END IF;

  SELECT coalesce(r.data -> 'value', '{}'::jsonb)
  INTO v_existing
  FROM public.styld_site_records r
  WHERE r.user_id = v_uid
    AND r.record_type = 'site_setting'
    AND r.record_key = 'site_content';

  v_content := v_existing || jsonb_build_object(
    'menuTitle', 'Services',
    'menuBlurb', 'Browse cuts, fades, and grooming — tap any service to book online.',
    'heroDescription', coalesce(
      nullif(trim(v_existing ->> 'heroDescription'), ''),
      'Sharp fades, clean line-ups, and classic cuts in a relaxed chair. Book online for quick appointments with honest timing and consistent results every visit.'
    ),
    'aboutBody', coalesce(
      nullif(trim(v_existing ->> 'aboutBody'), ''),
      'I built this chair for clients who want a precise fade, a fresh beard shape, or a straightforward cut without the wait. Every appointment is mapped to your hair type and lifestyle — walk in knowing what you''re getting and walk out looking sharp.'
    ),
    'bookingPolicy', coalesce(
      nullif(trim(v_existing ->> 'bookingPolicy'), ''),
      E'25% deposit required to hold your appointment\nArrive on time — 15+ minutes late may need to be rescheduled\nCancel at least 24 hours ahead for a deposit refund\nNo-shows forfeit the deposit\nOne client per chair unless approved in advance'
    )
  );

  PERFORM public._seed_upsert_site_setting(v_uid, 'site_content', v_content);
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_price_overrides', v_prices);
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_catalog_meta', v_meta);

  -- Ensure onboarding reflects barber (merge into existing JSON)
  UPDATE public.styld_site_records
  SET
    data = jsonb_set(
      coalesce(data, '{}'::jsonb),
      '{value,survey,businessType}',
      '"barber"'::jsonb,
      true
    ),
    updated_at = now()
  WHERE user_id = v_uid
    AND record_type = 'site_setting'
    AND record_key = 'onboarding_responses';

  RAISE NOTICE 'Seeded 11 barber services for % (user_id=%)', v_email, v_uid;
END;
$$;

-- Verify
SELECT
  u.id,
  u.email,
  r.record_key,
  CASE r.record_key
    WHEN 'style_catalog_meta' THEN (
      SELECT string_agg(key, ', ' ORDER BY key)
      FROM jsonb_object_keys(r.data -> 'value') AS key
    )
    WHEN 'style_price_overrides' THEN (
      SELECT count(*)::text || ' prices'
      FROM jsonb_object_keys(r.data -> 'value')
    )
    WHEN 'site_content' THEN left(r.data #>> '{value,menuBlurb}', 50)
    ELSE left(r.data::text, 40)
  END AS preview
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.id = '592fb4b7-dff2-4fdc-bac0-c837c1228278'::uuid
  AND r.record_type = 'site_setting'
  AND r.record_key IN ('site_content', 'style_catalog_meta', 'style_price_overrides', 'onboarding_responses')
ORDER BY r.record_key;
