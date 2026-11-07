/**
 * Booking: catalog-priced styles, custom month calendar + fixed slots (salon TZ),
 * overlap checks via Supabase RPC `get_unavailable_times_for_day`.
 */
(function () {
  const STORAGE_BUCKET = "booking-photos";
  const GCAL = window.__SALON_SITE_GOOGLE_CALENDAR || {};
  const LOCAL_BOOKINGS_KEY = "salon_site_bookings_local";
  const MIN_ONLINE_PAYMENT_CENTS = 50;
  const BOOKING_NOTICE_KEY = "salon_site_booking_notice";
  const DETAILS_BOOKING_KEY = "salon_site_details_booking_id";

  /** @type {{ code: string, discountUsd: number, discountCents: number, subtotalCents: number } | null} */
  let appliedPromo = null;
  let promoValidating = false;

  const DT = window.luxon && window.luxon.DateTime ? window.luxon.DateTime : null;
  if (!DT) {
    console.error("Luxon is required for salon timezone scheduling (see booking.html).");
  }

  const CFG = Object.assign(
    {
      salonTimeZone: "America/New_York",
      salonPhoneDisplay: "(555) 010-0199",
      salonPhoneTel: "+15550100199",
      slotDayStartHour: 8,
      slotDayStartMinute: 0,
      slotDayEndHour: 19,
      slotDayEndMinute: 30,
      slotStepMinutes: 30,
      saturdayLastStartHour: 14,
      saturdayLastStartMinute: 0,
      sameDayLeadMinutes: 4320,
      concurrentAppointmentCapacity: 1,
      closedWeekdays: [],
      blackoutRanges: [],
      googleMapsApiKey: null,
    },
    window.__SALON_SITE_BOOKING || {},
  );

  let googleMapsLoadPromise = null;

  /** Old lookbook ?style= slugs → catalog row ids */
  const STYLE_ALIASES = {
    "boho-bob-knotless": "studio-boho-md",
    "boho-knotless-box": "studio-boho-lg",
    "curly-knotless-boho-full": "studio-boho-lg",
    "goddess-knotless": "studio-knotless-md",
    "passion-havana": "studio-passion-md",
    "soft-locs-faux": "studio-locs-half-up",
    "straight-braid-ends": "studio-knotless-lg",
    fulanipassiontwists: "studio-fulani-passion-twists",
    fulaniquickweave: "studio-wig-fulani-quickweave",
  };

  const TENANT_BOOKING = window.__STYLD_TENANT_BOOKING__ || null;
  /** Styld tenant sites use catalog price + duration only — no legacy hair-length add-ons. */
  const USE_HAIR_LENGTH_ADDONS = !TENANT_BOOKING;

  const PAYMENT = Object.assign(
    {
      mode: "in_person",
      depositKind: "percent",
      depositValue: 10,
      depositIncludedInPrice: true,
      platformFeePayer: "client",
      requireCurrentHairPhoto: true,
      requireReferencePhoto: false,
      requireBookingApproval: false,
    },
    CFG.payment || {},
  );

  const TRAVEL = (function normalizeTravelStylist(raw) {
    const defaults = {
      enabled: false,
      bookingMode: "optional",
      feeMode: "flat",
      flatFeeUsd: 25,
      perMileRateUsd: 2,
      homeBaseAddress: "",
      homeBaseLat: null,
      homeBaseLng: null,
      extraTravelMinutes: 30,
    };
    if (!raw || typeof raw !== "object") return defaults;
    const bookingMode = raw.bookingMode === "primary" ? "primary" : "optional";
    const feeMode = raw.feeMode === "per_mile" ? "per_mile" : "flat";
    const flatFeeUsd =
      typeof raw.flatFeeUsd === "number" && !Number.isNaN(raw.flatFeeUsd) ? raw.flatFeeUsd : defaults.flatFeeUsd;
    const perMileRateUsd =
      typeof raw.perMileRateUsd === "number" && !Number.isNaN(raw.perMileRateUsd)
        ? raw.perMileRateUsd
        : defaults.perMileRateUsd;
    const homeBaseAddress = typeof raw.homeBaseAddress === "string" ? raw.homeBaseAddress.trim() : "";
    const extraTravelMinutes =
      typeof raw.extraTravelMinutes === "number" && !Number.isNaN(raw.extraTravelMinutes)
        ? Math.min(480, Math.max(0, Math.round(raw.extraTravelMinutes)))
        : defaults.extraTravelMinutes;
    return {
      enabled: raw.enabled === true,
      bookingMode,
      feeMode,
      flatFeeUsd: Math.max(0, Math.round(flatFeeUsd * 100) / 100),
      perMileRateUsd: Math.max(0, Math.round(perMileRateUsd * 100) / 100),
      homeBaseAddress,
      homeBaseLat: typeof raw.homeBaseLat === "number" && !Number.isNaN(raw.homeBaseLat) ? raw.homeBaseLat : null,
      homeBaseLng: typeof raw.homeBaseLng === "number" && !Number.isNaN(raw.homeBaseLng) ? raw.homeBaseLng : null,
      extraTravelMinutes,
    };
  })(CFG.travelStylist || null);

  let travelDistanceMiles = null;
  let travelFeeUsd = 0;
  let travelFeeStatus = "idle";
  let travelFeeTimer = null;

  const CATALOG_PRODUCTS = (function normalizeCatalogProducts(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (entry) {
        if (!entry || typeof entry !== "object") return null;
        var id = entry.id ? String(entry.id) : "";
        var title = entry.title ? String(entry.title).trim() : "";
        if (!id || !title || entry.enabled === false) return null;
        var price = Number(entry.price);
        if (!Number.isFinite(price) || price < 0) price = 0;
        var trackInventory = entry.trackInventory === true;
        var stockQty =
          typeof entry.stockQty === "number" && Number.isFinite(entry.stockQty)
            ? Math.max(0, Math.floor(entry.stockQty))
            : 0;
        return {
          id: id,
          title: title,
          description: entry.description ? String(entry.description) : "",
          price: Math.round(price * 100) / 100,
          trackInventory: trackInventory,
          stockQty: stockQty,
        };
      })
      .filter(Boolean);
  })(CFG.products || []);

  function productInStock(product, qty) {
    qty = qty || 1;
    if (!product.trackInventory) return true;
    return product.stockQty >= qty;
  }

  function productStockLabel(product) {
    if (!product.trackInventory) return "";
    if (product.stockQty <= 0) return "Out of stock";
    if (product.stockQty === 1) return "1 left";
    return product.stockQty + " in stock";
  }

  /** @type {Record<string, number>} */
  const selectedProductQty = {};

  function getSelectedOrderProducts() {
    return CATALOG_PRODUCTS.filter(function (p) {
      return (selectedProductQty[p.id] || 0) > 0;
    }).map(function (p) {
      var qty = selectedProductQty[p.id] || 1;
      return {
        product_id: p.id,
        title: p.title,
        qty: qty,
        unit_price: p.price,
      };
    });
  }

  function productsSubtotalUsd() {
    return round2(
      getSelectedOrderProducts().reduce(function (sum, line) {
        return sum + line.qty * line.unit_price;
      }, 0),
    );
  }

  function renderBookingProductsField() {
    var wrap = document.getElementById("booking-products-list");
    var section = document.getElementById("booking-products-section");
    if (!wrap || !section) return;
    if (!CATALOG_PRODUCTS.length) {
      section.classList.add("hidden");
      section.setAttribute("aria-hidden", "true");
      wrap.innerHTML = "";
      return;
    }
    section.classList.remove("hidden");
    section.setAttribute("aria-hidden", "false");
    wrap.innerHTML = CATALOG_PRODUCTS.map(function (product) {
      var inStock = productInStock(product, 1);
      var checked = inStock && (selectedProductQty[product.id] || 0) > 0;
      var stockLabel = productStockLabel(product);
      return (
        '<label class="booking-product-option' +
        (inStock ? "" : " booking-product-option--disabled") +
        '">' +
        '<input type="checkbox" name="booking-product" value="' +
        product.id +
        '"' +
        (checked ? " checked" : "") +
        (inStock ? "" : " disabled") +
        " />" +
        '<span class="booking-product-option__body">' +
        '<span class="booking-product-option__title">' +
        product.title +
        "</span>" +
        (product.description
          ? '<span class="booking-product-option__desc">' + product.description + "</span>"
          : "") +
        '<span class="booking-product-option__meta">' +
        '<span class="booking-product-option__price">$' +
        product.price.toFixed(2) +
        "</span>" +
        (stockLabel
          ? '<span class="booking-product-option__stock' +
            (inStock ? "" : " booking-product-option__stock--out") +
            '">' +
            stockLabel +
            "</span>"
          : "") +
        "</span></span></label>"
      );
    }).join("");
    wrap.querySelectorAll('input[name="booking-product"]').forEach(function (input) {
      input.addEventListener("change", function () {
        var product = CATALOG_PRODUCTS.find(function (p) {
          return p.id === input.value;
        });
        if (input.checked) {
          if (product && !productInStock(product, 1)) {
            input.checked = false;
            return;
          }
          selectedProductQty[input.value] = 1;
        } else delete selectedProductQty[input.value];
        renderPricing();
      });
    });
  }

  function applyProductFromQueryParam() {
    try {
      var id = new URLSearchParams(window.location.search).get("product");
      if (!id) return;
      if (CATALOG_PRODUCTS.some(function (p) { return p.id === id && productInStock(p, 1); })) {
        selectedProductQty[id] = 1;
      }
    } catch (_) {
      /* ignore */
    }
  }

  function paymentMode() {
    const configured = PAYMENT.mode || "in_person";
    const enabled = PAYMENT.onlinePaymentsEnabled === true;
    if (!enabled) return "in_person";
    if ((configured === "deposit" || configured === "full") && !window.__STYLD_STRIPE_READY__) {
      return "in_person";
    }
    return configured === "deposit" || configured === "full" ? configured : "in_person";
  }

  function depositIncludedInPrice() {
    return PAYMENT.depositIncludedInPrice !== false;
  }

  const CANCELLATION_POLICY =
    CFG.cancellationPolicy && typeof CFG.cancellationPolicy === "object"
      ? CFG.cancellationPolicy
      : {
          preset: "no_refunds",
          fullRefundNoticeHours: 0,
          refundAppliesTo: "none",
          policySummary:
            "You may cancel online anytime before your appointment. All online payments, including deposits, are non-refundable.",
        };

  const USE_LEGACY_DEPOSIT_RULES = !TENANT_BOOKING && !CFG.payment;

  function catalogStyles() {
    if (TENANT_BOOKING && Array.isArray(TENANT_BOOKING.styles) && TENANT_BOOKING.styles.length) {
      return TENANT_BOOKING.styles.concat([
        { id: "other", name: "Other / custom quote (price TBD)", base: 0 },
      ]);
    }
    return STYLES;
  }

  const STYLES = [
    { id: "studio-knotless-sm", name: "Studio · Your service · Small", base: 155 },
    { id: "studio-knotless-md", name: "Studio · Your service · Medium", base: 110 },
    { id: "studio-knotless-lg", name: "Studio · Your service · Large", base: 95 },
    { id: "studio-passion-sm", name: "Studio · Your service · Smedium", base: 175 },
    { id: "studio-passion-md", name: "Studio · Your service · Medium", base: 135 },
    { id: "studio-wig-install", name: "Studio · Your service · Install & style", base: 120 },
    { id: "studio-wig-pony", name: "Studio · Your service · Ponytail", base: 90 },
    { id: "studio-wig-qw", name: "Studio · Your service · Q/W", base: 100 },
    { id: "studio-wig-fulani-quickweave", name: "Studio · Your service · Your add-on label", base: 110 },
    { id: "studio-natural-2strand", name: "Studio · Your service · 2 strand", base: 50 },
    { id: "studio-natural-cornrows", name: "Studio · Your service · Your option (add-on note)", base: 35 },
    { id: "studio-natural-fulani", name: "Studio · Your service · Your option label", base: 45 },
    { id: "studio-natural-box", name: "Studio · Your service · Your option label", base: 40 },
    { id: "studio-natural-twist", name: "Studio · Your service · Regular twist", base: 35 },
    { id: "studio-boho-sm", name: "Studio · Your service · Smedium", base: 185 },
    { id: "studio-boho-md", name: "Studio · Your service · Medium", base: 135 },
    { id: "studio-boho-lg", name: "Studio · Your service · Large", base: 100 },
    { id: "studio-feedin-2", name: "Studio · Your service · 2", base: 75 },
    { id: "studio-feedin-4", name: "Studio · Your service · 4", base: 85 },
    { id: "studio-feedin-8", name: "Studio · Your service · 8", base: 100 },
    { id: "studio-feedin-10plus", name: "Studio · Your service · 10+", base: 110 },
    { id: "studio-locs-2strand", name: "Studio · Your service · 2 strand", base: 90 },
    { id: "studio-locs-retwist", name: "Studio · Your service · Retwist", base: 70 },
    { id: "studio-locs-barrels", name: "Studio · Your service · Barrels", base: 80 },
    { id: "studio-locs-half-up", name: "Studio · Your service · Half up half down", base: 65 },
    { id: "studio-locs-starter", name: "Studio · Your service · Starter loc", base: 100 },
    { id: "studio-fulani-one", name: "Studio · Your service · One size", base: 155 },
    { id: "studio-fulani-passion-twists", name: "Studio · Your combo service (edit)", base: 165 },

    { id: "house-knotless-sm", name: "House call · Your service · Small", base: 185 },
    { id: "house-knotless-md", name: "House call · Your service · Medium", base: 135 },
    { id: "house-knotless-lg", name: "House call · Your service · Large", base: 110 },
    { id: "house-passion-sm", name: "House call · Your service · Smedium", base: 175 },
    { id: "house-passion-md", name: "House call · Your service · Medium", base: 145 },
    { id: "house-boho-sm", name: "House call · Your service · Smedium", base: 200 },
    { id: "house-boho-md", name: "House call · Your service · Medium", base: 160 },
    { id: "house-boho-lg", name: "House call · Your service · Large", base: 115 },
    { id: "house-feedin-2", name: "House call · Your service · 2", base: 90 },
    { id: "house-feedin-4", name: "House call · Your service · 4", base: 100 },
    { id: "house-feedin-8", name: "House call · Your service · 8", base: 115 },
    { id: "house-feedin-10plus", name: "House call · Your service · 10+", base: 125 },
    { id: "house-fulani-one", name: "House call · Your service · One size", base: 170 },
    { id: "house-fulani-passion-twists", name: "House call · Your combo service (edit)", base: 185 },
    { id: "house-wig-install", name: "House call · Your service · Install & style", base: 135 },
    { id: "house-wig-pony", name: "House call · Your service · Ponytail", base: 100 },
    { id: "house-wig-qw", name: "House call · Your service · Q/W", base: 115 },
    { id: "house-wig-fulani-quickweave", name: "House call · Your service · Your add-on label", base: 125 },

    { id: "kids-knotless-md", name: "Kids (12 & under) · Your service · Medium", base: 110 },
    { id: "kids-knotless-lg", name: "Kids (12 & under) · Your service · Large", base: 85 },
    { id: "kids-passion-sm", name: "Kids (12 & under) · Your service · Smedium", base: 135 },
    { id: "kids-passion-md", name: "Kids (12 & under) · Your service · Medium", base: 115 },
    { id: "kids-natural-2strand", name: "Kids (12 & under) · Your service · 2 strand", base: 40 },
    { id: "kids-natural-cornrows", name: "Kids (12 & under) · Your service · Your option label", base: 25 },
    { id: "kids-natural-box", name: "Kids (12 & under) · Your service · Your option label", base: 40 },
    { id: "kids-natural-twist", name: "Kids (12 & under) · Your service · Regular twist", base: 35 },
    { id: "kids-boho-md", name: "Kids (12 & under) · Your service · Medium", base: 120 },
    { id: "kids-boho-lg", name: "Kids (12 & under) · Your service · Large", base: 100 },
    { id: "kids-feedin-2", name: "Kids (12 & under) · Your service · 2", base: 55 },
    { id: "kids-feedin-4", name: "Kids (12 & under) · Your service · 4", base: 65 },
    { id: "kids-feedin-8", name: "Kids (12 & under) · Your service · 8", base: 90 },
    { id: "kids-feedin-10plus", name: "Kids (12 & under) · Your service · 10+", base: 100 },
    { id: "kids-fulani-one", name: "Kids (12 & under) · Your service · One size", base: 140 },
    { id: "kids-fulani-passion-twists", name: "Kids (12 & under) · Your combo service (edit)", base: 150 },
    { id: "kids-lemonade-one", name: "Kids (12 & under) · Your service · One size", base: 125 },

    { id: "other", name: "Other / custom quote (price TBD)", base: 0 },
  ];

  const availability =
    window.BookingAvailability && DT
      ? window.BookingAvailability.createEngine(CFG, DT)
      : null;

  /** Minutes from first bookable slot start through scheduled closing (house calls block the full window). */
  function fullSalonDayMinutes() {
    const hours = availability ? availability.hours : CFG;
    const start = hours.slotDayStartHour * 60 + hours.slotDayStartMinute;
    const lastSlotStart = hours.slotDayEndHour * 60 + hours.slotDayEndMinute;
    const longestScheduledStyleMin = 300;
    return Math.max(120, lastSlotStart - start + longestScheduledStyleMin);
  }

  function isHouseStyleId(styleId) {
    return !!styleId && styleId.indexOf("house-") === 0;
  }

  /** Extra length add-ons: enabled when style id matches keywords in booking.js — adjust ids or logic when you rename services. */
  function styleSupportsExtraHairLength(styleId) {
    if (!USE_HAIR_LENGTH_ADDONS) return false;
    if (!styleId || styleId === "other") return false;
    const s = String(styleId).toLowerCase();
    if (s.includes("knotless")) return true;
    if (s.includes("boho")) return true;
    if (s.includes("fulani")) return true;
    if (s.includes("feedin") || s.includes("cornrows")) return true;
    return false;
  }

  /**
   * Fixed service durations (minutes) per boss pricing — studio, house, and kids menus use the same family rules.
   * House-call rows override with fullSalonDayMinutes() so the entire working day is blocked.
   */
  function baseDurationMinutesForStyle(styleId) {
    if (!styleId || styleId === "other") return 90;
    if (isHouseStyleId(styleId)) return fullSalonDayMinutes();
    if (styleId.includes("knotless")) return 180;
    if (styleId.includes("boho")) return 300;
    if (styleId.includes("passion")) return 300;
    if (styleId.includes("wig")) return 120;
    if (styleId.includes("natural")) return 60;
    if (styleId.includes("locs")) return 120;
    if (styleId.includes("fulani") || styleId.includes("lemonade")) return 240;
    if (styleId.includes("feedin")) return 180;
    return 180;
  }

  /** @type {{ start: number, end: number, isBlock?: boolean }[]} */
  let cachedUnavailable = [];
  let availabilityLoadFailed = false;
  /** Dates (YYYY-MM-DD) that already have at least one booking — used for house-call calendar rule. */
  let datesWithBookings = new Set();
  let pollTimer = null;
  let viewYear;
  let viewMonth;
  let selectedIsoDate = null;
  let selectedSlotIso = null;
  let stripeCardElement = null;
  let stripeElementsMounted = false;
  let pendingBookingId = "";

  const els = {
    form: document.getElementById("booking-form"),
    styleSelect: document.getElementById("style-select"),
    styleVariantWrap: document.getElementById("style-variant-field-wrap"),
    styleVariantList: document.getElementById("style-variant-list"),
    styleAddonWrap: document.getElementById("style-addon-field-wrap"),
    styleAddonList: document.getElementById("style-addon-list"),
    hairLength: document.getElementById("hair-length-select"),
    subtotalOut: document.getElementById("line-subtotal"),
    styleAddonOut: document.getElementById("line-style-addon"),
    styleAddonRow: document.getElementById("line-style-addon-row"),
    lengthAddonOut: document.getElementById("line-length-addon"),
    totalOut: document.getElementById("line-total"),
    depositBaseOut: document.getElementById("line-deposit-base"),
    depositBaseRow: document.getElementById("line-deposit-base-row"),
    serviceFeeOut: document.getElementById("line-service-fee"),
    serviceFeeRow: document.getElementById("line-service-fee-row"),
    chargeTotalOut: document.getElementById("line-charge-total"),
    chargeTotalRow: document.getElementById("line-charge-total-row"),
    inPersonDueOut: document.getElementById("line-in-person-due"),
    inPersonDueRow: document.getElementById("line-in-person-due-row"),
    depositDetailOut: document.getElementById("line-deposit-detail"),
    sideSubtotal: document.getElementById("side-subtotal"),
    sideStyleAddon: document.getElementById("side-style-addon"),
    sideStyleAddonRow: document.getElementById("side-style-addon-row"),
    sideLengthAddon: document.getElementById("side-length-addon"),
    sideTotal: document.getElementById("side-total"),
    sideTotalLabel: document.getElementById("side-total-label"),
    lineTotalLabel: document.getElementById("line-total-label"),
    sideDepositExcludedNote: document.getElementById("side-deposit-excluded-note"),
    lineDepositExcludedNote: document.getElementById("line-deposit-excluded-note"),
    sideDeposit: document.getElementById("side-deposit"),
    sideDepositRow: document.getElementById("side-deposit-row"),
    sideServiceFee: document.getElementById("side-service-fee"),
    sideServiceFeeRow: document.getElementById("side-service-fee-row"),
    sideChargeTotal: document.getElementById("side-charge-total"),
    sideChargeTotalRow: document.getElementById("side-charge-total-row"),
    sideBalanceDue: document.getElementById("side-balance-due"),
    sideBalanceRow: document.getElementById("side-balance-row"),
    sideInPersonDue: document.getElementById("side-in-person-due"),
    sideInPersonRow: document.getElementById("side-in-person-row"),
    paymentBox: document.getElementById("payment-section"),
    promoSection: document.getElementById("promo-code-section"),
    promoInput: document.getElementById("promo-code-input"),
    promoApplyBtn: document.getElementById("promo-code-apply"),
    promoFeedback: document.getElementById("promo-code-feedback"),
    promoApplied: document.getElementById("promo-code-applied"),
    sidePromoRow: document.getElementById("side-promo-row"),
    sidePromoDiscount: document.getElementById("side-promo-discount"),
    photoHair: document.getElementById("photo-hair"),
    photoRef: document.getElementById("photo-ref"),
    photoHairPreview: document.getElementById("photo-hair-preview"),
    photoRefPreview: document.getElementById("photo-ref-preview"),
    feedback: document.getElementById("booking-feedback"),
    durationStrip: document.getElementById("duration-strip"),
    calMonthLabel: document.getElementById("booking-cal-month-label"),
    calPrev: document.getElementById("booking-cal-prev"),
    calNext: document.getElementById("booking-cal-next"),
    calWeekdays: document.getElementById("booking-cal-weekdays"),
    calGrid: document.getElementById("booking-cal-grid"),
    calSelectedLine: document.getElementById("booking-cal-selected-line"),
    slotsWrap: document.getElementById("time-slots-container"),
    styleGate: document.getElementById("style-gate-alert"),
    slotsSection: document.getElementById("slots-panel"),
    hiddenAppt: document.getElementById("appointment-starts-at"),
    hiddenDur: document.getElementById("duration-minutes-input"),
    hairLengthWrap: document.getElementById("hair-length-field-wrap"),
    houseAddressWrap: document.getElementById("house-address-field-wrap"),
    houseAddrStreet: document.getElementById("house-addr-street"),
    houseAddrUnit: document.getElementById("house-addr-unit"),
    houseAddrCity: document.getElementById("house-addr-city"),
    houseAddrState: document.getElementById("house-addr-state"),
    houseAddrZip: document.getElementById("house-addr-zip"),
    travelRequestWrap: document.getElementById("travel-request-wrap"),
    travelRequestToggle: document.getElementById("travel-request-toggle"),
    travelAddressWrap: document.getElementById("travel-address-field-wrap"),
    travelAddrStreet: document.getElementById("travel-addr-street"),
    travelAddrUnit: document.getElementById("travel-addr-unit"),
    travelAddrCity: document.getElementById("travel-addr-city"),
    travelAddrState: document.getElementById("travel-addr-state"),
    travelAddrZip: document.getElementById("travel-addr-zip"),
    travelFeePreview: document.getElementById("travel-fee-preview"),
    lineTravelFeeRow: document.getElementById("line-travel-fee-row"),
    lineTravelFee: document.getElementById("line-travel-fee"),
    sideTravelFeeRow: document.getElementById("side-travel-fee-row"),
    sideTravelFee: document.getElementById("side-travel-fee"),
    depositNoteStudio: document.getElementById("deposit-note-studio"),
    depositNoteHouseCall: document.getElementById("deposit-note-house-call"),
    depositNoteInPerson: document.getElementById("deposit-note-in-person"),
    depositPolicyAlert: document.getElementById("deposit-policy-alert"),
    sideDepositNote: document.getElementById("side-deposit-note"),
    sideCancellationPolicyWrap: document.getElementById("side-cancellation-policy-wrap"),
    sideCancellationPolicy: document.getElementById("side-cancellation-policy"),
    lineOnlineLabel: document.getElementById("line-online-label"),
    sideOnlineLabel: document.getElementById("side-online-label"),
    submitBtn: document.getElementById("booking-submit-btn"),
  };

  function getBookingSubdomain() {
    var t = window.__STYLD_TENANT_BOOKING__;
    return t && t.subdomain ? String(t.subdomain).trim().toLowerCase() : "";
  }

  function setStripeCardError(message) {
    var el = document.getElementById("stripe-card-error");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  function clearStripePaymentState() {
    setStripeCardError("");
  }

  function trimAddr(el) {
    return (el && el.value && String(el.value).trim()) || "";
  }

  function clearHouseAddressFields() {
    [els.houseAddrStreet, els.houseAddrUnit, els.houseAddrCity, els.houseAddrState, els.houseAddrZip].forEach((el) => {
      if (el) el.value = "";
    });
  }

  function clearTravelAddressFields() {
    [els.travelAddrStreet, els.travelAddrUnit, els.travelAddrCity, els.travelAddrState, els.travelAddrZip].forEach((el) => {
      if (el) el.value = "";
    });
    travelDistanceMiles = null;
    travelFeeUsd = 0;
    travelFeeStatus = "idle";
    if (els.travelFeePreview) {
      els.travelFeePreview.hidden = true;
      els.travelFeePreview.textContent = "";
    }
  }

  function travelStylistLive() {
    return !!(TRAVEL && TRAVEL.enabled && TRAVEL.homeBaseAddress);
  }

  function isPrimaryTravelArtist() {
    return travelStylistLive() && TRAVEL.bookingMode === "primary";
  }

  function isTravelRequestChecked() {
    if (isPrimaryTravelArtist()) return true;
    return !!(els.travelRequestToggle && els.travelRequestToggle.checked);
  }

  function isTravelBooking() {
    if (!travelStylistLive()) return false;
    const style = getSelectedStyle();
    if (!style?.id) return false;
    if (isPrimaryTravelArtist()) return true;
    if (isHouseStyleId(style.id)) return true;
    return isTravelRequestChecked();
  }

  function usesTravelAddressFields() {
    if (isPrimaryTravelArtist()) return true;
    const style = getSelectedStyle();
    if (style && isHouseStyleId(style.id)) return false;
    return isTravelRequestChecked();
  }

  function isTravelAddressComplete() {
    if (usesTravelAddressFields()) {
      const street = trimAddr(els.travelAddrStreet);
      const city = trimAddr(els.travelAddrCity);
      const state = trimAddr(els.travelAddrState).toUpperCase();
      const zipRaw = trimAddr(els.travelAddrZip).replace(/\s/g, "");
      if (!street || !city || !state || !zipRaw) return false;
      if (!/^[A-Z]{2}$/.test(state)) return false;
      if (!/^\d{5}(-\d{4})?$/.test(zipRaw)) return false;
      return true;
    }
    if (getSelectedStyle() && isHouseStyleId(getSelectedStyle().id)) return isHouseAddressComplete();
    return false;
  }

  function formatTravelAddressForStorage() {
    if (usesTravelAddressFields()) {
      const street = trimAddr(els.travelAddrStreet);
      const unit = trimAddr(els.travelAddrUnit);
      const city = trimAddr(els.travelAddrCity);
      const state = trimAddr(els.travelAddrState).toUpperCase();
      const zip = trimAddr(els.travelAddrZip).replace(/\s/g, "");
      const line1 = unit ? `${street}, ${unit}` : street;
      return `${line1}\n${city}, ${state} ${zip}`;
    }
    return formatServiceAddressForStorage();
  }

  function requiresBookingApproval() {
    if (PAYMENT.requireBookingApproval === true) return true;
    if (isTravelBooking()) return true;
    return false;
  }

  function computeTravelFeeFromDistance(distanceMiles) {
    if (!travelStylistLive()) return 0;
    if (TRAVEL.feeMode === "flat") return Math.max(0, Math.round(TRAVEL.flatFeeUsd * 100) / 100);
    const miles = Math.max(0, Number(distanceMiles) || 0);
    return Math.max(0, Math.round(miles * TRAVEL.perMileRateUsd * 100) / 100);
  }

  function updateTravelFeePreview() {
    const show = isTravelBooking();
    if (els.lineTravelFeeRow) els.lineTravelFeeRow.hidden = !(show && travelFeeUsd > 0);
    if (els.sideTravelFeeRow) els.sideTravelFeeRow.hidden = !(show && travelFeeUsd > 0);
    if (els.lineTravelFee && travelFeeUsd > 0) els.lineTravelFee.textContent = money(travelFeeUsd);
    if (els.sideTravelFee && travelFeeUsd > 0) els.sideTravelFee.textContent = money(travelFeeUsd);
    if (!els.travelFeePreview) return;
    if (!show) {
      els.travelFeePreview.hidden = true;
      els.travelFeePreview.textContent = "";
      return;
    }
    if (!isTravelAddressComplete()) {
      els.travelFeePreview.hidden = false;
      els.travelFeePreview.textContent = "Enter your full address to see the travel fee.";
      return;
    }
    if (travelFeeStatus === "computing") {
      els.travelFeePreview.hidden = false;
      els.travelFeePreview.textContent = "Calculating travel fee…";
      return;
    }
    if (travelFeeStatus === "error") {
      els.travelFeePreview.hidden = false;
      els.travelFeePreview.textContent = "Could not calculate travel fee. Check your address and try again.";
      return;
    }
    if (TRAVEL.feeMode === "flat") {
      els.travelFeePreview.hidden = false;
      els.travelFeePreview.textContent =
        travelFeeUsd > 0 ? `Travel fee: ${money(travelFeeUsd)}` : "No travel fee";
      return;
    }
    if (travelDistanceMiles != null) {
      els.travelFeePreview.hidden = false;
      els.travelFeePreview.textContent =
        travelFeeUsd > 0
          ? `Travel fee: ${money(travelFeeUsd)} (${travelDistanceMiles.toFixed(1)} mi from home base)`
          : `No travel fee (${travelDistanceMiles.toFixed(1)} mi from home base)`;
      return;
    }
    els.travelFeePreview.hidden = false;
    els.travelFeePreview.textContent = "Calculating travel fee…";
  }

  function scheduleTravelFeeRecalc() {
    if (travelFeeTimer) clearTimeout(travelFeeTimer);
    travelFeeTimer = setTimeout(() => {
      void recalculateTravelFee();
    }, 450);
  }

  async function geocodeAddressString(address) {
    await loadGoogleMapsScript();
    if (!window.google?.maps) throw new Error("Maps not available");
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          reject(new Error("Geocode failed"));
          return;
        }
        resolve(results[0].geometry.location);
      });
    });
  }

  async function drivingDistanceMiles(origin, destination) {
    await loadGoogleMapsScript();
    if (!window.google?.maps) throw new Error("Maps not available");
    const service = new google.maps.DistanceMatrixService();
    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL,
        },
        (response, status) => {
          if (status !== "OK") {
            reject(new Error("Distance failed"));
            return;
          }
          const element = response?.rows?.[0]?.elements?.[0];
          if (!element || element.status !== "OK" || !element.distance?.value) {
            reject(new Error("Distance unavailable"));
            return;
          }
          resolve(element.distance.value / 1609.344);
        },
      );
    });
  }

  async function recalculateTravelFee() {
    if (!isTravelBooking()) {
      travelDistanceMiles = null;
      travelFeeUsd = 0;
      travelFeeStatus = "idle";
      updateTravelFeePreview();
      renderPricing();
      return;
    }
    if (!isTravelAddressComplete()) {
      travelDistanceMiles = null;
      travelFeeUsd = 0;
      travelFeeStatus = "idle";
      updateTravelFeePreview();
      renderPricing();
      return;
    }
    if (TRAVEL.feeMode === "flat") {
      travelDistanceMiles = null;
      travelFeeUsd = computeTravelFeeFromDistance(0);
      travelFeeStatus = "ready";
      updateTravelFeePreview();
      renderPricing();
      return;
    }
    if (TRAVEL.perMileRateUsd <= 0) {
      travelDistanceMiles = null;
      travelFeeUsd = 0;
      travelFeeStatus = "ready";
      updateTravelFeePreview();
      renderPricing();
      return;
    }
    travelFeeStatus = "computing";
    updateTravelFeePreview();
    try {
      const destination = formatTravelAddressForStorage().replace(/\n/g, ", ");
      const origin =
        typeof TRAVEL.homeBaseLat === "number" &&
        typeof TRAVEL.homeBaseLng === "number"
          ? { lat: TRAVEL.homeBaseLat, lng: TRAVEL.homeBaseLng }
          : TRAVEL.homeBaseAddress;
      const miles = await drivingDistanceMiles(origin, destination);
      travelDistanceMiles = Math.round(miles * 10) / 10;
      travelFeeUsd = computeTravelFeeFromDistance(travelDistanceMiles);
      travelFeeStatus = "ready";
    } catch (err) {
      console.warn("travel fee calc", err);
      travelDistanceMiles = null;
      travelFeeUsd = 0;
      travelFeeStatus = "error";
    }
    updateTravelFeePreview();
    renderPricing();
  }

  function isHouseAddressComplete() {
    const street = trimAddr(els.houseAddrStreet);
    const city = trimAddr(els.houseAddrCity);
    const state = trimAddr(els.houseAddrState).toUpperCase();
    const zipRaw = trimAddr(els.houseAddrZip).replace(/\s/g, "");
    if (!street || !city || !state || !zipRaw) return false;
    if (!/^[A-Z]{2}$/.test(state)) return false;
    if (!/^\d{5}(-\d{4})?$/.test(zipRaw)) return false;
    return true;
  }

  function formatServiceAddressForStorage() {
    const street = trimAddr(els.houseAddrStreet);
    const unit = trimAddr(els.houseAddrUnit);
    const city = trimAddr(els.houseAddrCity);
    const state = trimAddr(els.houseAddrState).toUpperCase();
    const zip = trimAddr(els.houseAddrZip).replace(/\s/g, "");
    const line1 = unit ? `${street}, ${unit}` : street;
    return `${line1}\n${city}, ${state} ${zip}`;
  }

  function applyGoogleAddressComponents(comps) {
    let streetNum = "";
    let route = "";
    let sub = "";
    let city = "";
    let state = "";
    let zip = "";
    let zip4 = "";
    for (const c of comps) {
      const t = c.types;
      if (t.includes("street_number")) streetNum = c.long_name;
      if (t.includes("route")) route = c.long_name;
      if (t.includes("subpremise")) sub = c.long_name;
      if (t.includes("administrative_area_level_1")) state = c.short_name;
      if (t.includes("postal_code")) zip = c.long_name;
      if (t.includes("postal_code_suffix")) zip4 = c.long_name;
    }
    for (const c of comps) {
      if (c.types.includes("locality")) {
        city = c.long_name;
        break;
      }
    }
    if (!city) {
      for (const c of comps) {
        const t = c.types;
        if (t.includes("sublocality") || t.includes("neighborhood")) {
          city = c.long_name;
          break;
        }
      }
    }
    if (zip && zip4) zip = `${zip}-${zip4}`;
    const street = [streetNum, route].filter(Boolean).join(" ").trim();
    if (els.houseAddrStreet) els.houseAddrStreet.value = street;
    if (els.houseAddrUnit) els.houseAddrUnit.value = sub;
    if (els.houseAddrCity) els.houseAddrCity.value = city;
    if (els.houseAddrState) els.houseAddrState.value = (state || "").toUpperCase().slice(0, 2);
    if (els.houseAddrZip) els.houseAddrZip.value = zip;
    void renderPricing();
  }

  function loadGoogleMapsScript() {
    if (window.google?.maps?.places) return Promise.resolve();
    const key = CFG.googleMapsApiKey;
    if (!key) return Promise.reject(new Error("no Google Maps API key"));
    if (googleMapsLoadPromise) return googleMapsLoadPromise;
    googleMapsLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.dataset.salonSiteMaps = "1";
      s.async = true;
      s.defer = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      s.onload = () => resolve();
      s.onerror = () => {
        googleMapsLoadPromise = null;
        reject(new Error("maps script failed"));
      };
      document.head.appendChild(s);
    });
    return googleMapsLoadPromise;
  }

  function attachPlacesAutocomplete() {
    const input = els.houseAddrStreet;
    if (!input || !window.google?.maps?.places || input.dataset.salonSiteAc === "1") return;
    input.dataset.salonSiteAc = "1";
    const ac = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "us" },
      fields: ["address_components"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place && place.address_components) {
        applyGoogleAddressComponents(place.address_components);
        scheduleTravelFeeRecalc();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
  }

  function applyGoogleAddressToFields(comps, fields) {
    let streetNum = "";
    let route = "";
    let sub = "";
    let city = "";
    let state = "";
    let zip = "";
    let zip4 = "";
    for (const c of comps) {
      const t = c.types;
      if (t.includes("street_number")) streetNum = c.long_name;
      if (t.includes("route")) route = c.long_name;
      if (t.includes("subpremise")) sub = c.long_name;
      if (t.includes("administrative_area_level_1")) state = c.short_name;
      if (t.includes("postal_code")) zip = c.long_name;
      if (t.includes("postal_code_suffix")) zip4 = c.long_name;
    }
    for (const c of comps) {
      if (c.types.includes("locality")) {
        city = c.long_name;
        break;
      }
    }
    if (!city) {
      for (const c of comps) {
        const t = c.types;
        if (t.includes("sublocality") || t.includes("neighborhood")) {
          city = c.long_name;
          break;
        }
      }
    }
    if (zip && zip4) zip = `${zip}-${zip4}`;
    const street = [streetNum, route].filter(Boolean).join(" ").trim();
    if (fields.street) fields.street.value = street;
    if (fields.unit) fields.unit.value = sub;
    if (fields.city) fields.city.value = city;
    if (fields.state) fields.state.value = (state || "").toUpperCase().slice(0, 2);
    if (fields.zip) fields.zip.value = zip;
  }

  function attachTravelPlacesAutocomplete() {
    const input = els.travelAddrStreet;
    if (!input || !window.google?.maps?.places || input.dataset.salonSiteAc === "1") return;
    input.dataset.salonSiteAc = "1";
    const ac = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "us" },
      fields: ["address_components"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place && place.address_components) {
        applyGoogleAddressToFields(place.address_components, {
          street: els.travelAddrStreet,
          unit: els.travelAddrUnit,
          city: els.travelAddrCity,
          state: els.travelAddrState,
          zip: els.travelAddrZip,
        });
        scheduleTravelFeeRecalc();
        renderPricing();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
  }

  function initHouseAddressUI() {
    const hint = document.getElementById("house-addr-maps-hint");
    if (hint) hint.hidden = !!CFG.googleMapsApiKey;
    const travelHint = document.getElementById("travel-addr-maps-hint");
    if (travelHint) travelHint.hidden = !!CFG.googleMapsApiKey;
    if (els.houseAddrState) {
      els.houseAddrState.addEventListener("input", () => {
        const v = (els.houseAddrState.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
        els.houseAddrState.value = v;
      });
    }
    if (els.travelAddrState) {
      els.travelAddrState.addEventListener("input", () => {
        const v = (els.travelAddrState.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
        els.travelAddrState.value = v;
      });
    }
    if (CFG.googleMapsApiKey) {
      loadGoogleMapsScript()
        .then(() => {
          attachPlacesAutocomplete();
          attachTravelPlacesAutocomplete();
        })
        .catch(() => {
          /* suggestions unavailable; manual entry still works */
        });
    }
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function populateStyles() {
    if (!els.styleSelect) return;
    els.styleSelect.innerHTML =
      '<option value="">Choose a style</option>' +
      catalogStyles().map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  }

  function getSelectedStyle() {
    const opt = els.styleSelect?.selectedOptions[0];
    if (!opt || !opt.value) return null;
    const def = catalogStyles().find((s) => s.id === opt.value);
    const base = def && Number.isFinite(def.base) ? def.base : 0;
    return {
      id: opt.value,
      name: opt.textContent,
      base,
      durationMinutes: def && typeof def.durationMinutes === "number" ? def.durationMinutes : undefined,
      defaultVariantLabel:
        def && typeof def.defaultVariantLabel === "string" ? def.defaultVariantLabel.trim() : "",
      variants: def && Array.isArray(def.variants) ? def.variants : [],
      addons: def && Array.isArray(def.addons) ? def.addons : [],
    };
  }

  function getStyleVariantsForStyle(style) {
    if (!style || !Array.isArray(style.variants)) return [];
    var extras = style.variants.filter(function (variant) {
      if (!variant || typeof variant !== "object") return false;
      var label = typeof variant.label === "string" ? variant.label.trim() : "";
      return label.length > 0;
    });
    if (!extras.length) return [];
    var baseLabel =
      style.defaultVariantLabel && style.defaultVariantLabel.length
        ? style.defaultVariantLabel
        : "Standard";
    var base = style.base > 0 ? style.base : 0;
    return [{ id: "default", label: baseLabel, price: base }].concat(extras);
  }

  function renderStyleVariantField(style) {
    if (!els.styleVariantWrap || !els.styleVariantList) return;
    els.styleVariantList.innerHTML = "";
    var variants = getStyleVariantsForStyle(style);
    var show = !!TENANT_BOOKING && variants.length > 0;
    els.styleVariantWrap.hidden = !show;
    if (!show) return;

    variants.forEach(function (variant, index) {
      var labelEl = document.createElement("label");
      labelEl.className = "style-addon-option";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "style-variant";
      input.value = variant.id;
      input.checked = index === 0;
      input.addEventListener("change", function () {
        renderPricing();
        renderSlots();
        void refreshUnavailableForSelection();
      });
      var priceText =
        variant.price > 0 ? " (" + money(variant.price) + ")" : "";
      labelEl.appendChild(input);
      labelEl.appendChild(document.createTextNode(" " + variant.label + priceText));
      els.styleVariantList.appendChild(labelEl);
    });
  }

  function getSelectedStyleVariant() {
    if (!TENANT_BOOKING) return null;
    var style = getSelectedStyle();
    var variants = getStyleVariantsForStyle(style);
    if (!variants.length || !els.styleVariantList) return null;
    var input = els.styleVariantList.querySelector('input[name="style-variant"]:checked');
    if (!input || !input.value) return variants[0] || null;
    return (
      variants.find(function (variant) {
        return variant.id === input.value;
      }) ||
      variants[0] ||
      null
    );
  }

  function effectiveStyleBase(style) {
    if (!style) return 0;
    var variant = getSelectedStyleVariant();
    if (variant) {
      return variant.price > 0 ? variant.price : style.base;
    }
    return style.base;
  }

  function getStyleAddonsForStyle(style) {
    if (!style || !Array.isArray(style.addons)) return [];
    return style.addons.filter(function (addon) {
      if (!addon || typeof addon !== "object") return false;
      var name = typeof addon.name === "string" ? addon.name.trim() : "";
      var price = typeof addon.price === "number" ? addon.price : Number(addon.price);
      return name.length > 0 && Number.isFinite(price) && price > 0;
    });
  }

  function renderStyleAddonField(style) {
    if (!els.styleAddonWrap || !els.styleAddonList) return;
    els.styleAddonList.innerHTML = "";
    var addons = getStyleAddonsForStyle(style);
    var show = !!TENANT_BOOKING && addons.length > 0;
    els.styleAddonWrap.hidden = !show;
    if (!show) return;

    function addOption(id, label, checked) {
      var labelEl = document.createElement("label");
      labelEl.className = "style-addon-option";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "style-addon";
      input.value = id;
      input.checked = checked;
      input.addEventListener("change", function () {
        renderPricing();
        renderSlots();
        void refreshUnavailableForSelection();
      });
      labelEl.appendChild(input);
      labelEl.appendChild(document.createTextNode(label));
      els.styleAddonList.appendChild(labelEl);
    }

    addOption("", " No add-on", true);
    addons.forEach(function (addon) {
      addOption(addon.id, " " + addon.name + " (+" + money(addon.price) + ")", false);
    });
  }

  function getSelectedStyleAddon() {
    if (!TENANT_BOOKING) return null;
    var style = getSelectedStyle();
    var addons = getStyleAddonsForStyle(style);
    if (!addons.length || !els.styleAddonList) return null;
    var input = els.styleAddonList.querySelector('input[name="style-addon"]:checked');
    if (!input || !input.value) return null;
    return addons.find(function (addon) {
      return addon.id === input.value;
    }) || null;
  }

  function styleAddonUsd() {
    var addon = getSelectedStyleAddon();
    return addon ? addon.price : 0;
  }

  function getHairLengthKey() {
    const style = getSelectedStyle();
    if (!style || !styleSupportsExtraHairLength(style.id)) return "";
    const v = (els.hairLength?.value || "").trim();
    if (v === "lower-back" || v === "butt" || v === "knee") return v;
    return "";
  }

  function syncBookingDependentFields() {
    const style = getSelectedStyle();
    const sid = style?.id || "";

    renderStyleVariantField(style);
    renderStyleAddonField(style);

    const showLen = styleSupportsExtraHairLength(sid);
    if (els.hairLengthWrap) els.hairLengthWrap.hidden = !showLen;
    if (!showLen && els.hairLength) els.hairLength.value = "";

    const primaryTravel = isPrimaryTravelArtist();
    const showAddr = !!sid && isHouseStyleId(sid) && !primaryTravel;
    if (els.houseAddressWrap) els.houseAddressWrap.hidden = !showAddr;
    if (!showAddr) clearHouseAddressFields();

    const showTravelRequest = travelStylistLive() && !!sid && !primaryTravel && !isHouseStyleId(sid);
    if (els.travelRequestWrap) els.travelRequestWrap.hidden = !showTravelRequest;
    if (!showTravelRequest) {
      if (els.travelRequestToggle && !primaryTravel) els.travelRequestToggle.checked = false;
      if (!primaryTravel && els.travelAddressWrap) els.travelAddressWrap.hidden = true;
      if (!primaryTravel) clearTravelAddressFields();
    }

    const showTravelAddr =
      travelStylistLive() && !!sid && (primaryTravel || (isTravelRequestChecked() && !isHouseStyleId(sid)));
    if (els.travelAddressWrap) els.travelAddressWrap.hidden = !showTravelAddr;
    if (!showTravelAddr) clearTravelAddressFields();

    if (showTravelAddr || showAddr) {
      scheduleTravelFeeRecalc();
    } else {
      travelDistanceMiles = null;
      travelFeeUsd = 0;
      travelFeeStatus = "idle";
    }

    renderPricing();
  }

  function hairLengthAddonUsd() {
    const k = getHairLengthKey();
    if (k === "lower-back") return 15;
    if (k === "butt") return 25;
    if (k === "knee") return 35;
    return 0;
  }

  function hairLengthExtraMinutes() {
    const k = getHairLengthKey();
    if (k === "lower-back") return 30;
    if (k === "butt") return 60;
    if (k === "knee") return 90;
    return 0;
  }

  function durationMinutesForStyle(style) {
    if (!style || style.id === "other") return null;
    if (style.id && isHouseStyleId(style.id)) return fullSalonDayMinutes();
    if (typeof style.durationMinutes === "number" && style.durationMinutes > 0) {
      return style.durationMinutes;
    }
    if (style.id) return baseDurationMinutesForStyle(style.id);
    return 90;
  }

  function totalDurationMinutes() {
    const style = getSelectedStyle();
    if (!style || style.id === "other") return null;
    let mins = Math.max(30, durationMinutesForStyle(style) + hairLengthExtraMinutes());
    if (isTravelBooking() && TRAVEL.extraTravelMinutes > 0) {
      mins += TRAVEL.extraTravelMinutes;
    }
    return mins;
  }

  function formatDurationHuman(mins) {
    if (mins == null) return "TBD";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function nowZoned() {
    return DT.now().setZone(CFG.salonTimeZone);
  }

  function parseIsoDateLocal(isoDate) {
    const [y, mo, d] = isoDate.split("-").map(Number);
    return DT.fromObject({ year: y, month: mo, day: d }, { zone: CFG.salonTimeZone });
  }

  function isPastCalendarDay(isoDate) {
    const today = nowZoned().startOf("day");
    const d = parseIsoDateLocal(isoDate).startOf("day");
    return d < today;
  }

  function isBlackedOut(isoDate) {
    const d = parseIsoDateLocal(isoDate).startOf("day");
    for (const r of CFG.blackoutRanges || []) {
      if (!r || !r.start || !r.end) continue;
      const a = parseIsoDateLocal(r.start).startOf("day");
      const b = parseIsoDateLocal(r.end).startOf("day");
      if (d >= a && d <= b) return true;
    }
    return false;
  }

  function calendarDayDisabledReason(isoDate) {
    if (isPastCalendarDay(isoDate)) return "Past dates cannot be booked.";
    if (isBlackedOut(isoDate)) return "Unavailable this week.";
    if (availability) {
      const reason = availability.calendarDayDisabledReason(isoDate);
      if (reason) return reason;
    }
    const selStyle = getSelectedStyle();
    if (selStyle && isHouseStyleId(selStyle.id) && datesWithBookings.has(isoDate))
      return "House calls are only available on days with no other bookings.";
    return null;
  }

  function visibleGridIsoRange() {
    const { cells } = monthMatrix(viewYear, viewMonth);
    const first = cells[0].toFormat("yyyy-MM-dd");
    const last = cells[41].toFormat("yyyy-MM-dd");
    return { p_start: first, p_end: last };
  }

  async function refreshBookingDatesOccupied() {
    const style = getSelectedStyle();
    if (!style || !isHouseStyleId(style.id)) {
      datesWithBookings = new Set();
      return;
    }
    const sb = window.salonSupabaseClient;
    if (!sb) return;
    const range = visibleGridIsoRange();
    const rpcName = TENANT_BOOKING?.subdomain
      ? "styld_tenant_booking_dates_in_range"
      : "booking_dates_in_range";
    const rpcArgs = TENANT_BOOKING?.subdomain
      ? { p_subdomain: TENANT_BOOKING.subdomain, p_start: range.p_start, p_end: range.p_end }
      : { p_start: range.p_start, p_end: range.p_end };
    const { data, error } = await sb.rpc(rpcName, rpcArgs);
    if (error) {
      console.warn("booking_dates_in_range", error);
      return;
    }
    const arr = Array.isArray(data) ? data : [];
    datesWithBookings = new Set(arr.map(String));
  }

  function monthMatrix(year, monthIndex0) {
    const first = DT.fromObject({ year, month: monthIndex0 + 1, day: 1 }, { zone: CFG.salonTimeZone });
    const startDow = first.weekday % 7;
    const gridStart = first.minus({ days: startDow });
    const cells = [];
    let cur = gridStart;
    for (let i = 0; i < 42; i++) {
      cells.push(cur);
      cur = cur.plus({ days: 1 });
    }
    return { cells, monthStart: first };
  }

  function renderCalendar() {
    if (!els.calGrid || !DT) return;
    const { cells, monthStart } = monthMatrix(viewYear, viewMonth);
    if (els.calMonthLabel) {
      els.calMonthLabel.textContent = monthStart.toFormat("LLLL yyyy");
    }
    const today = nowZoned().startOf("day");
    const selDay = selectedIsoDate ? parseIsoDateLocal(selectedIsoDate).startOf("day") : null;

    els.calGrid.innerHTML = "";
    for (const c of cells) {
      const iso = c.toFormat("yyyy-MM-dd");
      const inMonth = c.month - 1 === viewMonth;
      const isToday = c.startOf("day").equals(today);
      const reason = calendarDayDisabledReason(iso);
      const disabled = !!reason;
      const selected = selDay && c.startOf("day").equals(selDay);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booking-calendar__day";
      btn.textContent = String(c.day);
      if (!inMonth) btn.classList.add("is-outside");
      if (disabled) {
        btn.classList.add("is-disabled");
        btn.disabled = true;
        btn.title = reason || "";
      }
      if (isToday) btn.classList.add("is-today");
      if (selected) btn.classList.add("is-selected");
      if (!disabled) {
        btn.addEventListener("click", () => selectDate(iso));
      }
      els.calGrid.appendChild(btn);
    }
  }

  function updateSelectedDateLine() {
    if (!els.calSelectedLine) return;
    const dur = totalDurationMinutes();
    const style = getSelectedStyle();
    if (!selectedIsoDate) {
      els.calSelectedLine.textContent = "Selected Date: —";
      return;
    }
    const d = parseIsoDateLocal(selectedIsoDate);
    let line =
      "Selected Date: " +
      d.toFormat("cccc, LLLL d, yyyy");
    if (selectedSlotIso && dur && style && style.id !== "other") {
      const start = DT.fromISO(selectedSlotIso, { zone: CFG.salonTimeZone });
      const end = start.plus({ minutes: dur });
      line +=
        " · " + start.toFormat("h:mm a") + " – " + end.toFormat("h:mm a");
    }
    els.calSelectedLine.textContent = line;
  }

  function selectDate(isoDate) {
    selectedIsoDate = isoDate;
    selectedSlotIso = null;
    if (els.hiddenAppt) {
      els.hiddenAppt.value = "";
      els.hiddenAppt.dispatchEvent(new Event("change", { bubbles: true }));
    }
    renderCalendar();
    updateSelectedDateLine();
    renderSlots();
    void refreshUnavailableForSelection();
  }

  function intervalsOverlap(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
  }

  function isoBusyIntervals(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((x) => {
        const start = x.start ?? x.Start;
        const end = x.end ?? x.End;
        if (!start || !end) return null;
        const s = new Date(String(start)).getTime();
        const e = new Date(String(end)).getTime();
        if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
        const kind = x.kind ?? x.type ?? "booking";
        return { start: s, end: e, isBlock: kind === "block" };
      })
      .filter(Boolean);
  }

  async function fetchUnavailableIntervals(dateIso) {
    const sb = window.salonSupabaseClient;
    if (!sb || !dateIso) return [];
    const rpcName = TENANT_BOOKING?.subdomain
      ? "styld_tenant_get_unavailable_times_for_day"
      : "get_unavailable_times_for_day";
    const rpcArgs = TENANT_BOOKING?.subdomain
      ? { p_subdomain: TENANT_BOOKING.subdomain, p_date: dateIso }
      : { p_date: dateIso };
    const { data, error } = await sb.rpc(rpcName, rpcArgs);
    if (error) {
      console.warn("get_unavailable_times_for_day", error);
      if (TENANT_BOOKING) throw error;
      return [];
    }
    return isoBusyIntervals(data);
  }

  async function refreshUnavailableForSelection() {
    if (!selectedIsoDate || !getSelectedStyle() || getSelectedStyle().id === "other") {
      cachedUnavailable = [];
      availabilityLoadFailed = false;
      return;
    }
    try {
      cachedUnavailable = await fetchUnavailableIntervals(selectedIsoDate);
      availabilityLoadFailed = false;
    } catch (err) {
      console.warn("availability refresh failed", err);
      cachedUnavailable = [];
      availabilityLoadFailed = !!TENANT_BOOKING;
    }
    renderSlots();
  }

  async function ensureSlotStillAvailable(apptIso, durationMinutes) {
    if (!TENANT_BOOKING || !availability || !DT || !selectedIsoDate) return;
    const fresh = await fetchUnavailableIntervals(selectedIsoDate);
    const slotStart = DT.fromISO(apptIso, { zone: CFG.salonTimeZone });
    if (!slotStart.isValid) {
      throw new Error("Please choose a valid time slot.");
    }
    const cls = availability.classifySlot(slotStart, durationMinutes, fresh);
    if (cls.kind !== "open") {
      cachedUnavailable = fresh;
      renderSlots();
      throw new Error(cls.reason || "That time slot is no longer available. Please choose a different time.");
    }
    cachedUnavailable = fresh;
  }

  function generateSlotTimes(isoDate) {
    if (availability) return availability.generateSlotTimes(isoDate);
    return [];
  }

  function classifySlot(slotStart, durationMin) {
    if (availability) return availability.classifySlot(slotStart, durationMin, cachedUnavailable);
    return { kind: "full", reason: "Unavailable." };
  }

  function renderSlots() {
    if (!els.slotsWrap) return;
    els.slotsWrap.innerHTML = "";
    const style = getSelectedStyle();
    const dur = totalDurationMinutes();

    if (!style || style.id === "other") {
      if (els.styleGate) els.styleGate.hidden = false;
      return;
    }
    if (els.styleGate) els.styleGate.hidden = true;

    if (!selectedIsoDate || dur == null) {
      els.slotsWrap.innerHTML =
        '<p class="booking-slots-placeholder">Pick a date on the calendar to load times.</p>';
      return;
    }

    if (availabilityLoadFailed) {
      els.slotsWrap.innerHTML =
        '<p class="booking-slots-placeholder">Could not load availability. Refresh the page and try again.</p>';
      return;
    }

    const slots = generateSlotTimes(selectedIsoDate);
    const selMs =
      selectedSlotIso && DT.fromISO(selectedSlotIso).isValid ? DT.fromISO(selectedSlotIso).toMillis() : null;
    for (const st of slots) {
      const cls = classifySlot(st, dur);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-slot";
      btn.textContent = st.toFormat("h:mm a");
      if (cls.kind === "open") btn.classList.add("time-slot--open");
      else if (cls.kind === "limited") btn.classList.add("time-slot--limited");
      else btn.classList.add("time-slot--full");

      if (cls.kind !== "open") {
        btn.disabled = true;
        btn.title = cls.reason || "";
      } else {
        btn.addEventListener("click", () => {
          selectedSlotIso = st.toISO();
          if (els.hiddenAppt) {
            els.hiddenAppt.value = selectedSlotIso;
            els.hiddenAppt.dispatchEvent(new Event("change", { bubbles: true }));
          }
          if (els.hiddenDur) {
            els.hiddenDur.value = String(dur);
            els.hiddenDur.dispatchEvent(new Event("change", { bubbles: true }));
          }
          updateSelectedDateLine();
          renderSlots();
          renderPricing();
        });
      }

      if (selMs != null && Math.abs(st.toMillis() - selMs) < 500) {
        btn.classList.add("selected");
      }

      els.slotsWrap.appendChild(btn);
    }
  }

  // Styld platform fee — matches stripe-booking-pay and bookingServiceFee.ts
  const STYLD_PLATFORM_RATE = 0.01;
  function platformFeePayer() {
    return PAYMENT.platformFeePayer === "tenant" ? "tenant" : "client";
  }
  function computeChargeBreakdown(baseCents, payer, rate) {
    payer = payer || platformFeePayer();
    rate = rate == null ? STYLD_PLATFORM_RATE : rate;
    const base = Math.max(0, Math.round(baseCents));
    const platformProfitCents = Math.round(base * rate);
    if (base < 1) {
      return {
        chargeCents: 0,
        displayPlatformFeeCents: 0,
      };
    }
    if (payer === "tenant") {
      return {
        chargeCents: base,
        displayPlatformFeeCents: 0,
      };
    }
    const chargeCents = Math.round((base * (1 + rate) + 30) / (1 - 0.029));
    return {
      chargeCents: chargeCents,
      displayPlatformFeeCents: chargeCents - base,
    };
  }
  function computeServiceFee(depositDollars) {
    if (!depositDollars || depositDollars <= 0) return 0;
    const amountCents = Math.round(depositDollars * 100);
    return round2(computeChargeBreakdown(amountCents).displayPlatformFeeCents / 100);
  }
  function totalChargeWithFee(depositDollars) {
    if (!depositDollars || depositDollars <= 0) return 0;
    const amountCents = Math.round(depositDollars * 100);
    return round2(computeChargeBreakdown(amountCents).chargeCents / 100);
  }

  function onlineChargeForTotal(total, style) {
    const mode = paymentMode();
    if (mode === "in_person") return 0;
    if (mode === "full") return round2(total);

    let amount;
    if (PAYMENT.depositKind === "fixed") {
      amount = round2(Number(PAYMENT.depositValue) || 0);
    } else {
      const pct = Math.min(100, Math.max(0, Number(PAYMENT.depositValue) || 10));
      amount = round2(total * (pct / 100));
    }

    if (USE_LEGACY_DEPOSIT_RULES && style && isHouseStyleId(style.id)) {
      amount = round2(amount + 15);
    }

    if (depositIncludedInPrice()) {
      return round2(Math.min(total, amount));
    }
    return round2(Math.max(0, amount));
  }

  function wantsOnlinePayment() {
    const { deposit, mode } = computeTotals();
    if (mode === "in_person") return false;
    const cents = Math.round(Number(deposit || 0) * 100);
    return cents >= MIN_ONLINE_PAYMENT_CENTS;
  }

  function needsOnlinePayment() {
    return wantsOnlinePayment() && !!window.__STYLD_STRIPE_READY__;
  }

  function merchantPaymentsNotReady() {
    return wantsOnlinePayment() && !window.__STYLD_STRIPE_READY__;
  }

  function computeTotals() {
    const style = getSelectedStyle();
    const base = effectiveStyleBase(style);
    const lengthUsd = hairLengthAddonUsd();
    const addonUsd = styleAddonUsd();

    const rawSubtotal = Math.max(0, round2(base + lengthUsd + addonUsd + productsSubtotalUsd()));
    const rawSubtotalCents = Math.round(rawSubtotal * 100);

    if (appliedPromo && appliedPromo.subtotalCents !== rawSubtotalCents) {
      appliedPromo = null;
      if (els.promoApplied) {
        els.promoApplied.hidden = true;
        els.promoApplied.textContent = "";
      }
      if (els.promoFeedback) {
        els.promoFeedback.hidden = true;
        els.promoFeedback.textContent = "";
      }
    }

    const promoDiscountUsd = appliedPromo ? appliedPromo.discountUsd : 0;
    const travelFee = isTravelBooking() && travelFeeUsd > 0 ? travelFeeUsd : 0;
    const total = Math.max(0, round2(rawSubtotal - promoDiscountUsd + travelFee));
    const pctDeposit = round2(total * 0.1);
    const houseFee = style && isHouseStyleId(style.id) ? 15 : 0;
    const deposit = onlineChargeForTotal(total, style);
    const included = depositIncludedInPrice();
    const balanceDue = included ? round2(Math.max(0, total - deposit)) : total;

    return {
      base,
      lengthUsd,
      addonUsd,
      subtotal: base,
      rawSubtotal,
      rawSubtotalCents,
      promoDiscountUsd,
      productsSubtotalUsd: productsSubtotalUsd(),
      total,
      deposit,
      balanceDue,
      pctDeposit,
      houseFee,
      travelFee,
      style,
      mode: paymentMode(),
    };
  }

  function renderPricing() {
    const {
      base,
      lengthUsd,
      addonUsd,
      rawSubtotal,
      promoDiscountUsd,
      total,
      deposit,
      balanceDue,
      pctDeposit,
      houseFee,
      travelFee,
      style,
      mode,
    } = computeTotals();
    const dur = totalDurationMinutes();
    const online = needsOnlinePayment();
    const hasPricedStyle = !!(style && style.id !== "other");
    const isHouseBooking = houseFee > 0 && USE_LEGACY_DEPOSIT_RULES;

    if (els.durationStrip) {
      if (!style || style.id === "other") {
        els.durationStrip.textContent = "ESTIMATED DURATION TBD";
      } else {
        els.durationStrip.textContent = "ESTIMATED DURATION: " + formatDurationHuman(dur);
      }
    }

    if (els.subtotalOut) els.subtotalOut.textContent = money(base);
    if (els.lengthAddonOut) els.lengthAddonOut.textContent = lengthUsd > 0 ? money(lengthUsd) : "—";
    if (els.styleAddonOut) els.styleAddonOut.textContent = addonUsd > 0 ? money(addonUsd) : "—";
    if (els.styleAddonRow) els.styleAddonRow.hidden = !(addonUsd > 0);
    if (els.lineTravelFeeRow) els.lineTravelFeeRow.hidden = !(travelFee > 0);
    if (els.sideTravelFeeRow) els.sideTravelFeeRow.hidden = !(travelFee > 0);
    if (els.lineTravelFee) els.lineTravelFee.textContent = travelFee > 0 ? money(travelFee) : "—";
    if (els.sideTravelFee) els.sideTravelFee.textContent = travelFee > 0 ? money(travelFee) : "—";
    updateTravelFeePreview();

    const serviceFee = mode !== "in_person" ? computeServiceFee(deposit) : 0;
    const chargeTotal = mode !== "in_person" ? totalChargeWithFee(deposit) : 0;
    const showOnlineBreakdown = mode !== "in_person" && deposit > 0;
    var included = depositIncludedInPrice();
    var isDepositMode = mode === "deposit" && showOnlineBreakdown;
    var displayTotalAmount = isDepositMode ? (included ? balanceDue : total) : total;
    var displayTotalLabel = isDepositMode
      ? included
        ? "Balance at appointment"
        : "Due at appointment"
      : mode === "in_person"
        ? "Due at appointment"
        : "Estimated total";

    if (els.totalOut) els.totalOut.textContent = money(displayTotalAmount);
    if (els.lineTotalLabel) els.lineTotalLabel.textContent = displayTotalLabel + ":";

    if (els.depositBaseOut) els.depositBaseOut.textContent = money(deposit);
    if (els.depositBaseRow) els.depositBaseRow.hidden = !showOnlineBreakdown;
    if (els.serviceFeeOut) els.serviceFeeOut.textContent = money(serviceFee);
    if (els.serviceFeeRow) els.serviceFeeRow.hidden = !(showOnlineBreakdown && serviceFee > 0);
    if (els.chargeTotalOut) els.chargeTotalOut.textContent = money(chargeTotal);
    if (els.chargeTotalRow) els.chargeTotalRow.hidden = !showOnlineBreakdown;
    if (els.inPersonDueOut) els.inPersonDueOut.textContent = money(total);
    if (els.inPersonDueRow) els.inPersonDueRow.hidden = mode !== "in_person" || !hasPricedStyle;

    const onlineLabel = mode === "full" ? "Due when booking:" : "Deposit:";
    if (els.lineOnlineLabel) els.lineOnlineLabel.textContent = onlineLabel;
    if (els.sideOnlineLabel) {
      els.sideOnlineLabel.textContent = mode === "full" ? "Due when booking" : "Deposit";
    }

    if (els.sideDepositRow) els.sideDepositRow.hidden = !showOnlineBreakdown;
    if (els.sideDeposit) els.sideDeposit.textContent = money(deposit);
    if (els.sideServiceFee) els.sideServiceFee.textContent = money(serviceFee);
    if (els.sideServiceFeeRow) els.sideServiceFeeRow.hidden = !(showOnlineBreakdown && serviceFee > 0);
    if (els.sideChargeTotal) els.sideChargeTotal.textContent = money(chargeTotal);
    if (els.sideChargeTotalRow) els.sideChargeTotalRow.hidden = !showOnlineBreakdown;
    if (els.sideBalanceDue) els.sideBalanceDue.textContent = money(balanceDue);
    if (els.sideBalanceRow) {
      els.sideBalanceRow.hidden = true;
    }
    if (els.sideInPersonDue) els.sideInPersonDue.textContent = money(total);
    if (els.sideInPersonRow) els.sideInPersonRow.hidden = mode !== "in_person" || !hasPricedStyle;

    if (els.depositDetailOut) {
      const feeNote = serviceFee > 0 ? ` Includes ${money(serviceFee)} platform fee.` : "";
      if (!hasPricedStyle) {
        els.depositDetailOut.textContent = "";
      } else if (mode === "in_person") {
        els.depositDetailOut.textContent =
          balanceDue > 0
            ? `Estimated total ${money(total)} — pay in person at your appointment.`
            : "";
      } else if (mode === "full") {
        els.depositDetailOut.textContent =
          `Pay ${money(totalChargeWithFee(deposit))} online to secure your appointment (includes ${money(serviceFee)} platform fee). Final price may be adjusted after consultation.`;
      } else if (USE_LEGACY_DEPOSIT_RULES && isHouseBooking) {
        let detail = `Includes ${money(pctDeposit)} (10% of your estimate) plus ${money(15)} house-call deposit.${feeNote} `;
        detail += `Remaining balance ${money(balanceDue)} due in person at your appointment. All deposits are non-refundable.`;
        els.depositDetailOut.textContent = detail;
      } else if (!included) {
        els.depositDetailOut.textContent =
          `${money(totalChargeWithFee(deposit))} due now (additional hold${feeNote}). Full service price ${money(total)} due in person at your appointment.`;
      } else if (PAYMENT.depositKind === "fixed") {
        els.depositDetailOut.textContent =
          `${money(totalChargeWithFee(deposit))} due now (includes ${money(serviceFee)} platform fee). Remaining balance ${money(balanceDue)} due in person at your appointment.`;
      } else {
        const pct = Math.min(100, Math.max(0, Number(PAYMENT.depositValue) || 10));
        els.depositDetailOut.textContent =
          `${money(totalChargeWithFee(deposit))} due now — ${money(deposit)} deposit (${pct}% of estimate) + ${money(serviceFee)} platform fee. Remaining balance ${money(balanceDue)} due at appointment.`;
      }
    }

    if (els.sideSubtotal) els.sideSubtotal.textContent = money(base);
    if (els.sideLengthAddon) els.sideLengthAddon.textContent = lengthUsd > 0 ? money(lengthUsd) : "—";
    if (els.sideStyleAddon) els.sideStyleAddon.textContent = addonUsd > 0 ? money(addonUsd) : "—";
    if (els.sideStyleAddonRow) els.sideStyleAddonRow.hidden = !(addonUsd > 0);
    var productsUsd = productsSubtotalUsd();
    var sideProductsRow = document.getElementById("side-products-row");
    var sideProductsSubtotal = document.getElementById("side-products-subtotal");
    if (sideProductsRow) sideProductsRow.hidden = !(productsUsd > 0);
    if (sideProductsSubtotal) sideProductsSubtotal.textContent = money(productsUsd);
    if (els.sidePromoRow) els.sidePromoRow.hidden = !(promoDiscountUsd > 0);
    if (els.sidePromoDiscount) {
      els.sidePromoDiscount.textContent = promoDiscountUsd > 0 ? "−" + money(promoDiscountUsd) : "—";
    }
    if (els.sideTotal) els.sideTotal.textContent = money(displayTotalAmount);
    if (els.sideTotalLabel) els.sideTotalLabel.textContent = displayTotalLabel;
    if (els.sideDepositExcludedNote) {
      els.sideDepositExcludedNote.hidden = !isDepositMode;
      if (isDepositMode) {
        els.sideDepositExcludedNote.textContent = included
          ? "Your deposit counts toward your service total."
          : "Deposit is an additional hold fee and is not deducted from your service price.";
      }
    }
    if (els.lineDepositExcludedNote) {
      els.lineDepositExcludedNote.hidden = !isDepositMode;
      if (isDepositMode) {
        els.lineDepositExcludedNote.textContent = included
          ? "Your deposit counts toward your service total."
          : "Deposit is an additional hold fee and is not deducted from your service price.";
      }
    }

    if (els.depositNoteInPerson) {
      els.depositNoteInPerson.hidden = !hasPricedStyle || mode !== "in_person";
    }
    if (els.depositNoteStudio) {
      els.depositNoteStudio.hidden = !hasPricedStyle || mode !== "deposit" || isHouseBooking;
    }
    if (els.depositNoteHouseCall) {
      els.depositNoteHouseCall.hidden = !hasPricedStyle || !isHouseBooking;
    }

    if (els.depositPolicyAlert) {
      if (!hasPricedStyle) {
        els.depositPolicyAlert.textContent =
          mode === "in_person"
            ? "Final price may be adjusted after consultation. Pay in person at your appointment."
            : "Final price may be adjusted after consultation.";
      } else if (mode === "in_person") {
        els.depositPolicyAlert.textContent =
          `No online payment required. Estimated total ${money(total)} — pay in person when you arrive.`;
      } else if (mode === "full") {
        els.depositPolicyAlert.textContent =
          "Full payment online secures your appointment. Final price may be adjusted after consultation.";
      } else if (TENANT_BOOKING && CANCELLATION_POLICY.policySummary) {
        els.depositPolicyAlert.textContent = String(CANCELLATION_POLICY.policySummary).trim();
      } else if (isHouseBooking) {
        els.depositPolicyAlert.textContent =
          "Deposits are non-refundable (including style portion and house-call deposit). Balance due in person at your appointment.";
      } else {
        els.depositPolicyAlert.textContent =
          `Deposit due online now; remaining balance ${money(balanceDue)} due in person at your appointment. Deposits are non-refundable.`;
      }
    }

    var policySummaryText = String(CANCELLATION_POLICY.policySummary || "").trim();

    if (els.sideDepositNote) {
      if (mode === "in_person") {
        els.sideDepositNote.textContent = "Pay in person at your appointment.";
      } else if (mode === "full") {
        els.sideDepositNote.textContent = "Full price charged when you book.";
      } else if (isHouseBooking) {
        els.sideDepositNote.textContent =
          "10% style deposit plus $15 for house calls. Balance due in person.";
      } else if (TENANT_BOOKING && policySummaryText) {
        els.sideDepositNote.textContent =
          balanceDue > 0 && mode === "deposit"
            ? `Balance ${money(balanceDue)} due in person at your appointment.`
            : "";
        els.sideDepositNote.hidden = !els.sideDepositNote.textContent;
      } else {
        els.sideDepositNote.textContent = `Balance ${money(balanceDue)} due in person at your appointment.`;
        els.sideDepositNote.hidden = false;
      }
    }

    if (els.sideCancellationPolicyWrap && els.sideCancellationPolicy) {
      var showSidePolicy = TENANT_BOOKING && !!policySummaryText && hasPricedStyle;
      els.sideCancellationPolicyWrap.hidden = !showSidePolicy;
      els.sideCancellationPolicy.textContent = showSidePolicy ? policySummaryText : "";
    }

    const complete = isFormCompleteForBooking();
    const paymentsBlocked = merchantPaymentsNotReady();
    const showPayment = complete && online;
    const showPromo = complete && hasPricedStyle;
    const showTenantPolicy = TENANT_BOOKING && !!policySummaryText && hasPricedStyle;
    const policySection = document.getElementById("cancellation-policy-section");
    const policyText = document.getElementById("cancellation-policy-text");
    if (policySection) {
      policySection.classList.toggle("hidden", !showTenantPolicy);
      policySection.setAttribute("aria-hidden", showTenantPolicy ? "false" : "true");
    }
    if (policyText) {
      policyText.textContent = policySummaryText;
    }
    if (els.paymentBox) {
      els.paymentBox.classList.toggle("hidden", !showPayment && !paymentsBlocked);
      els.paymentBox.setAttribute(
        "aria-hidden",
        showPayment || paymentsBlocked ? "false" : "true",
      );
    }
    if (els.promoSection) {
      els.promoSection.classList.toggle("hidden", !showPromo);
      els.promoSection.setAttribute("aria-hidden", showPromo ? "false" : "true");
    }

    var paymentsBlockedEl = document.getElementById("payments-not-ready");
    if (!paymentsBlockedEl && els.paymentBox) {
      paymentsBlockedEl = document.createElement("p");
      paymentsBlockedEl.id = "payments-not-ready";
      paymentsBlockedEl.className = "booking-feedback booking-feedback--error";
      paymentsBlockedEl.hidden = true;
      els.paymentBox.insertBefore(paymentsBlockedEl, els.paymentBox.firstChild?.nextSibling || null);
    }
    if (paymentsBlockedEl) {
      paymentsBlockedEl.hidden = !paymentsBlocked;
      paymentsBlockedEl.textContent = paymentsBlocked
        ? "Online payments are not active for this business yet. The owner must connect a payment account in the Styld app (Profile → Payments), or you can contact them to book another way."
        : "";
    }

    const cardTrust = document.getElementById("payment-card-trust");
    if (cardTrust) {
      cardTrust.hidden = !showPayment;
      cardTrust.textContent = showPayment
        ? mode === "full"
          ? "Pay the full estimated price securely with your card."
          : "Pay your deposit securely with your card."
        : "";
    }

    const payDepositBase = document.getElementById("pay-deposit-base");
    const payDepositBaseRow = document.getElementById("pay-deposit-base-row");
    const payServiceFee = document.getElementById("pay-service-fee");
    const payServiceFeeRow = document.getElementById("pay-service-fee-row");
    const depOut = document.getElementById("pay-deposit-preview");
    if (payDepositBase) payDepositBase.textContent = money(deposit);
    if (payDepositBaseRow) payDepositBaseRow.hidden = !showOnlineBreakdown;
    if (payServiceFee) payServiceFee.textContent = money(serviceFee);
    if (payServiceFeeRow) payServiceFeeRow.hidden = !(showOnlineBreakdown && serviceFee > 0);
    if (depOut) depOut.textContent = mode === "in_person" ? "$0.00" : money(chargeTotal);

    if (els.submitBtn) {
      els.submitBtn.textContent = online
        ? mode === "full"
          ? "Pay full price & book"
          : "Pay deposit & book"
        : "Book appointment";
    }

    if (!showPayment) {
      clearStripePaymentState();
      if (!complete) pendingBookingId = "";
    } else {
      initStripeCardElement();
    }
  }

  function applyBookingFormOptions() {
    const requireHair = PAYMENT.requireCurrentHairPhoto !== false;
    const requireRef = PAYMENT.requireReferencePhoto === true;
    const hairLabel = document.querySelector('label[for="photo-hair"]');
    const refLabel = document.querySelector('label[for="photo-ref"]');

    if (els.photoHair) {
      if (requireHair) els.photoHair.setAttribute("required", "");
      else els.photoHair.removeAttribute("required");
    }
    if (hairLabel) {
      hairLabel.textContent = requireHair ? "Current hair photo *" : "Current hair photo (optional)";
    }

    if (els.photoRef) {
      if (requireRef) els.photoRef.setAttribute("required", "");
      else els.photoRef.removeAttribute("required");
    }
    if (refLabel) {
      refLabel.textContent = requireRef ? "Reference image *" : "Reference image (optional)";
    }
  }

  function isFormCompleteForBooking() {
    const style = getSelectedStyle();
    const name = document.getElementById("full-name")?.value?.trim();
    const phone = document.getElementById("phone")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const photoHairOk = PAYMENT.requireCurrentHairPhoto === false || els.photoHair?.files?.length > 0;
    const photoRefOk = !PAYMENT.requireReferencePhoto || els.photoRef?.files?.length > 0;
    const slotOk = !!(els.hiddenAppt?.value && style && style.id !== "other");
    const needTravelAddr = isTravelBooking();
    const addrOk = !needTravelAddr || isTravelAddressComplete();
    return !!(
      style &&
      style.id !== "other" &&
      name &&
      phone &&
      email &&
      photoHairOk &&
      photoRefOk &&
      slotOk &&
      addrOk
    );
  }

  function initStripeCardElement() {
    const stripe = window.__STYLD_STRIPE__;
    if (!stripe || stripeElementsMounted) return;

    const container = document.getElementById("stripe-card-element");
    if (!container) return;

    const elements = stripe.elements();
    stripeCardElement = elements.create("card", {
      style: {
        base: {
          fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif",
          fontSize: "16px",
          color: "#1a1a1a",
          "::placeholder": { color: "#aab7c4" },
        },
        invalid: { color: "#e53e3e" },
      },
    });
    stripeCardElement.mount(container);
    stripeCardElement.on("change", function (event) {
      setStripeCardError(event.error ? event.error.message : "");
    });
    stripeElementsMounted = true;
  }

  function getSupabaseEdgeCfg() {
    if (window.__SALON_SITE_SUPABASE && window.__SALON_SITE_SUPABASE.url && window.__SALON_SITE_SUPABASE.anonKey) {
      return window.__SALON_SITE_SUPABASE;
    }
    var tenant = window.__STYLD_TENANT__;
    if (tenant && tenant.supabaseUrl && tenant.supabaseAnonKey) {
      return { url: tenant.supabaseUrl, anonKey: tenant.supabaseAnonKey };
    }
    return null;
  }

  async function invokeBookingEdgeFunction(name, body) {
    var cfg = getSupabaseEdgeCfg();
    if (!cfg) throw new Error("Site payment configuration is missing.");
    var url = cfg.url.replace(/\/$/, "") + "/functions/v1/" + name;
    var res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.anonKey,
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    var data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      throw new Error((data && (data.error || data.message)) || res.statusText || "Payment request failed");
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  function setPromoFeedback(message, kind) {
    if (!els.promoFeedback) return;
    els.promoFeedback.hidden = !message;
    els.promoFeedback.textContent = message || "";
    els.promoFeedback.classList.remove("booking-feedback--error", "booking-feedback--promo-ok");
    if (message && kind === "error") els.promoFeedback.classList.add("booking-feedback--error");
    if (message && kind === "ok") els.promoFeedback.classList.add("booking-feedback--promo-ok");
  }

  async function applyPromoCode() {
    const raw = (els.promoInput?.value || "").trim();
    if (!raw) {
      setPromoFeedback("Enter a promo code.", "error");
      return;
    }

    const { rawSubtotalCents, style } = computeTotals();
    if (!style || style.id === "other" || rawSubtotalCents < 1) {
      setPromoFeedback("Choose a service first.", "error");
      return;
    }

    const subdomain = getBookingSubdomain();
    if (!subdomain) {
      setPromoFeedback("Could not verify promo code.", "error");
      return;
    }

    if (promoValidating) return;
    promoValidating = true;
    if (els.promoApplyBtn) {
      els.promoApplyBtn.disabled = true;
      els.promoApplyBtn.textContent = "Checking…";
    }

    try {
      const data = await invokeBookingEdgeFunction("validate-booking-promo", {
        subdomain,
        code: raw,
        subtotalCents: rawSubtotalCents,
      });

      if (!data || !data.ok) {
        appliedPromo = null;
        setPromoFeedback((data && data.message) || "That promo code is not valid.", "error");
        if (els.promoApplied) {
          els.promoApplied.hidden = true;
          els.promoApplied.textContent = "";
        }
        renderPricing();
        return;
      }

      const discountCents = data.discountCents || 0;
      appliedPromo = {
        code: data.code || raw.toUpperCase(),
        discountUsd: round2(discountCents / 100),
        discountCents,
        subtotalCents: rawSubtotalCents,
      };
      setPromoFeedback("", null);
      if (els.promoApplied) {
        els.promoApplied.hidden = false;
        els.promoApplied.textContent =
          appliedPromo.code + " applied — you save " + money(appliedPromo.discountUsd) + ".";
      }
      renderPricing();
    } catch (err) {
      appliedPromo = null;
      setPromoFeedback(err.message || "Could not validate promo code.", "error");
      if (els.promoApplied) {
        els.promoApplied.hidden = true;
        els.promoApplied.textContent = "";
      }
      renderPricing();
    } finally {
      promoValidating = false;
      if (els.promoApplyBtn) {
        els.promoApplyBtn.disabled = false;
        els.promoApplyBtn.textContent = "Apply";
      }
    }
  }

  async function confirmBookingPayment(payload) {
    var lastError = "Could not confirm payment with your booking.";
    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        var data = await invokeBookingEdgeFunction("stripe-booking-confirm", {
          bookingId: payload.bookingId,
          subdomain: payload.subdomain,
          paymentIntentId: payload.paymentIntentId,
        });
        if (data && data.ok && data.verified) return null;
        if (data && typeof data.error === "string") lastError = data.error;
      } catch (e) {
        lastError = e && e.message ? String(e.message) : lastError;
      }
      if (attempt < 3) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 400 * attempt);
        });
      }
    }
    return lastError;
  }

  async function payBookingWithStripe(sb, payload) {
    const stripe = window.__STYLD_STRIPE__;
    if (!stripe || !stripeCardElement) {
      return { ok: false, error: "Card form not ready. Please refresh and try again." };
    }

    // Step 1: Create a PaymentIntent on the backend (returns clientSecret).
    // The backend routes the charge to the site owner's connected account.
    var piData;
    try {
      piData = await invokeBookingEdgeFunction("stripe-booking-pay", {
        amountCents: payload.amountCents,
        subtotalCents: payload.subtotalCents,
        promoCode: payload.promoCode || null,
        houseCallExtraCents: payload.houseCallExtraCents || 0,
        subdomain: payload.subdomain,
        bookingId: payload.bookingId,
        customerEmail: payload.customerEmail,
        customerName: payload.customerName,
      });
    } catch (paySetupErr) {
      return { ok: false, error: paySetupErr.message || "Payment setup failed." };
    }

    if (!piData || !piData.clientSecret) {
      return { ok: false, error: (piData && piData.error) || "Payment setup failed." };
    }

    // Step 2: Confirm the payment client-side using the card element.
    // This creates and attaches the PaymentMethod in one step, avoiding
    // any mismatch between the PM owner and the account being charged.
    var confirmResult = await stripe.confirmCardPayment(piData.clientSecret, {
      payment_method: {
        card: stripeCardElement,
        billing_details: {
          name: payload.customerName || "",
          email: payload.customerEmail || "",
        },
      },
    });

    if (confirmResult.error) {
      return { ok: false, error: confirmResult.error.message || "Card was declined." };
    }

    var intent = confirmResult.paymentIntent;
    var success = intent && intent.status === "succeeded";

    // Mark the booking as paid in the DB before redirecting.
    // Must be awaited — fire-and-forget gets cancelled when the page navigates away.
    if (success && intent.id && payload.bookingId && payload.subdomain) {
      var confirmError = await confirmBookingPayment({
        bookingId: payload.bookingId,
        subdomain: payload.subdomain,
        paymentIntentId: intent.id,
      });
      if (confirmError) {
        return { ok: false, error: confirmError, paymentId: intent.id, status: intent.status };
      }
    }

    return { ok: !!success, paymentId: intent && intent.id, status: intent && intent.status };
  }

  function buildBookingDetailsUrl(params) {
    const url = new URL("booking-details.html", window.location.href);
    if (params instanceof URLSearchParams) {
      url.search = params.toString();
    }
    return url.href;
  }

  function buildBookingSuccessUrl(params) {
    const url = new URL("booking-success.html", window.location.href);
    if (params instanceof URLSearchParams) {
      url.search = params.toString();
    }
    return url.href;
  }

  async function invokeNotifySalon(sb, body) {
    try {
      const { error } = await sb.functions.invoke("notify-salon", { body });
      if (error) console.warn("notify-salon:", error);
    } catch (err) {
      console.warn("notify-salon:", err);
    }
  }

  function setBookingFeedback(message, kind) {
    const el = els.feedback;
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.remove("booking-feedback--error", "booking-feedback--success");
    if (message && kind === "error") el.classList.add("booking-feedback--error");
    if (message && kind === "success") el.classList.add("booking-feedback--success");
  }

  function readPaidReturnParams() {
    const p = new URLSearchParams(window.location.search);
    if (p.get("paid") !== "1") return;
    const bookingId = (p.get("booking_id") || "").trim();
    if (!bookingId) return;
    try {
      sessionStorage.setItem(DETAILS_BOOKING_KEY, bookingId);
    } catch (_) {
      /* ignore */
    }
    const q = new URLSearchParams();
    q.set("booking_id", bookingId);
    q.set("paid", "1");
    window.location.replace(buildBookingDetailsUrl(q));
  }

  function bookingPhotoFileExtension(file) {
    const name = String(file?.name || "");
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1) {
      return name.slice(dot).toLowerCase();
    }
    return ".jpg";
  }

  function bookingPhotoStoragePrefix(bookingId) {
    const subdomain = getBookingSubdomain();
    if (!subdomain) return String(bookingId);
    return `${subdomain}/${bookingId}`;
  }

  function saveLocalBooking(row) {
    try {
      const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(list) ? list : [];
      next.unshift({
        ...row,
        id: row.id || crypto.randomUUID(),
        created_at: row.created_at || new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(next.slice(0, 500)));
    } catch (e) {
      console.warn("Local booking save failed:", e);
    }
  }

  async function uploadBookingFiles(sb, bookingId, hairFile, refFile) {
    const out = {
      photo_hair_path: null,
      photo_ref_path: null,
      current_hair_photo_path: null,
      reference_photo_path: null,
    };
    if (!hairFile && !refFile) return out;

    const prefix = bookingPhotoStoragePrefix(bookingId);

    const uploadOne = async (file, baseName) => {
      const path = `${prefix}/${baseName}${bookingPhotoFileExtension(file)}`;
      const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      return path;
    };

    if (hairFile) {
      const path = await uploadOne(hairFile, "current-hair");
      out.photo_hair_path = path;
      out.current_hair_photo_path = path;
    }
    if (refFile) {
      const path = await uploadOne(refFile, "reference");
      out.photo_ref_path = path;
      out.reference_photo_path = path;
    }
    return out;
  }

  function appointmentSlotLabelFromIso(iso) {
    if (!iso || !DT) return "";
    const t = DT.fromISO(iso, { zone: CFG.salonTimeZone });
    return t.toFormat("h:mm a");
  }

  function appointmentDateFromIso(iso) {
    if (!iso || !DT) return "";
    return DT.fromISO(iso, { zone: CFG.salonTimeZone }).toFormat("yyyy-MM-dd");
  }

  function resolveBookingStatus(payInPerson, paidOnline) {
    if (!paidOnline && !payInPerson) return "pending_payment";
    if (requiresBookingApproval()) return "pending_approval";
    return "confirmed";
  }

  function buildRowPayload(bookingId, paths, apptIso, durationMinutes, unitPaymentId, options) {
    options = options || {};
    const style = getSelectedStyle();
    const notes = document.getElementById("notes")?.value?.trim() || null;
    const addon = getSelectedStyleAddon();
    const variant = getSelectedStyleVariant();
    const { total, deposit, mode, rawSubtotal, promoDiscountUsd, travelFee } = computeTotals();
    const orderProducts = getSelectedOrderProducts();
    const productsSubtotal = productsSubtotalUsd();
    const payInPerson = mode === "in_person";
    const paidOnline = options.paidOnline === true;

    const service_address =
      isTravelBooking() && isTravelAddressComplete() ? formatTravelAddressForStorage() : null;

    var styleName = style.name;
    if (variant) styleName = style.name + " — " + variant.label;
    if (addon) styleName = styleName + " + " + addon.name;

    return {
      id: bookingId,
      full_name: document.getElementById("full-name")?.value?.trim(),
      phone: document.getElementById("phone")?.value?.trim(),
      email: document.getElementById("email")?.value?.trim(),
      style_id: style.id,
      style_name: styleName,
      selected_variant_id: variant ? variant.id : null,
      selected_variant_label: variant ? variant.label : null,
      selected_variant_price: variant ? variant.price : 0,
      selected_addon_id: addon ? addon.id : null,
      selected_addon_name: addon ? addon.name : null,
      selected_addon_price: addon ? addon.price : 0,
      service_address,
      is_travel_booking: isTravelBooking(),
      travel_fee_usd: travelFee > 0 ? travelFee : 0,
      travel_distance_miles: travelDistanceMiles,
      travel_extra_minutes: isTravelBooking() ? TRAVEL.extraTravelMinutes || 0 : 0,
      hair_option: "catalog",
      prewash: "None",
      appointment_date: appointmentDateFromIso(apptIso),
      appointment_slot: appointmentSlotLabelFromIso(apptIso),
      appointment_starts_at: apptIso,
      duration_minutes: durationMinutes,
      booking_status: resolveBookingStatus(payInPerson, paidOnline),
      notes,
      promo_code: appliedPromo?.code ?? null,
      promo_discount_amount: promoDiscountUsd > 0 ? promoDiscountUsd : 0,
      subtotal_before_promo: rawSubtotal,
      order_products: orderProducts,
      products_subtotal: productsSubtotal,
      fulfillment_method: orderProducts.length ? "at_appointment" : null,
      shipping_amount: 0,
      estimated_total: total,
      deposit_amount: payInPerson ? 0 : deposit,
      payment_status: payInPerson ? "in_person" : paidOnline ? "deposit_paid" : "pending",
      source: "website",
      google_calendar_id: GCAL.calendarId || null,
      pricing_situation: "catalog",
      unit_payment_id: unitPaymentId || null,
      stripe_payment_intent_id: unitPaymentId || null,
      ...paths,
    };
  }

  async function uploadBookingPhotosForRequest(sb, bookingId) {
    const hairFile = els.photoHair?.files?.[0];
    const refFile = els.photoRef?.files?.[0] || null;
    try {
      return await uploadBookingFiles(sb, bookingId, hairFile, refFile);
    } catch (uploadErr) {
      console.warn(uploadErr);
      throw new Error(
        "Your hair photo could not be uploaded. Please check your connection and try again.",
      );
    }
  }

  async function submitBookingRequest(sb, apptIso, durationMinutes, bookingId, unitPaymentId, options) {
    options = options || {};
    const style = getSelectedStyle();
    if (!style || style.id === "other") throw new Error("Choose a priced style to book.");
    if (getStyleVariantsForStyle(style).length && !getSelectedStyleVariant()) {
      throw new Error("Choose a version for this service.");
    }

    const paths =
      options.paths || (await uploadBookingPhotosForRequest(sb, bookingId));

    const row = buildRowPayload(bookingId, paths, apptIso, durationMinutes, unitPaymentId, options);

    if (TENANT_BOOKING?.subdomain) {
      const { data: tenantId, error: tenantErr } = await sb.rpc("styld_tenant_insert_booking", {
        p_subdomain: TENANT_BOOKING.subdomain,
        p_booking: row,
      });
      if (tenantErr) {
        // Surface conflict errors clearly — the server detected a double-booking
        const msg = tenantErr.message || "";
        if (msg.includes("no longer available") || msg.includes("blocked")) {
          throw new Error(msg);
        }
        throw tenantErr;
      }
      const id = tenantId || row.id;
      if (!id) throw new Error("No booking id returned");
      return { id, paths };
    }

    const { data, error } = await sb.from("bookings").insert(row).select("id").single();
    if (error) throw error;
    const id = data?.id;
    if (!id) throw new Error("No booking id returned");
    return { id, paths };
  }

  function bindFilePreview(input, previewEl) {
    if (!input || !previewEl) return;
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      previewEl.textContent = f ? `Selected: ${f.name}` : "";
      renderPricing();
    });
  }

  function bindForm() {
    [
      els.hairLength,
      document.getElementById("full-name"),
      document.getElementById("phone"),
      document.getElementById("email"),
      els.houseAddrStreet,
      els.houseAddrUnit,
      els.houseAddrCity,
      els.houseAddrState,
      els.houseAddrZip,
      els.travelAddrStreet,
      els.travelAddrUnit,
      els.travelAddrCity,
      els.travelAddrState,
      els.travelAddrZip,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.addEventListener("input", () => {
          renderPricing();
          renderSlots();
          void refreshUnavailableForSelection();
          if (
            el === els.travelAddrStreet ||
            el === els.travelAddrUnit ||
            el === els.travelAddrCity ||
            el === els.travelAddrState ||
            el === els.travelAddrZip ||
            el === els.houseAddrStreet ||
            el === els.houseAddrUnit ||
            el === els.houseAddrCity ||
            el === els.houseAddrState ||
            el === els.houseAddrZip
          ) {
            scheduleTravelFeeRecalc();
          }
        });
        el.addEventListener("change", () => {
          renderPricing();
          renderSlots();
          void refreshUnavailableForSelection();
          if (
            el === els.travelAddrStreet ||
            el === els.travelAddrUnit ||
            el === els.travelAddrCity ||
            el === els.travelAddrState ||
            el === els.travelAddrZip ||
            el === els.houseAddrStreet ||
            el === els.houseAddrUnit ||
            el === els.houseAddrCity ||
            el === els.houseAddrState ||
            el === els.houseAddrZip
          ) {
            scheduleTravelFeeRecalc();
          }
        });
      });

    if (els.travelRequestToggle) {
      els.travelRequestToggle.addEventListener("change", () => {
        syncBookingDependentFields();
        renderSlots();
        void refreshUnavailableForSelection();
      });
    }

    if (els.styleSelect) {
      const onStyleFields = () => {
        syncBookingDependentFields();
        renderSlots();
        void refreshUnavailableForSelection();
      };
      els.styleSelect.addEventListener("input", onStyleFields);
      els.styleSelect.addEventListener("change", () => {
        onStyleFields();
        void refreshBookingDatesOccupied().then(() => {
          const st = getSelectedStyle();
          if (
            selectedIsoDate &&
            st &&
            isHouseStyleId(st.id) &&
            datesWithBookings.has(selectedIsoDate)
          ) {
            selectedIsoDate = null;
            selectedSlotIso = null;
            if (els.hiddenAppt) els.hiddenAppt.value = "";
          }
          renderCalendar();
          updateSelectedDateLine();
        });
      });
    }

    if (els.calPrev) els.calPrev.addEventListener("click", () => navigateMonth(-1));
    if (els.calNext) els.calNext.addEventListener("click", () => navigateMonth(1));

    if (els.promoApplyBtn) {
      els.promoApplyBtn.addEventListener("click", function () {
        void applyPromoCode();
      });
    }
    if (els.promoInput) {
      els.promoInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          void applyPromoCode();
        }
      });
    }

    if (els.form) {
      els.form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setBookingFeedback("", null);

        const apptIso = els.hiddenAppt?.value?.trim();
        const durStr = els.hiddenDur?.value?.trim();
        let durationMinutes = durStr ? parseInt(durStr, 10) : totalDurationMinutes();
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = totalDurationMinutes();

        if (!isFormCompleteForBooking() || !apptIso) {
          const st = getSelectedStyle();
          if (st && isTravelBooking() && !isTravelAddressComplete()) {
            alert(
              "Travel bookings need a full address: street, city, state (2 letters), and ZIP. Please complete each field.",
            );
            return;
          }
          if (st && isTravelBooking() && TRAVEL.feeMode === "per_mile" && TRAVEL.perMileRateUsd > 0 && travelFeeStatus !== "ready") {
            alert("Please wait for the travel fee to finish calculating, or check your address.");
            return;
          }
          alert("Please complete all required fields, choose a style, upload any required photos, and select an available time slot.");
          return;
        }

        const promoRaw = (els.promoInput?.value || "").trim();
        if (promoRaw && !appliedPromo) {
          setBookingFeedback("Tap Apply to use your promo code before booking.", "error");
          return;
        }

        const sb = window.salonSupabaseClient;
        const submitBtn = els.form.querySelector('button[type="submit"]');

        if (!sb) {
          setBookingFeedback("Supabase is required to save your appointment.", "error");
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = "Sending…";
        }

        try {
          if (merchantPaymentsNotReady()) {
            throw new Error(
              "Online payments are not set up for this business yet. Ask the owner to connect payments in the Styld app.",
            );
          }

          await ensureSlotStillAvailable(apptIso, durationMinutes);

          const online = needsOnlinePayment();
          const bookingId = pendingBookingId || crypto.randomUUID();
          pendingBookingId = bookingId;
          const subdomain = getBookingSubdomain();

          if (!online) {
            const { id, paths } = await submitBookingRequest(sb, apptIso, durationMinutes, bookingId, null);
            if (!id) throw new Error("Could not save booking id.");
            void invokeNotifySalon(sb, { booking_id: bookingId });
            if (!requiresBookingApproval()) {
              void sb.functions.invoke("booking-client-email", {
                body: { bookingId, subdomain },
              }).catch(function(e) { console.warn("booking-client-email:", e); });
            }
            saveLocalBooking({
              ...buildRowPayload(bookingId, paths, apptIso, durationMinutes, null),
              created_at: new Date().toISOString(),
              source: "website",
            });
            try {
              sessionStorage.setItem(DETAILS_BOOKING_KEY, bookingId);
              sessionStorage.removeItem(BOOKING_NOTICE_KEY);
            } catch (_) {
              /* ignore */
            }
            const detailsQ = new URLSearchParams();
            detailsQ.set("booking_id", bookingId);
            if (requiresBookingApproval()) {
              detailsQ.set("pending_approval", "1");
            }
            window.location.assign(buildBookingSuccessUrl(detailsQ));
            return;
          }

          if (submitBtn) submitBtn.textContent = "Processing payment…";

          const photoPaths = await uploadBookingPhotosForRequest(sb, bookingId);
          const payTotals = computeTotals();
          const amountCents = Math.round(Number(payTotals.deposit || 0) * 100);
          const nameEl = document.getElementById("full-name");
          const emailEl = document.getElementById("email");
          const payResult = await payBookingWithStripe(sb, {
            subdomain,
            bookingId,
            amountCents,
            subtotalCents: Math.round(
              (payTotals.rawSubtotal - payTotals.promoDiscountUsd + payTotals.travelFee) * 100,
            ),
            promoCode: appliedPromo?.code || null,
            houseCallExtraCents: 0,
            customerName: (nameEl && nameEl.value && nameEl.value.trim()) || "",
            customerEmail: (emailEl && emailEl.value && emailEl.value.trim()) || "",
          });

          if (!payResult.ok) {
            var payErr =
              payResult.error ||
              (payResult.paymentId
                ? "Your card was charged but we could not finalize the booking. Save this reference and contact the business: " +
                  payResult.paymentId
                : "Payment failed.");
            setStripeCardError(payErr);
            throw new Error(payErr);
          }

          const { id, paths } = await submitBookingRequest(sb, apptIso, durationMinutes, bookingId, payResult.paymentId || null, {
            paidOnline: true,
            paths: photoPaths,
          });
          if (!id) throw new Error("Payment succeeded but the appointment could not be saved. Contact the business with reference " + (payResult.paymentId || bookingId) + ".");

          void invokeNotifySalon(sb, { booking_id: bookingId });
          if (!requiresBookingApproval()) {
            void sb.functions.invoke("booking-client-email", {
              body: { bookingId, subdomain },
            }).catch(function(e) { console.warn("booking-client-email:", e); });
          }
          saveLocalBooking({
            ...buildRowPayload(bookingId, paths, apptIso, durationMinutes, payResult.paymentId || null, { paidOnline: true }),
            created_at: new Date().toISOString(),
            source: "website",
            payment_status: "deposit_paid",
          });

          try {
            sessionStorage.setItem(DETAILS_BOOKING_KEY, bookingId);
            sessionStorage.removeItem(BOOKING_NOTICE_KEY);
          } catch (_) {
            /* ignore */
          }

          const successQ = new URLSearchParams();
          successQ.set("booking_id", bookingId);
          successQ.set("paid", "1");
          if (requiresBookingApproval()) {
            successQ.set("pending_approval", "1");
          }
          window.location.assign(buildBookingSuccessUrl(successQ));
          return;
        } catch (err) {
          console.error(err);
          const msg =
            err && typeof err === "object" && "message" in err && err.message
              ? String(err.message)
              : String(err || "Unknown error");

          // If the slot was just taken by someone else, refresh the slot picker
          // so it disappears and the customer can pick another time.
          if (
            msg.includes("no longer available") ||
            msg.includes("blocked") ||
            msg.includes("already booked")
          ) {
            pendingBookingId = null;
            void refreshUnavailableForSelection().then(() => renderSlots());
            setBookingFeedback(msg, "error");
          } else {
            const hint = msg.includes("not configured")
              ? " The business owner must finish payment setup."
              : "";
            setBookingFeedback(`Could not complete your booking. ${msg}${hint}`, "error");
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent =
              submitBtn.dataset.originalText || (needsOnlinePayment() ? "Confirm payment" : "Book appointment");
          }
        }
      });
    }
  }

  function navigateMonth(delta) {
    const d = DT.fromObject({ year: viewYear, month: viewMonth + 1, day: 1 }, { zone: CFG.salonTimeZone }).plus({
      months: delta,
    });
    viewYear = d.year;
    viewMonth = d.month - 1;
    void refreshBookingDatesOccupied().then(() => {
      renderCalendar();
      void refreshUnavailableForSelection();
    });
  }

  function initCalendarNav() {
    const n = nowZoned();
    viewYear = n.year;
    viewMonth = n.month - 1;
    void refreshBookingDatesOccupied().then(() => {
      renderCalendar();
      updateSelectedDateLine();
    });
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = window.setInterval(
      () => {
        void refreshUnavailableForSelection();
      },
      60 * 1000,
    );
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && selectedIsoDate) {
        void refreshUnavailableForSelection();
      }
    });
  }

  readPaidReturnParams();
  populateStyles();
  applyProductFromQueryParam();
  renderBookingProductsField();

  const presetRaw = new URLSearchParams(window.location.search).get("style");
  const preset = presetRaw ? STYLE_ALIASES[presetRaw] || presetRaw : "";
  if (preset && els.styleSelect) {
    const hasOption = Array.from(els.styleSelect.options).some((o) => o.value === preset);
    if (hasOption) els.styleSelect.value = preset;
  }

  applyBookingFormOptions();
  bindFilePreview(els.photoHair, els.photoHairPreview);
  bindFilePreview(els.photoRef, els.photoRefPreview);
  bindForm();
  initHouseAddressUI();

  if (DT) {
    initCalendarNav();
    startPolling();
  }

  syncBookingDependentFields();
  renderSlots();

  (function supabaseHint() {
    var hint = document.getElementById("booking-supabase-hint");
    if (hint && !window.salonSupabaseClient) hint.removeAttribute("hidden");
  })();

  (function syncBannerPhones() {
    var tel = CFG.salonPhoneTel || "";
    var disp = CFG.salonPhoneDisplay || tel;
    var hrefTel = tel.replace(/[^\d+]/g, "");
    document.querySelectorAll(".booking-footer-phone").forEach(function (el) {
      el.href = "tel:" + hrefTel;
      el.textContent = disp;
    });
  })();
})();






