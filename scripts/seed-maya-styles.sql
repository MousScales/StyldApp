-- =============================================================================
-- Maya African Hair Braiding — styles, prices, variants & add-ons
-- User: 091b8094-a603-4e7a-aee3-8cb380c83913 (mageniang06@gmail.com)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

DO $$
DECLARE
  v_uid UUID := '091b8094-a603-4e7a-aee3-8cb380c83913';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'User % not found in auth.users', v_uid;
  END IF;

  RAISE NOTICE 'Seeding Maya styles for user %', v_uid;

  -- ── Profile ───────────────────────────────────────────────────────────────
  UPDATE profiles SET
    business_name = 'Maya African Hair Braiding'
  WHERE id = v_uid;

  -- ── Site content (business info) ───────────────────────────────────────────
  INSERT INTO styld_site_records (user_id, record_type, record_key, data)
  VALUES (v_uid, 'site_setting', 'site_content', jsonb_build_object('value', jsonb_build_object(
    'brandName',           'Maya African Hair Braiding',
    'taglineLeft',         'Book with',
    'taglineRightLine1',   'Maya',
    'taglineRightLine2',   'African Hair Braiding',
    'heroDescription',     'Professional African hair braiding in New London, CT — box braids, Fulani, passion twists, loc care, and more. Book online in minutes.',
    'bookingPolicy',       E'Deposit may be required to secure your appointment\nArrive on time — late arrivals may need to be rescheduled\nPlease come with hair ready unless you add a professional pre-wash\nLong hair may add ~20% to appointment time on box braid styles\nCancellations within 24 hours may forfeit your deposit',
    'metaDescription',     'Maya African Hair Braiding — professional braids, twists, locs & weaves in New London, CT.',
    'menuTitle',           'Our Styles',
    'menuBlurb',           'Browse our services and book your next appointment online.',
    'aboutTitle',          'About',
    'aboutBody',           'Maya African Hair Braiding offers professional protective styling in New London, Connecticut — from classic box braids and Fulani sets to passion twists, loc maintenance, and weave installs.',
    'visitTitle',          'Visit us',
    'visitBody',           '116 Ocean Avenue, New London, CT. Follow @mayadoeshairrr on Instagram for fresh work and updates.',
    'phoneDisplay',        '',
    'phoneTel',            '',
    'email',               'mageniang06@gmail.com',
    'instagramHandle',     'mayadoeshairrr',
    'addressLine1',        '116 Ocean Avenue',
    'addressLine2',        '',
    'city',                'New London',
    'state',               'CT',
    'zip',                 '06320',
    'timezone',            'America/New_York',
    'hiddenSections',      '[]'::jsonb,
    'hiddenLocationParts', '[]'::jsonb
  )))
  ON CONFLICT (user_id, record_key) WHERE record_type = 'site_setting'
  DO UPDATE SET
    data = jsonb_build_object(
      'value',
      COALESCE(styld_site_records.data->'value', '{}'::jsonb) || (EXCLUDED.data->'value')
    ),
    updated_at = now();
  INSERT INTO styld_site_records (user_id, record_type, record_key, data)
  VALUES (v_uid, 'site_setting', 'booking_hours', '{"value":{
    "closedWeekdays":[0],
    "slotDayStartHour":9,
    "slotDayStartMinute":0,
    "slotDayEndHour":19,
    "slotDayEndMinute":0,
    "slotStepMinutes":30,
    "sameDayLeadMinutes":4320,
    "saturdayLastStartHour":17,
    "saturdayLastStartMinute":0,
    "concurrentAppointmentCapacity":1
  }}'::jsonb)
  ON CONFLICT (user_id, record_key) WHERE record_type = 'site_setting'
  DO UPDATE SET data = EXCLUDED.data, updated_at = now();

  -- ── Style catalog meta (titles, categories, durations, variants, add-ons) ───
  INSERT INTO styld_site_records (user_id, record_type, record_key, data)
  VALUES (v_uid, 'site_setting', 'style_catalog_meta', jsonb_build_object('value', jsonb_build_object(

    -- Box Braids & Variations
    'studio-box-braids', jsonb_build_object(
      'title','Box Braids',
      'description','Classic square-part braids with extensions — versatile, protective, and neat. Available regular or knotless (less scalp tension). Long hair adds ~20% to appointment time.',
      'category','BOX BRAIDS & VARIATIONS',
      'durationMinutes',240,
      'defaultVariantLabel','Regular · Medium',
      'variants', jsonb_build_array(
        jsonb_build_object('id','knotless','label','Knotless · Medium','price',253),
        jsonb_build_object('id','long-regular','label','Regular · Long','price',250),
        jsonb_build_object('id','long-knotless','label','Knotless · Long','price',275)
      ),
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-boho-box-braids', jsonb_build_object(
      'title','Boho Box Braids',
      'description','Box braids with curly/wavy pieces left out for a relaxed, bohemian look.',
      'category','BOX BRAIDS & VARIATIONS',
      'durationMinutes',240,
      'defaultVariantLabel','Medium (Mid-Back)',
      'variants', jsonb_build_array(
        jsonb_build_object('id','long','label','Long (Lower Back)','price',280)
      ),
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-jumbo-box-braids', jsonb_build_object(
      'title','Jumbo Box Braids',
      'description','Larger, thicker box braids for a bold look with faster install and lower upkeep.',
      'category','BOX BRAIDS & VARIATIONS',
      'durationMinutes',180,
      'defaultVariantLabel','Medium (Mid-Back)',
      'variants', jsonb_build_array(
        jsonb_build_object('id','long','label','Long (Lower Back)','price',230)
      ),
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),

    -- Specialty Braids
    'studio-fulani-braids', jsonb_build_object(
      'title','Fulani Braids',
      'description','Cornrows blended into box braids, often styled with beads and accessories in a traditional Fulani look.',
      'category','SPECIALTY BRAIDS',
      'durationMinutes',300,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-lemonade-braids', jsonb_build_object(
      'title','Lemonade Braids',
      'description','Side-swept cornrows in a flowing pattern — elegant, modern, and eye-catching.',
      'category','SPECIALTY BRAIDS',
      'durationMinutes',240,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-stitch-braids', jsonb_build_object(
      'title','Stitch Braids',
      'description','Feed-in braids with clean horizontal “stitched” lines for a sharp geometric pattern.',
      'category','SPECIALTY BRAIDS',
      'durationMinutes',180,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-tribal-braids', jsonb_build_object(
      'title','Tribal Braids',
      'description','Intricate traditional African braiding with artistic patterns and optional beads/accessories.',
      'category','SPECIALTY BRAIDS',
      'durationMinutes',360,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-goddess-braids', jsonb_build_object(
      'title','Goddess Braids',
      'description','Thick, chunky cornrows styled in various patterns for a regal, polished look.',
      'category','SPECIALTY BRAIDS',
      'durationMinutes',270,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),

    -- Cornrows & Patterns
    'studio-cornrows', jsonb_build_object(
      'title','Cornrows',
      'description','Braids close to the scalp in continuous rows. Straight-back or styled/designed patterns like zig-zag or hearts.',
      'category','CORNROWS & PATTERNS',
      'durationMinutes',90,
      'defaultVariantLabel','Straight Back',
      'variants', jsonb_build_array(
        jsonb_build_object('id','styled','label','Styled / Designed','price',80)
      ),
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),

    -- Twists
    'studio-senegalese-twists', jsonb_build_object(
      'title','Senegalese Twists',
      'description','Rope-like twisted strands using a special technique — elegant, versatile, and long-lasting.',
      'category','TWISTS',
      'durationMinutes',270,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-passion-twists', jsonb_build_object(
      'title','Passion Twists',
      'description','Soft, textured twists with a bohemian, romantic feel — lightweight and modern.',
      'category','TWISTS',
      'durationMinutes',210,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-marley-twists', jsonb_build_object(
      'title','Marley Twists',
      'description','Twists using textured hair for a natural look that blends well with your own hair.',
      'category','TWISTS',
      'durationMinutes',240,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20),
        jsonb_build_object('id','human-hair','name','Human Hair','price',50)
      )
    ),
    'studio-two-strand-twists', jsonb_build_object(
      'title','Two Strand Twists',
      'description','A simple protective style twisting two sections of hair — great on natural hair.',
      'category','TWISTS',
      'durationMinutes',210,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),

    -- Locs & Maintenance
    'studio-starter-locs', jsonb_build_object(
      'title','Starter Locs',
      'description','Professional installation to begin your loc journey with a neat, organized foundation.',
      'category','LOCS & MAINTENANCE',
      'durationMinutes',180,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),
    'studio-loc-retwist', jsonb_build_object(
      'title','Loc Retwist',
      'description','Maintenance retwist to keep established locs neat and healthy. Final price varies by loc count.',
      'category','LOCS & MAINTENANCE',
      'durationMinutes',120,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),
    'studio-loc-retwist-2-strand', jsonb_build_object(
      'title','Loc Retwist 2 Strand',
      'description','Two-strand retwist technique for defined locs with a spiral pattern. Price varies by loc count.',
      'category','LOCS & MAINTENANCE',
      'durationMinutes',150,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),
    'studio-loc-retwist-barrel', jsonb_build_object(
      'title','Loc Retwist Barrel',
      'description','Barrel-roll retwist for fuller, rounder locs with more volume.',
      'category','LOCS & MAINTENANCE',
      'durationMinutes',120,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    ),

    -- Weaves
    'studio-weave-install', jsonb_build_object(
      'title','Weave Install',
      'description','Professional sew-in/install of weave extensions for instant length and volume. Final price varies by service needs.',
      'category','WEAVES',
      'durationMinutes',180,
      'addons', jsonb_build_array(
        jsonb_build_object('id','pre-wash','name','Professional Pre-Wash (+30 min)','price',20)
      )
    )

  )))
  ON CONFLICT (user_id, record_key) WHERE record_type = 'site_setting'
  DO UPDATE SET data = EXCLUDED.data, updated_at = now();

  -- ── Base prices (medium / default version) ────────────────────────────────
  INSERT INTO styld_site_records (user_id, record_type, record_key, data)
  VALUES (v_uid, 'site_setting', 'style_price_overrides', jsonb_build_object('value', jsonb_build_object(
    'studio-box-braids',              230,
    'studio-boho-box-braids',         250,
    'studio-jumbo-box-braids',        200,
    'studio-fulani-braids',           230,
    'studio-lemonade-braids',         230,
    'studio-stitch-braids',           150,
    'studio-tribal-braids',           230,
    'studio-goddess-braids',          230,
    'studio-cornrows',                 60,
    'studio-senegalese-twists',       250,
    'studio-passion-twists',          250,
    'studio-marley-twists',           230,
    'studio-two-strand-twists',       120,
    'studio-starter-locs',            150,
    'studio-loc-retwist',             120,
    'studio-loc-retwist-2-strand',    150,
    'studio-loc-retwist-barrel',      130,
    'studio-weave-install',           130
  )))
  ON CONFLICT (user_id, record_key) WHERE record_type = 'site_setting'
  DO UPDATE SET data = EXCLUDED.data, updated_at = now();

  RAISE NOTICE 'Done — 18 styles seeded for Maya African Hair Braiding.';
  RAISE NOTICE 'Run: node scripts/seed-maya-style-covers.mjs — to upload images/ cover photos.';
END;
$$;
