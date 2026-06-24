-- =============================================================================
-- Hair Heaven — styles + About Me + Policies only
-- User: bizmoustaphagueye@gmail.com
--
-- Does NOT change brandName, profile, bookings, theme, hours, or publish settings.
-- Merges about/policy fields into existing site_content; upserts style rows only.
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
  v_uid      uuid;
  v_existing jsonb;
  v_content  jsonb;
  v_prices   jsonb := '{
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
  v_meta     jsonb := '{
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
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'bizmoustaphagueye@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for bizmoustaphagueye@gmail.com';
  END IF;

  -- Merge into existing site_content (keeps brandName and everything else)
  SELECT coalesce(r.data -> 'value', '{}'::jsonb)
  INTO v_existing
  FROM public.styld_site_records r
  WHERE r.user_id = v_uid
    AND r.record_type = 'site_setting'
    AND r.record_key = 'site_content';

  v_content := v_existing || jsonb_build_object(
    'heroDescription', 'Welcome to Hair Heaven — where every braid, twist, and loc appointment feels like a little slice of paradise. I specialize in knotless braids, boho styles, passion twists, and loc maintenance with a focus on healthy hair, clean parts, and styles that last. Your comfort matters here: unhurried appointments, honest timing, and results you''ll love long after you leave the chair.',
    'bookingPolicy', E'25% deposit required to book your appointment at Hair Heaven\nArrive with hair washed, blown out, and free of heavy oils or product\nPlease be on time — arrivals 15+ minutes late may need to be rescheduled\nCancel at least 24 hours ahead for a deposit refund\nNo-shows forfeit the full deposit\nOne guest per styling chair unless approved in advance\nChildren under 10 must be accompanied by a parent or guardian',
    'aboutTitle', 'About Me',
    'aboutBody', 'Hair Heaven started from a simple promise: make protective styling feel luxurious, not stressful. I built this space for clients who want neat work, realistic appointment times, and a stylist who actually listens. From soft everyday knotless sets to head-turning boho braids, every style is mapped out to your hair texture, lifestyle, and vibe — because your crown deserves heaven-level care.'
  );

  PERFORM public._seed_upsert_site_setting(v_uid, 'site_content', v_content);
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_price_overrides', v_prices);
  PERFORM public._seed_upsert_site_setting(v_uid, 'style_catalog_meta', v_meta);
  PERFORM public._seed_upsert_site_setting(v_uid, 'cancellation_policy', '{
    "preset": "24_hours",
    "cancelNoticeHours": 0,
    "fullRefundNoticeHours": 24,
    "refundAppliesTo": "both",
    "policySummary": "You may cancel online anytime before your appointment. Online deposits and full payments are fully refunded when you cancel at least 24 hours before your appointment. Cancellations after that deadline are non-refundable for online deposits and full payments."
  }'::jsonb);

  RAISE NOTICE 'Seeded Hair Heaven styles + about + policies for user %', v_uid;
END;
$$;

-- Verify
SELECT u.email, r.record_key,
  CASE r.record_key
    WHEN 'site_content' THEN left(r.data #>> '{value,heroDescription}', 60)
    WHEN 'style_catalog_meta' THEN (SELECT count(*)::text FROM jsonb_object_keys(r.data -> 'value'))
    ELSE left(r.data::text, 60)
  END AS preview
FROM auth.users u
JOIN public.styld_site_records r ON r.user_id = u.id
WHERE u.email = 'bizmoustaphagueye@gmail.com'
  AND r.record_type = 'site_setting'
  AND r.record_key IN ('site_content', 'style_catalog_meta', 'style_price_overrides', 'cancellation_policy')
ORDER BY r.record_key;
