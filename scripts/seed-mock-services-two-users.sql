-- =============================================================================
-- Seed mock STYLES (services) for:
--   2025mgueye@gmaill.com  (also tries 2025mgueye@gmail.com if typo)
--   bizmoustaphagueyey@gmail.com
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: upserts style rows only (does not wipe bookings/other settings).
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
  v_lookup_email text;
  v_emails       text[] := ARRAY[
    '2025mgueye@gmaill.com',
    'bizmoustaphagueyey@gmail.com'
  ];
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
  FOREACH v_email IN ARRAY v_emails
  LOOP
    SELECT id INTO v_uid
    FROM auth.users
    WHERE email = v_email
    LIMIT 1;

    -- Common typo: gmaill.com vs gmail.com
    IF v_uid IS NULL AND v_email = '2025mgueye@gmaill.com' THEN
      SELECT id, email INTO v_uid, v_lookup_email
      FROM auth.users
      WHERE email = '2025mgueye@gmail.com'
      LIMIT 1;

      IF v_uid IS NOT NULL THEN
        RAISE NOTICE 'Using 2025mgueye@gmail.com (not gmaill.com)';
      END IF;
    END IF;

    IF v_uid IS NULL THEN
      RAISE WARNING 'No auth.users row for %. Sign up in the app first.', v_email;
      CONTINUE;
    END IF;

    PERFORM public._seed_upsert_site_setting(v_uid, 'style_price_overrides', v_prices);
    PERFORM public._seed_upsert_site_setting(v_uid, 'style_catalog_meta', v_meta);

    RAISE NOTICE 'Seeded 13 styles for % (user_id=%)', coalesce(v_lookup_email, v_email), v_uid;
    v_lookup_email := NULL;
  END LOOP;
END;
$$;

-- Verify (should show 13 style ids per user)
SELECT
  u.email,
  r.record_key,
  jsonb_object_keys(r.data -> 'value') AS style_id
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.email IN ('2025mgueye@gmaill.com', '2025mgueye@gmail.com', 'bizmoustaphagueyey@gmail.com')
  AND r.record_type = 'site_setting'
  AND r.record_key = 'style_catalog_meta'
ORDER BY u.email, style_id;

-- Cleanup helper (optional — leave in place for future seeds)
-- DROP FUNCTION IF EXISTS public._seed_upsert_site_setting(uuid, text, jsonb);
