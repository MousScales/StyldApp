# Instructions for Site / Template AI

Use this when editing `templatesite/` (Vercel `*.styldd.com` tenant sites).

## Subscription-gated domains

Styld sites are **not free hosting**. A stylist must have an **active Styld subscription** (RevenueCat entitlement `pro`, products `styld_monthly` / `styld_yearly`) to keep a live subdomain.

### Rules

1. **Publish requires subscription** — The mobile app checks RevenueCat before first publish. Server function `subscription-site-sync` verifies again on publish.
2. **Live = `published_at` is set** — Public tenant pages only load when `styld_site_subdomains.published_at` is not null for that subdomain.
3. **Cancel mid-term → site goes offline** — When subscription lapses, `subscription-site-sync` clears `published_at` (and registry `published_at`). The subdomain slug is kept; content stays in `styld_site_records`.
4. **Resubscribe → publish again** — After paying, the stylist taps Publish in the app (or mandatory paywall flow republishes) to set `published_at` and bring `https://{subdomain}.styldd.com` back.

### What tenant JS must do

- Resolve subdomain from host (`{slug}.styldd.com`) or `?subdomain=` query.
- Load `styld_site_subdomains` and require `published_at` before loading `styld_site_records`.
- If missing or unpublished, show a friendly offline message — **do not** render booking UI or accept payments.

Suggested copy:

> This site is temporarily offline. The owner needs an active Styld subscription to keep their booking site live.

### Do not

- Bypass `published_at` checks.
- Cache tenant HTML as “always live” without revalidating subdomain row.
- Store subscription state in static files — always read Supabase.

### Supabase sources of truth

| Check | Table / RPC |
|-------|-------------|
| Is subdomain live? | `styld_site_subdomains.published_at IS NOT NULL` |
| Tenant data | `styld_site_records` for resolved `user_id` |
| Bookings / payments | RPCs using `styld_resolve_published_user_id(subdomain)` |

### Edge functions (main Supabase project `gogpjxxsrcjpbugocvnd`)

- `subscription-site-sync` — `verify` (pre-publish) or `sync` (unpublish if not entitled)
- `revenuecat-subscription-status` — app subscription check
- `revenuecat-webhook` — RevenueCat `EXPIRATION` → unpublish site immediately (no app open required)

### RevenueCat webhook (instant takedown)

- URL: `https://gogpjxxsrcjpbugocvnd.supabase.co/functions/v1/revenuecat-webhook`
- Event: **`EXPIRATION` only** (not `CANCELLATION` — users keep access until period ends)
- Authorization header: must match Supabase secret `REVENUECAT_WEBHOOK_SECRET`
- `app_user_id` in webhook = Supabase `auth.users.id` (set via `Purchases.logIn(userId)` in app)

### App behavior

- No subscription + not yet published → paywall before publish.
- Was published + subscription lapsed → paywall + site offline until resubscribe and republish.

---

## Previous work (portfolio) section

Stylists upload photos/videos in the app **Site editor → Content → Previous work**. On the live site this is a **horizontal carousel preview** on the home/book pages, plus a **full catalog page** at `/portfolio`.

### Data sources (Supabase `styld_site_records` / settings)

| Setting key | Field | Type | Notes |
|-------------|-------|------|-------|
| `site_content` | `reelsTitle` | string | Section heading (default: "Our work") |
| `site_content` | `reelsBlurb` | string | Optional subtitle |
| `site_content` | `portfolioPlacement` | `'above_menu' \| 'below_menu'` | Default `above_menu` |
| `site_content` | `hiddenSections` | string[] | Include `'portfolio'` to hide carousel + catalog |
| `site_theme` | `portfolioItems` | `{ storagePath, mediaType: 'image' \| 'video' }[]` | Up to 24 items |

Media URL: `{SUPABASE_URL}/storage/v1/object/public/style-covers/{storagePath}` — use `StyldTenant.resolveStyleCoverUrl(path)`.

### Routing (`middleware.js`)

Add tenant route: `'/portfolio': '/tenant/portfolio.html'`

### Home / book pages (`tenant/profile.html`, `tenant/book.html`)

Carousel section (JS reorders vs menu based on `portfolioPlacement`):

