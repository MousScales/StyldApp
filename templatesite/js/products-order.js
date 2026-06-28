(function () {
  var productId = "";
  var product = null;
  var settings = null;
  var subdomain = "";

  function money(n) {
    return "$" + Number(n || 0).toFixed(2);
  }

  function cfg() {
    return window.__STYLD_TENANT__ || window.__SALON_SITE_SUPABASE || {};
  }

  function normalizeProducts(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (p) {
        return p && p.id && p.title && p.enabled !== false;
      })
      .map(function (p) {
        return {
          id: String(p.id),
          title: String(p.title),
          price: Number(p.price) || 0,
          trackInventory: p.trackInventory === true,
          stockQty:
            typeof p.stockQty === "number" && Number.isFinite(p.stockQty)
              ? Math.max(0, Math.floor(p.stockQty))
              : 0,
        };
      });
  }

  function productInStock(product) {
    if (!product.trackInventory) return true;
    return product.stockQty > 0;
  }

  function setFeedback(msg, isError) {
    var el = document.getElementById("order-feedback");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
    el.classList.toggle("booking-feedback--error", !!isError);
  }

  function updateTotal() {
    if (!product) return;
    var fulfillment = document.querySelector('input[name="fulfillment"]:checked');
    var method = fulfillment ? fulfillment.value : "pickup";
    var shipping = method === "shipping" ? Number(settings && settings.shippingFlatRate) || 0 : 0;
    var total = Number(product.price) + shipping;
    var line = document.getElementById("order-total-line");
    if (line) {
      line.textContent =
        "Total: " +
        money(total) +
        (shipping > 0 ? " (includes " + money(shipping) + " shipping)" : "");
    }
    var note = document.getElementById("order-fulfillment-note");
    if (note) {
      if (method === "shipping") note.textContent = (settings && settings.shippingNote) || "";
      else note.textContent = (settings && settings.pickupInstructions) || "";
    }
    var shipFields = document.getElementById("order-shipping-fields");
    if (shipFields) shipFields.hidden = method !== "shipping";
  }

  function bindFulfillment() {
    document.querySelectorAll('input[name="fulfillment"]').forEach(function (input) {
      input.addEventListener("change", updateTotal);
    });
  }

  async function submitOrder(ev) {
    ev.preventDefault();
    setFeedback("", false);
    if (!product || !subdomain) {
      setFeedback("Product not loaded.", true);
      return;
    }
    var fulfillmentEl = document.querySelector('input[name="fulfillment"]:checked');
    var fulfillment = fulfillmentEl ? fulfillmentEl.value : "pickup";
    var body = {
      subdomain: subdomain,
      productId: product.id,
      fullName: document.getElementById("order-full-name").value.trim(),
      email: document.getElementById("order-email").value.trim(),
      phone: document.getElementById("order-phone").value.trim(),
      fulfillment: fulfillment,
    };
    if (fulfillment === "shipping") {
      body.shippingAddress = {
        line1: document.getElementById("order-ship-street").value.trim(),
        city: document.getElementById("order-ship-city").value.trim(),
        state: document.getElementById("order-ship-state").value.trim(),
        zip: document.getElementById("order-ship-zip").value.trim(),
      };
    }
    var tenant = cfg();
    var url = String(tenant.supabaseUrl || "").replace(/\/$/, "") + "/functions/v1/submit-product-order";
    var res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + tenant.supabaseAnonKey,
        apikey: tenant.supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.ok) {
      setFeedback((data && (data.error || data.message)) || "Could not submit order.", true);
      return;
    }
    window.location.href = "/booking-success.html?product_order=1";
  }

  window.StyldTenant.loadPublishedSite()
    .then(function (site) {
      subdomain = site.subdomain;
      productId = new URLSearchParams(window.location.search).get("product") || "";
      var products = normalizeProducts(site.productsCatalog || []);
      product = products.find(function (p) { return p.id === productId; }) || null;
      settings = site.productsSettings || {};
      if (!product) {
        setFeedback("Product not found.", true);
        return;
      }
      if (!productInStock(product)) {
        setFeedback(product.title + " is out of stock.", true);
        var form = document.getElementById("product-order-form");
        if (form) form.hidden = true;
        return;
      }
      var summary = document.getElementById("order-product-summary");
      if (summary) {
        var stockNote =
          product.trackInventory && product.stockQty > 0
            ? " · " + product.stockQty + " in stock"
            : "";
        summary.textContent = product.title + " — " + money(product.price) + stockNote;
      }
      var shipOpt = document.getElementById("order-shipping-option");
      if (shipOpt) shipOpt.hidden = !(settings.allowShipping === true);
      if (settings.allowPickup === false && settings.allowShipping === true) {
        var shipRadio = shipOpt && shipOpt.querySelector("input");
        if (shipRadio) shipRadio.checked = true;
      }
      bindFulfillment();
      updateTotal();
      var form = document.getElementById("product-order-form");
      if (form) form.addEventListener("submit", function (e) { void submitOrder(e); });
    })
    .catch(function (err) {
      setFeedback(err && err.message ? err.message : "Could not load shop.", true);
    });
})();
