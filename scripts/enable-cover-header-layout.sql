-- =============================================================================
-- Enable "Full screen" (cover) header on your live tenant site
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run: merges into existing site_theme (does not wipe colors/images).
--
-- BEFORE running:
--   1. Deploy latest templatesite to production (see scripts/sync-cover-header-to-live.ps1)
--   2. In the app: Site editor → Photos → Header style → Full screen → Save
--      (This script is a backup if the app save didn't sync heroLayout to the DB.)
--
-- Replace the user id below if this is not your account.
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
  v_uid     uuid := '592fb4b7-dff2-4fdc-bac0-c837c1228278'::uuid;
  v_email   text;
  v_theme   jsonb;
  v_content jsonb;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid LIMIT 1;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for user_id %', v_uid;
  END IF;

  SELECT coalesce(r.data -> 'value', '{}'::jsonb)
  INTO v_theme
  FROM public.styld_site_records r
  WHERE r.user_id = v_uid
    AND r.record_type = 'site_setting'
    AND r.record_key = 'site_theme';

  -- Merge cover layout + keep every color/image/font you already saved in the app
  v_theme := v_theme || jsonb_build_object(
    'heroLayout',    'cover',
    'templateId',    'profile',
    'heroCoverBlur', coalesce(v_theme -> 'heroCoverBlur', 'false'::jsonb)
  );

  -- textColors: preserve existing object; only add empty shell if missing
  IF v_theme -> 'textColors' IS NULL OR jsonb_typeof(v_theme -> 'textColors') <> 'object' THEN
    v_theme := jsonb_set(v_theme, '{textColors}', '{}'::jsonb, true);
  END IF;

  PERFORM public._seed_upsert_site_setting(v_uid, 'site_theme', v_theme);

  -- Cover splash hides about/menu on home; they live on /book instead.
  -- Do NOT add aboutMe/policies to hiddenSections — /book page reads the same blocks.
  SELECT coalesce(r.data -> 'value', '{}'::jsonb)
  INTO v_content
  FROM public.styld_site_records r
  WHERE r.user_id = v_uid
    AND r.record_type = 'site_setting'
    AND r.record_key = 'site_content';

  PERFORM public._seed_upsert_site_setting(v_uid, 'site_content', v_content);

  RAISE NOTICE 'Cover header enabled for % (user_id=%). heroLayout=%',
    v_email, v_uid, v_theme ->> 'heroLayout';
END;
$$;

-- ── Verify theme matches what the in-app preview expects ──
SELECT
  u.email,
  r.data -> 'value' ->> 'heroLayout'     AS hero_layout,
  r.data -> 'value' ->> 'heroCoverBlur'  AS hero_cover_blur,
  r.data -> 'value' ->> 'hideBookNowButton' AS hide_nav_book_now,
  r.data -> 'value' ->> 'primaryColor'   AS primary_color,
  r.data -> 'value' ->> 'fontFamily'     AS font_family,
  r.data -> 'value' -> 'textColors'      AS text_colors,
  r.data -> 'value' ->> 'heroImagePath'  AS hero_image_path,
  r.updated_at
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.id = '592fb4b7-dff2-4fdc-bac0-c837c1228278'::uuid
  AND r.record_type = 'site_setting'
  AND r.record_key = 'site_theme';