```html
<section class="profile-portfolio-section" id="profile-portfolio-section" data-site-section="portfolio" hidden>
  <div class="container">
    <div class="profile-menu-head profile-portfolio-head">
      <div class="profile-portfolio-head__row">
        <div class="profile-portfolio-head__copy">
          <h2 id="profile-portfolio-title">Our work</h2>
          <p class="profile-menu-blurb" id="profile-portfolio-blurb"></p>
        </div>
        <a class="profile-portfolio-view-more" id="profile-portfolio-view-more" href="/portfolio" hidden>View more</a>
      </div>
    </div>
  </div>
  <div class="profile-portfolio-carousel-wrap">
    <div class="profile-portfolio-carousel" id="profile-portfolio-carousel" aria-label="Our work preview">
      <div class="profile-portfolio-carousel__track" id="profile-portfolio-carousel-track"></div>
    </div>
  </div>
</section>
<div class="profile-portfolio-lightbox" id="profile-portfolio-lightbox" hidden>
  <div class="profile-portfolio-lightbox__backdrop" data-portfolio-lightbox-close></div>
  <button class="profile-portfolio-lightbox__close" type="button" data-portfolio-lightbox-close aria-label="Close">&times;</button>
  <div class="profile-portfolio-lightbox__stage" id="profile-portfolio-lightbox-stage"></div>
</div>
```

### Catalog page (`tenant/portfolio.html`)

Full grid at `https://{slug}.styldd.com/portfolio` — body class `page-portfolio`, grid id `portfolio-catalog-grid`, include same lightbox markup.

### JS (`profile-content.js`)

- `populatePortfolio()` — **5** scrollable portrait slides max; if **>5 items**, append a **View more** slide (`/portfolio`) and show header View more link; hide header link when ≤5.
- Each tile is a `<button class="profile-portfolio-item-btn">` — click opens fullscreen lightbox (`#profile-portfolio-lightbox`); Escape/backdrop/× closes.
- Carousel videos: `autoplay muted playsinline loop`. Lightbox videos: `autoplay controls playsinline`.
- `populatePortfolioCatalog()` — all items in grid, same click → lightbox behavior.
- `applyStyldPreviewContent()` — if `body.page-portfolio`, catalog only + return early.

### CSS highlights

- `.profile-portfolio-item` — **3:4 portrait**, `object-fit: cover` on img/video (fills frame, no letterboxing)
- `.profile-portfolio-carousel__slide` — `flex: 0 0 min(68vw, 260px)`, horizontal scroll-snap
- `.profile-portfolio-view-more-slide` — dashed portrait card as 6th carousel slide when >5 items
- `.profile-portfolio-lightbox` — fixed fullscreen overlay; media uses `object-fit: contain`

### Storage

Videos need mime types + 50MB limit on `style-covers` (migration `20260609120000_style_covers_video_mime.sql`).

---

## FAQ section

Stylists add questions and answers in the app **Site editor → Content → FAQ**. On the live site this appears **below the services menu** and **above Visit & contact** (after Previous work when that section is set to below menu).

### Data sources (Supabase `styld_site_records`)

| Setting key | Field | Type | Notes |
|-------------|-------|------|-------|
| `site_content` | `faqTitle` | string | Section heading (default: "FAQ") |
| `site_content` | `faqBlurb` | string | Optional subtitle |
| `site_content` | `faqItems` | `{ question: string, answer: string }[]` | Both fields required per item to display |
| `site_content` | `hiddenSections` | string[] | Include `'faq'` to hide the section |

### Page order (home / book)

Static HTML slot is between menu and visit. `populatePortfolio()` may move Previous work above or below menu; FAQ stays after menu (and after portfolio when portfolio is below menu):

- `portfolioPlacement: 'above_menu'` → portfolio → menu → **FAQ** → visit
- `portfolioPlacement: 'below_menu'` → menu → portfolio → **FAQ** → visit

### HTML (`tenant/profile.html`, `tenant/book.html`)

Insert after `#profile-menu-section`, before `#profile-location-section`:

```html
<section class="profile-faq-section" id="profile-faq-section" data-site-section="faq" hidden>
  <div class="container">
    <div class="profile-menu-head profile-faq-head">
      <h2 id="profile-faq-title">FAQ</h2>
      <p class="profile-menu-blurb" id="profile-faq-blurb"></p>
    </div>
    <div class="profile-faq-list" id="profile-faq-list"></div>
  </div>
</section>
```

### JS (`profile-content.js`)

- `normalizeFaqItems(content)` — filters to items with non-empty `question` and `answer`
- `populateFaq(content)` — sets title/blurb, builds accordion items, toggles `section.hidden` when hidden or no valid items
- Accordion: click `.profile-faq-item__question` toggles `.profile-faq-item__answer` and `aria-expanded`
- Call from `applyStyldPreviewContent()` after `populatePortfolio()`
- Exclude `'faq'` from the generic `[data-site-section]` visibility loop (handled in `populateFaq`)

### CSS highlights

- `.profile-faq-section` — same vertical rhythm as `.profile-menu-section`
- `.profile-faq-list` — flat vertical list (no card gaps)
- `.profile-faq-item` — full-width row separated by a thin bottom border (not a bordered card)
- `.profile-faq-item__question` — bold question row; `.profile-faq-item__toggle` shows pink **+** (rotates 45° to **×** when `.is-open`)
- `.profile-faq-item__answer` — muted body text below the question, no background box; `white-space: pre-wrap`
- Answers support inline emphasis: wrap text in `**double asterisks**` in `faqItems[].answer` → rendered as `<strong>`
- Dark mode: uses `--text-service-name`, `--text-muted`, `--text-accent`, `--card-border` theme variables

### App editor

- **Site editor → Content tab** — toggle visibility, title, blurb, nav row to **Questions & answers** sub-screen (`HeroFaqScreen`)
- Saves to `site_content` via existing `saveSiteSetting('site_content', …)` flow

---

## Site header navigation

All tenant pages (`profile.html`, `book.html`, `portfolio.html`, `certifications.html`) share the same sticky header:

```html
<nav class="profile-nav" id="profile-nav">
  <div class="container profile-nav__inner">
    <a class="profile-brand" href="/">…brand + logo…</a>
    <div class="profile-nav__links" id="profile-nav-links" hidden>
      <a class="profile-nav__link" href="/certifications" data-nav-page="certifications">Certifications</a>
    </div>
    <div class="profile-nav__actions">
      <button class="profile-nav__menu-btn" id="profile-nav-menu-btn" … hidden>…</button>
      <a class="profile-book-btn" href="/booking">Book Now</a>
    </div>
  </div>
  <div class="profile-nav__drawer" id="profile-nav-drawer" hidden>…mobile links…</div>
</nav>
```

### Behavior (`populateSiteNav` in `profile-content.js`)

- Shows **Certifications** tab when `certifications` is not in `hiddenSections`
- Link label comes from `site_content.certificationsTitle`
- Active page: `.is-active` on links when `body.page-certifications`
- **Desktop (≥768px):** pill link inline in header (`.profile-nav__links`)
- **Mobile:** hamburger (`.profile-nav__menu-btn`) opens drawer (`.profile-nav__drawer`)
- `bindSiteNavMenu()` toggles drawer + closes on outside click / link tap

Future tabs: add more `<a class="profile-nav__link" data-nav-page="…">` entries in header + drawer; set active class from `body.page-*` classes.

---

## Certifications page

Stylists upload certification images in **Site editor → Content → Certifications**. Clients reach them via the header tab or `/certifications`.

### Data sources

| Setting key | Field | Type | Notes |
|-------------|-------|------|-------|
| `site_content` | `certificationsTitle` | string | Page heading + nav label (default: "Certifications") |
| `site_content` | `certificationsBlurb` | string | Optional subtitle |
| `site_content` | `hiddenSections` | string[] | Include `'certifications'` to hide nav link + page |
| `site_theme` | `certificationItems` | `{ storagePath, mediaType, caption? }[]` | Images in `style-covers/{userId}/certifications/`; optional `caption` subtitle under each image |

### Routing

- `middleware.js`: `/certifications` → `tenant/certifications.html` (`body.page-certifications`)

### HTML (`tenant/certifications.html`)

- Reuses portfolio lightbox (`#profile-portfolio-lightbox`) for full-screen tap-to-zoom
- Layout: `.profile-certifications-list` vertical stack — each `.profile-certification-card` shows the **full image** (`object-fit: contain`, no crop) and optional `.profile-certification-card__caption` below
- `buildCertificationCardHtml(item, url)` in `profile-content.js` (not the portfolio tile builder)
- IDs: `#profile-certifications-catalog`, `#certifications-catalog-grid`, `#certifications-catalog-title`, `#certifications-catalog-blurb`

### JS

- `normalizeCertificationItems(theme)` — reads `theme.certificationItems` from `window.__STYLD_SITE_THEME__`
- `populateCertificationsCatalog(content, theme)` — builds grid; tap opens lightbox
- `tenant-site.js` must pass `certificationItems` (and `portfolioItems`) on `__STYLD_SITE_THEME__`

### App editor

- **Profile → Account → Certifications** — visibility toggle, page title/blurb, upload images, subtitles per item
- Saves content to `site_content`, images to `site_theme.certificationItems[]`

---

## Style versions (service options)

Stylists configure optional **versions** per service in **Profile → Manage → Styles & Services**. The **Price** field is always **version 1**. Tap **Add version** to add version 2+ (e.g. base $180 “Without hair”, version 2 $250 “With hair provided”).

### Data (`style_catalog_meta` per style ID)

| Field | Type | Notes |
|-------|------|-------|
| `style_price_overrides[styleId]` | number | **Version 1 price** (always) |
| `defaultVariantLabel` | string | Label for version 1 when extra versions exist (fallback: `"Standard"`) |
| `variants` | `{ id, label, price }[]` | **Version 2+ only** — each `price` is the full price for that version |
| `addons` | `{ id, name, price }[]` | Optional extras on top of chosen version |

Menu/catalog price range when `variants.length > 0`: min/max of **[base price, …extra variant prices]** (+ max addon).

### Booking flow (`booking.js`)

1. Client picks style from `#style-select`
2. If stored `variants.length > 0`, show **Choose your version** — radios built from **version 1 (base price + defaultVariantLabel)** plus stored extras; first option selected by default
3. Optional add-ons below
4. `effectiveStyleBase()` uses selected variant price
5. Booking row: `selected_variant_id` (`"default"` for version 1), `selected_variant_label`, `selected_variant_price`

### Tenant loaders

- `buildBookingStyles()` passes `defaultVariantLabel`, `variants` (extras only), and `base`
- `getStyleVariantsForStyle()` prepends `{ id: "default", label, price: base }` when extras exist
- `formatStylePriceRange(base, addons, variants)` includes base in range when extras exist

---

## Manual booking approval (`requireBookingApproval`)

Stylists enable this in the app: **Profile → Payments → Booking → Requests** → **Require manual approval** → **Save**.

### Data source

| Setting key | Field | Type | Notes |
|-------------|-------|------|-------|
| `booking_payment` | `value.requireBookingApproval` | `boolean` | Default `false`. Must be `true` (not just toggled in UI — stylist must **Save**). |

Loaded on the live site via `styld-tenant-booking.js` → `normalizeBookingPayment()` → `window.__SALON_SITE_BOOKING.payment` → `booking.js` `PAYMENT.requireBookingApproval`.

### Booking status rules (`booking.js`)

`resolveBookingStatus(payInPerson, paidOnline)`:

| Payment | `requireBookingApproval` | `booking_status` |
|---------|--------------------------|------------------|
| Pay in person | `true` | `pending_approval` |
| Pay in person | `false` | `confirmed` |
| Online (deposit/full) paid | `true` | `pending_approval` |
| Online paid | `false` | `confirmed` |
| Unpaid / abandoned checkout | either | `pending_payment` |

**Do not** set `booking_status: 'confirmed'` on submit when `PAYMENT.requireBookingApproval === true`.

### Client email

- **Do not** call `booking-client-email` on submit when approval is required (booking.js already skips it).
- Confirmation email sends only when status becomes `confirmed` (stylist taps **Accept** in app → `approveBooking` + DB trigger `styld_booking_client_email_on_confirm`).

### Success page (`booking-success.html`)

After submit, redirect with `?booking_id=…` and **`pending_approval=1`** when approval is on.

| Query | Headline | Body |
|-------|----------|------|
| (default) | Thank you for your booking! | Appointment **confirmed** — email on the way |
| `pending_approval=1` | Request received! | **Not confirmed yet** — email when stylist accepts |

Use amber/warning styling for pending (not green check “confirmed”).

### Receipt (`booking-details.js`)

When `row.booking_status === 'pending_approval'`, status pill:

> Request received — awaiting stylist approval. You will get a confirmation email once your appointment is accepted.

Never show “Booking confirmed” or “See you soon” for `pending_approval`.

### Server / Stripe

- RPC `styld_tenant_mark_booking_paid` (migration `20260621120000_booking_manual_approval.sql`) must set `booking_status` to `pending_approval` when `requireBookingApproval` is true — **not** `confirmed`. Required for online payments (Stripe webhook runs after insert).
- `stripe-booking-confirm` skips client email when approval is required.

### App (stylist)

- Bookings with `pending_approval` show **Pending approval** in dashboard; stylist **Accept** / **Decline** on appointment detail.
- Slot is held (counts as busy in availability RPC) while pending.

### Copy guidelines

- Submit button can stay **Book appointment** / **Confirm payment** — the success page carries the “request vs confirmed” message.
- Optional helper near submit when approval is on: “Your request will be reviewed before the appointment is confirmed.”

### Do not

- Hard-code “Your appointment is confirmed” on success/receipt when `requireBookingApproval` is enabled.
- Send confirmation email on submit for pending requests.
- Auto-confirm in `styld_tenant_mark_booking_paid` when the stylist has manual approval on.

---

## Promo codes (booking checkout)

Stylists create promo codes in the app under **Profile → Payments → Booking → Promos** tab. Codes are stored in Supabase — **never hard-code promo lists in HTML**.

### Data source

| Setting key | Field | Type | Notes |
|-------------|-------|------|-------|
| `booking_promo_codes` | `value` | `BookingPromoCode[]` | Saved via app; validated server-side only |

Each promo object:

```ts
{
  id: string;
  code: string;              // uppercase, 3–24 chars A-Z 0-9 _ -
  label?: string;            // stylist-only note
  discountKind: 'percent' | 'fixed';
  discountValue: number;     // 1–100 if percent, USD if fixed
  enabled: boolean;
  expiresAt?: string | null; // YYYY-MM-DD
  maxUses?: number | null;
}
```

**Do not expose the full promo list to the browser.** Clients type a code; the site validates via edge function.

### Edge functions

| Function | Purpose |
|----------|---------|
| `validate-booking-promo` | `{ subdomain, code, subtotalCents }` → `{ ok, code, discountCents, discountedSubtotalCents, message }` |
| `stripe-booking-pay` | Accepts optional `subtotalCents`, `promoCode`, `houseCallExtraCents` — **recomputes charge server-side** (never trust client discount alone) |

Both are public (`verify_jwt = false`); call with Supabase anon key like other booking functions.

### Booking UI (`booking.html` + `booking.js`)

1. **`#promo-code-section`** — shown when the form is complete and a priced style is selected (before payment section). Works for **pay-in-person and online** flows.
2. Input `#promo-code-input` + button `#promo-code-apply` — on Apply, POST to `validate-booking-promo` with **pre-discount subtotal in cents** (service + add-ons, before promo).
3. On success, store `appliedPromo` and re-run `computeTotals()`:
   - `rawSubtotal` = price before promo
   - `promoDiscountUsd` = discount from server
   - `total` = `rawSubtotal - promoDiscountUsd` (min 0)
   - Deposit / full online charge is calculated from **discounted total**
4. Sidebar: show `#side-promo-row` / `#side-promo-discount` when a promo is applied.
5. On submit:
   - If input has text but promo not applied → block with “Tap Apply to use your promo code”
   - Save on booking row: `promo_code`, `promo_discount_amount`, `subtotal_before_promo`, `estimated_total` (after discount)
6. **Stripe path:** pass `subtotalCents`, `promoCode` to `stripe-booking-pay` so the charged amount matches the validated discount.

### Copy

- Section title: **Promo code**
- Helper: “Have a discount code? Apply it before you complete your booking.”
- Success: `{CODE} applied — you save $X.XX.`
- Invalid: use server `message` (expired, max uses, not found)

### Receipt / booking details

Show `promo_code` and discount on `booking-details.js` receipt when present (`promo_discount_amount` > 0).

### Do not

- Load promo codes from `styld_site_records` into client-side JS for autocomplete (leaks codes + bypasses max-uses checks).
- Apply discount only in the browser without calling `validate-booking-promo` and `stripe-booking-pay` validation.

---

## Products shop (catalog, booking add-ons, pickup / shipping)

Stylists manage products in the app: **Profile → Account → Products**. Same pattern as certifications — separate site page + navbar tab.

### Data sources (`styld_site_records`)

| `record_key` | Purpose |
|--------------|---------|
| `products_catalog` | `SiteProduct[]` — id, title, description, price, storagePath, enabled |
| `products_settings` | Fulfillment: allowPickup, allowShipping, shippingFlatRate, pickupInstructions, shippingNote |
| `site_content` | `productsTitle`, `productsBlurb`, `hiddenSections` includes `'products'` to hide nav |

Product images: `style-covers/{userId}/products/` (upload from app).

### Site pages & routing

| Route | File |
|-------|------|
| `/products` | `tenant/products.html` (`body.page-products`) |
| `/products/order?product={id}` | `tenant/products-order.html` — standalone order |
| `/booking?product={id}` | Pre-select product on booking form |

Add to `middleware.js` TENANT_STATIC_PAGES. Nav link: `data-nav-page="products"` on all tenant header pages (profile, book, portfolio, certifications, products).

`populateSiteNav(content)` — show Products tab when `'products'` ∉ `hiddenSections`; label from `content.productsTitle`.

`populateProductsCatalog(content)` — grid from `window.__STYLD_SITE_PRODUCTS__` (loaded in `tenant-site.js`).

Each product card:
- **Add when booking** → `/booking?product={id}`
- **Order now** → `/products/order?product={id}`

### Booking flow (`booking.js`)

When `CFG.products` is set (from `styld-tenant-booking.js`):

1. Show `#booking-products-section` with checkbox list (like style add-ons).
2. Add selected product prices to estimate **before** promo discount.
3. On submit, save on booking row:
   - `order_products: [{ product_id, title, qty, unit_price }]`
   - `products_subtotal`, `fulfillment_method: 'at_appointment'`, `shipping_amount: 0`
4. Include products in `estimated_total` / deposit calculation.

Read `?product=` query param on load to pre-check a product from the shop page.

### Standalone product orders

Edge function **`submit-product-order`** (public):

```json
{
  "subdomain": "your-slug",
  "productId": "prod-…",
  "fullName": "…",
  "email": "…",
  "phone": "…",
  "fulfillment": "pickup" | "shipping",
  "shippingAddress": { "line1", "city", "state", "zip" }
}
```

Creates `styld_site_records` row (`record_type: 'booking'`) with:

- `is_product_order: true`, `booking_type: 'product_order'`
- `order_products`, `products_subtotal`, `shipping_amount`, `estimated_total`
- `fulfillment_method`: `pickup` | `shipping`
- `payment_status: 'in_person'`, `booking_status: 'confirmed'`

Stylist sees these in the app (appointment detail → **Products** section).

### Fulfillment onboarding (Site AI setup checklist)

When enabling products for a new tenant, configure plausibly:

1. **App → Products → Fulfillment**
   - Turn on **Pickup** if they have a studio/salon address on the site.
   - Turn on **Shipping** only if they ship retail (hair care, merch). Set a **flat shipping rate** and **shipping note** (e.g. “Ships in 3–5 business days”).
   - **Pickup instructions** — reference studio hours or “We will email when ready.”
2. **Site content** — set `productsTitle` / `productsBlurb`; leave section visible.
3. **Navbar** — Products tab appears next to Certifications when not hidden.
4. **Booking** — optional products block; fulfillment defaults to **at appointment** (pick up when they come in).
5. **Standalone orders** — `/products/order` shows pickup vs shipping radios based on `products_settings`.

Suggested copy if both enabled:

> Choose pickup at your appointment or at our studio, or select shipping at checkout.

### App (stylist)

- **Profile → Products** — CRUD, photos, fulfillment toggles, page title/blurb, show/hide on site.
- **Appointment detail** — lists `order_products`, fulfillment method, shipping amount.

### Do not

- Hard-code product lists in HTML.
- Skip server validation on standalone orders (always use `submit-product-order`).

