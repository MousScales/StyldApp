(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatFaqAnswer(value) {
    return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function formatSiteAddress(content) {
    if (!content) return '';
    return [content.addressLine1, content.addressLine2, content.city, content.state, content.zip]
      .filter(Boolean)
      .join(', ');
  }

  function buildGoogleMapsSearchUrl(address) {
    var query = String(address || '').trim();
    if (!query) return 'https://www.google.com/maps';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function buildGoogleMapsEmbedUrl(content) {
    if (!content) return null;
    var custom = content.mapEmbedUrl ? String(content.mapEmbedUrl).trim() : '';
    if (custom) return custom;
    var address = formatSiteAddress(content).trim();
    if (!address) return null;
    return 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed';
  }

  function isSectionHidden(content, section) {
    if (!content || !Array.isArray(content.hiddenSections)) return false;
    return content.hiddenSections.indexOf(section) !== -1;
  }

  function isLocationPartHidden(content, part) {
    if (!content || !Array.isArray(content.hiddenLocationParts)) return false;
    return content.hiddenLocationParts.indexOf(part) !== -1;
  }

  var SOCIAL_PLATFORMS = [
    { id: 'instagram', label: 'Instagram', inputKind: 'handle', prefix: '@' },
    { id: 'tiktok', label: 'TikTok', inputKind: 'handle', prefix: '@' },
    { id: 'facebook', label: 'Facebook', inputKind: 'url' },
    { id: 'x', label: 'X (Twitter)', inputKind: 'handle', prefix: '@' },
    { id: 'youtube', label: 'YouTube', inputKind: 'url' },
    { id: 'pinterest', label: 'Pinterest', inputKind: 'handle', prefix: '@' },
    { id: 'linkedin', label: 'LinkedIn', inputKind: 'url' },
    { id: 'threads', label: 'Threads', inputKind: 'handle', prefix: '@' },
    { id: 'snapchat', label: 'Snapchat', inputKind: 'handle', prefix: '@' },
    { id: 'yelp', label: 'Yelp', inputKind: 'url' },
    { id: 'google', label: 'Google Business', inputKind: 'url' },
    { id: 'whatsapp', label: 'WhatsApp', inputKind: 'phone' },
  ];

  function looksLikeUrl(value) {
    return /^https?:\/\//i.test(value) || /^www\./i.test(value);
  }

  function normalizeUrl(value) {
    var trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (looksLikeUrl(trimmed)) {
      return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    }
    return trimmed;
  }

  function normalizeSocialInput(platform, raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    if (platform.inputKind === 'handle') return value.replace(/^@+/, '').trim();
    if (platform.inputKind === 'phone') return value.replace(/[^\d+]/g, '').trim();
    return normalizeUrl(value);
  }

  function normalizeSocialLinks(content) {
    var links = {};
    SOCIAL_PLATFORMS.forEach(function (platform) {
      links[platform.id] = '';
    });
    var raw = content && content.socialLinks;
    if (raw && typeof raw === 'object') {
      SOCIAL_PLATFORMS.forEach(function (platform) {
        if (typeof raw[platform.id] === 'string') {
          links[platform.id] = normalizeSocialInput(platform, raw[platform.id]);
        }
      });
    }
    var legacy = content && content.instagramHandle
      ? String(content.instagramHandle).replace(/^@+/, '').trim()
      : '';
    if (!links.instagram && legacy) links.instagram = legacy;
    return links;
  }

  function buildSocialUrl(platformId, rawValue) {
    var platform = SOCIAL_PLATFORMS.filter(function (row) {
      return row.id === platformId;
    })[0];
    if (!platform) return null;
    var value = normalizeSocialInput(platform, rawValue);
    if (!value) return null;

    switch (platformId) {
      case 'instagram':
        return 'https://www.instagram.com/' + encodeURIComponent(value) + '/';
      case 'tiktok':
        return 'https://www.tiktok.com/@' + encodeURIComponent(value);
      case 'facebook':
        return looksLikeUrl(value) || value.indexOf('facebook.com') !== -1
          ? normalizeUrl(value)
          : 'https://www.facebook.com/' + encodeURIComponent(value);
      case 'x':
        return 'https://x.com/' + encodeURIComponent(value);
      case 'youtube':
        return looksLikeUrl(value) || value.indexOf('youtube.com') !== -1 || value.indexOf('youtu.be') !== -1
          ? normalizeUrl(value)
          : 'https://www.youtube.com/' + (value.indexOf('@') === 0 ? value : '@' + value);
      case 'pinterest':
        return 'https://www.pinterest.com/' + encodeURIComponent(value) + '/';
      case 'linkedin':
        return looksLikeUrl(value) || value.indexOf('linkedin.com') !== -1
          ? normalizeUrl(value)
          : 'https://www.linkedin.com/in/' + encodeURIComponent(value);
      case 'threads':
        return 'https://www.threads.net/@' + encodeURIComponent(value);
      case 'snapchat':
        return 'https://www.snapchat.com/add/' + encodeURIComponent(value);
      case 'yelp':
      case 'google':
        return normalizeUrl(value);
      case 'whatsapp': {
        var digits = value.replace(/\D/g, '');
        return digits ? 'https://wa.me/' + digits : null;
      }
      default:
        return null;
    }
  }

  function formatSocialDisplay(platform, rawValue) {
    var value = normalizeSocialInput(platform, rawValue);
    if (!value) return '';
    if (platform.inputKind === 'handle' && platform.prefix) {
      return platform.label + ' · ' + platform.prefix + value;
    }
    if (platform.inputKind === 'phone') {
      return platform.label + ' · ' + value;
    }
    if (platform.inputKind === 'url') {
      var short = value.replace(/^https?:\/\/(www\.)?/i, '');
      return platform.label + ' · ' + (short.length > 36 ? short.slice(0, 36) + '…' : short);
    }
    return platform.label + ' · ' + value;
  }

  function hasAnySocialLink(links) {
    return SOCIAL_PLATFORMS.some(function (platform) {
      return String(links[platform.id] || '').trim().length > 0;
    });
  }

  var VALID_MAIN_SECTIONS = ['aboutMe', 'policies', 'reviews', 'portfolio', 'menu', 'faq', 'visit'];

  function normalizeHeroLayout(layout) {
    if (layout === 'stack' || layout === 'cover' || layout === 'minimal' || layout === 'banner') {
      return layout;
    }
    if (layout === 'split' || layout === 'image-below') return 'banner';
    return 'banner';
  }

  function defaultMainSectionOrder(portfolioPlacement) {
    if (portfolioPlacement === 'below_menu') {
      return ['aboutMe', 'policies', 'reviews', 'menu', 'portfolio', 'faq', 'visit'];
    }
    return ['aboutMe', 'policies', 'reviews', 'portfolio', 'menu', 'faq', 'visit'];
  }

  function mergeMainSectionOrder(saved, portfolioPlacement) {
    var template = defaultMainSectionOrder(portfolioPlacement);
    var result = saved.slice();

    template.forEach(function (section) {
      if (result.indexOf(section) !== -1) return;

      var insertAt = result.length;
      var templateIdx = template.indexOf(section);

      for (var i = templateIdx + 1; i < template.length; i += 1) {
        var nextIdx = result.indexOf(template[i]);
        if (nextIdx >= 0) {
          insertAt = nextIdx;
          break;
        }
      }

      for (var j = templateIdx - 1; j >= 0; j -= 1) {
        var prevIdx = result.indexOf(template[j]);
        if (prevIdx >= 0) {
          insertAt = prevIdx + 1;
          break;
        }
      }

      result.splice(insertAt, 0, section);
    });

    return result;
  }

  function normalizeMainSectionOrder(value, portfolioPlacement) {
    var fallback = defaultMainSectionOrder(portfolioPlacement);
    if (!Array.isArray(value)) return fallback.slice();

    var seen = {};
    var ordered = [];
    value.forEach(function (item) {
      if (
        typeof item === 'string' &&
        VALID_MAIN_SECTIONS.indexOf(item) !== -1 &&
        !seen[item]
      ) {
        seen[item] = true;
        ordered.push(item);
      }
    });

    if (ordered.length === 0) return fallback.slice();

    var merged = mergeMainSectionOrder(ordered, portfolioPlacement);
    return merged.length === VALID_MAIN_SECTIONS.length ? merged : fallback.slice();
  }

  function resolveMainSectionOrder(content) {
    var placement =
      content && content.portfolioPlacement === 'below_menu' ? 'below_menu' : 'above_menu';
    return normalizeMainSectionOrder(
      content && content.mainSectionOrder,
      placement,
    );
  }

  function getMainSectionElement(sectionId) {
    if (sectionId === 'aboutMe') return document.getElementById('profile-about-block');
    if (sectionId === 'policies') return document.getElementById('profile-policy-block');
    if (sectionId === 'reviews') return document.getElementById('profile-reviews-section');
    if (sectionId === 'portfolio') return document.getElementById('profile-portfolio-section');
    if (sectionId === 'menu') return document.getElementById('profile-menu-section');
    if (sectionId === 'faq') return document.getElementById('profile-faq-section');
    if (sectionId === 'visit') return document.getElementById('profile-location-section');
    return null;
  }

  function ensureOrderedBlockWrapper(el, sectionId) {
    if (!el) return null;
    var existing = el.closest('.profile-ordered-block-section[data-wrap-section="' + sectionId + '"]');
    if (existing) return existing;

    var wrapper = document.createElement('section');
    wrapper.className = 'profile-ordered-block-section';
    wrapper.setAttribute('data-wrap-section', sectionId);
    wrapper.setAttribute('data-site-section', sectionId);

    var container = document.createElement('div');
    container.className = 'container';

    var parent = el.parentNode;
    if (!parent) return el;

    parent.insertBefore(wrapper, el);
    wrapper.appendChild(container);
    container.appendChild(el);
    return wrapper;
  }

  function reorderMainSections(content, theme) {
    var order = resolveMainSectionOrder(content);
    var main = document.querySelector('main');
    if (!main) return;

    theme = theme || {};
    var layout = normalizeHeroLayout(theme.heroLayout);
    var isMinimal = layout === 'minimal';
    var isBanner = layout === 'banner';

    var heroSection = document.querySelector('.profile-hero');
    var photoWrap = document.getElementById('profile-photo-wrap');
    var heroInfo = document.querySelector('.profile-hero .profile-info');
    var bookIntroInfo = document.querySelector('.profile-book-intro .profile-info');

    var profileMainExisting = document.getElementById('profile-header-main-section');
    if (profileMainExisting) profileMainExisting.remove();

    if (heroInfo) {
      while (heroInfo.firstChild) heroInfo.removeChild(heroInfo.firstChild);
      heroInfo.style.display = 'none';
    }
    if (bookIntroInfo) {
      while (bookIntroInfo.firstChild) bookIntroInfo.removeChild(bookIntroInfo.firstChild);
    }

    if (heroSection) {
      heroSection.hidden = isMinimal;
    }

    if (photoWrap && heroSection && !isMinimal) {
      var topGrid = heroSection.querySelector('.profile-hero__grid');
      if (topGrid && photoWrap.parentElement !== topGrid) {
        topGrid.insertBefore(photoWrap, topGrid.firstChild);
      }
    }

    var heroGrid = heroSection ? heroSection.querySelector('.profile-hero__grid') : null;
    if (heroGrid) {
      heroGrid.classList.remove('profile-hero__grid--no-photo');
      if (isBanner) {
        heroGrid.classList.add('profile-hero__grid--photo-only');
      } else {
        heroGrid.classList.remove('profile-hero__grid--photo-only');
      }
    }

    order.forEach(function (sectionId) {
      var el = getMainSectionElement(sectionId);
      if (!el) return;

      if (sectionId === 'aboutMe' || sectionId === 'policies') {
        var wrapped = ensureOrderedBlockWrapper(el, sectionId);
        main.appendChild(wrapped || el);
        return;
      }

      main.appendChild(el);
    });

    var bookIntro = document.querySelector('.profile-book-intro');
    if (bookIntro) {
      bookIntro.hidden = true;
    }
  }

  function buildServiceCard(style, cardClass) {
    var cls = cardClass || 'profile-service-card';
    var imgStyle = style.imageUrl
      ? ' style="background-image:url(\'' +
        String(style.imageUrl).replace(/'/g, '%27') +
        '\');background-size:cover;background-position:center;"'
      : '';
    var bookHref = style.id
      ? '/booking?style=' + encodeURIComponent(style.id)
      : '/booking';
    return (
      '<a class="' + cls + '" href="' +
      escapeHtml(bookHref) +
      '">' +
      '<div class="profile-service-card__img" aria-hidden="true"' +
      imgStyle +
      '></div>' +
      '<div class="profile-service-card__body">' +
      '<div class="profile-service-card__name">' +
      escapeHtml(style.title || '') +
      '</div>' +
      (style.priceLabel
        ? '<div class="profile-service-card__price">' +
          escapeHtml(style.priceLabel) +
          '</div>'
        : '') +
      (style.durationLabel
        ? '<div class="profile-service-card__duration">' +
          escapeHtml(style.durationLabel) +
          '</div>'
        : '') +
      '</div></a>'
    );
  }

  function buildServiceCardWithCategory(style, cardClass) {
    var cat = (style.category || '').trim();
    var desc = (style.description || '').trim();
    var imgStyle = style.imageUrl
      ? ' style="background-image:url(\'' +
        String(style.imageUrl).replace(/'/g, '%27') +
        '\');background-size:cover;background-position:center;"'
      : '';
    var bookHref = style.id ? '/booking?style=' + encodeURIComponent(style.id) : '/booking';

    var cardHtml =
      '<a class="' + cardClass + '" href="' + escapeHtml(bookHref) + '">' +
      '<div class="profile-service-card__img" aria-hidden="true"' + imgStyle + '></div>' +
      '<div class="profile-service-card__body">' +
      '<div class="profile-service-card__name">' + escapeHtml(style.title || '') + '</div>' +
      (style.priceLabel ? '<div class="profile-service-card__price">' + escapeHtml(style.priceLabel) + '</div>' : '') +
      (style.durationLabel ? '<div class="profile-service-card__duration">' + escapeHtml(style.durationLabel) + '</div>' : '') +
      '</div>' +
      (desc ? '<span class="profile-service-card__has-desc" aria-hidden="true"></span>' : '') +
      '</a>';

    var expandHtml = desc
      ? '<button class="profile-service-card__expand-btn" type="button" aria-expanded="false">' +
        '<span class="profile-service-card__expand-label">About this service</span>' +
        '<svg class="profile-service-card__expand-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="profile-service-card__desc" hidden>' + escapeHtml(desc) + '</div>'
      : '';

    return '<div class="profile-service-card-wrap"' +
      (cat ? ' data-category="' + escapeHtml(cat) + '"' : '') +
      '>' +
      cardHtml +
      expandHtml +
      '</div>';
  }

  function buildProfileServiceCards(styles, theme) {
    var layout = theme && theme.styleCardLayout;
    var cardClass = layout === 'outlined'
      ? 'profile-service-card profile-service-card--outlined'
      : 'profile-service-card';

    if (!styles || !styles.length) {
      return (
        '<a class="' + cardClass + '" href="/booking">' +
        '<div class="profile-service-card__img"></div>' +
        '<div class="profile-service-card__body">' +
        '<div class="profile-service-card__name">Add your services</div>' +
        '<div class="profile-service-card__price">in the Styld app</div>' +
        '</div></a>'
      );
    }

    var styleCardLayout = layout === 'pill' ? 'pill' : layout === 'outlined' ? 'outlined' : 'card';

    if (styleCardLayout === 'pill') {
      return buildProfileStylePills(styles);
    }

    // Collect ordered unique categories
    var categoryOrder = [];
    var grouped = {};
    styles.slice(0, 24).forEach(function (style) {
      var cat = (style.category || '').trim();
      if (!grouped[cat]) {
        grouped[cat] = [];
        categoryOrder.push(cat);
      }
      grouped[cat].push(style);
    });

    var namedCategories = categoryOrder.filter(function (c) { return c !== ''; });

    // Render all cards with data-category, letting the filter handle visibility
    var allCards = styles.slice(0, 24)
      .map(function (s) { return buildServiceCardWithCategory(s, cardClass); })
      .join('');

    // Build category filter tabs if there are named categories
    if (namedCategories.length > 0) {
      var filtersEl = document.getElementById('profile-menu-filters');
      if (filtersEl) {
        var tabsHtml = '<button class="profile-menu-filter profile-menu-filter--active" data-filter="__all__">All</button>';
        namedCategories.forEach(function (cat) {
          tabsHtml += '<button class="profile-menu-filter" data-filter="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
        });
        filtersEl.innerHTML = tabsHtml;
        filtersEl.hidden = false;

        filtersEl.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.profile-menu-filter') : e.target;
          if (!btn || !btn.dataset || !btn.dataset.filter) return;
          var filter = btn.dataset.filter;

          // Update active tab
          filtersEl.querySelectorAll('.profile-menu-filter').forEach(function (b) {
            b.classList.toggle('profile-menu-filter--active', b === btn);
          });

          // Show / hide card wrappers
          var grid = document.getElementById('profile-service-grid');
          if (!grid) return;
          grid.querySelectorAll('.profile-service-card-wrap').forEach(function (wrap) {
            if (filter === '__all__') {
              wrap.hidden = false;
            } else {
              wrap.hidden = (wrap.dataset.category || '') !== filter;
            }
          });
        });
      }
    }

    return allCards;
  }

  function buildProfileStylePills(styles) {
    return (
      '<div class="style-pill-list" style="grid-column:1/-1">' +
      styles
        .slice(0, 20)
        .map(function (style) {
          var imgHtml = style.imageUrl
            ? '<div class="style-pill__img--bg" style="background-image:url(\'' +
              String(style.imageUrl).replace(/'/g, '%27') +
              '\')"></div>'
            : '<div class="style-pill__img"></div>';
          var bookHref = style.id
            ? '/booking?style=' + encodeURIComponent(style.id)
            : '/booking';
          var desc = style.durationLabel ? escapeHtml(style.durationLabel) : '';
          var price = style.priceLabel
            ? '<span class="style-pill__price">' + escapeHtml(style.priceLabel) + '</span>'
            : '';
          return (
            '<a class="style-pill" href="' +
            escapeHtml(bookHref) +
            '">' +
            imgHtml +
            '<div class="style-pill__body">' +
            '<div class="style-pill__name">' +
            escapeHtml(style.title || '') +
            '</div>' +
            (desc
              ? '<div class="style-pill__desc">' + desc + '</div>'
              : '') +
            '</div>' +
            price +
            '</a>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function populateLocationInfo(content) {
    var infoEl = document.getElementById('profile-location-info');
    if (!infoEl) return;

    var html = '';
    var address = formatSiteAddress(content).trim();
    var addressHidden = isLocationPartHidden(content, 'address');
    var contactHidden = isLocationPartHidden(content, 'contact');
    var socialHidden = isLocationPartHidden(content, 'social');

    var hasAddress = false;
    if (!addressHidden && address) {
      hasAddress = true;
      var mapsUrl = buildGoogleMapsSearchUrl(address);
      html +=
        '<div class="profile-location-col"><h3>Address</h3>' +
        '<p><a href="' + escapeHtml(mapsUrl) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(address) + '</a></p></div>';
    }

    var hasContact = false;
    if (!contactHidden) {
      var contactHtml =
        (content.phoneDisplay ? '<p>' + escapeHtml(content.phoneDisplay) + '</p>' : '') +
        (content.email
          ? '<p><a href="mailto:' + escapeHtml(content.email) + '">' + escapeHtml(content.email) + '</a></p>'
          : '');
      if (contactHtml) {
        hasContact = true;
        html += '<div class="profile-location-col"><h3>Contact</h3>' + contactHtml + '</div>';
      }
    }

    var hasSocial = false;
    if (!socialHidden) {
      var socialLinks = normalizeSocialLinks(content);
      var socialRows = SOCIAL_PLATFORMS.map(function (platform) {
        var value = String(socialLinks[platform.id] || '').trim();
        if (!value) return '';
        var url = buildSocialUrl(platform.id, value);
        if (!url) return '';
        return (
          '<p class="profile-social-link"><a href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(formatSocialDisplay(platform, value)) +
          '</a></p>'
        );
      }).filter(Boolean);

      if (socialRows.length) {
        hasSocial = true;
        html +=
          '<div class="profile-location-col"><h3>Social</h3>' + socialRows.join('') + '</div>';
      }
    }

    infoEl.innerHTML = html;

    // Smart section title based on what's actually visible
    var visitSection = document.querySelector('[data-site-section="visit"]');
    var visitTitleEl = document.getElementById('profile-visit-title');

    if (!hasAddress && !hasContact && !hasSocial) {
      if (visitSection) visitSection.hidden = true;
    } else {
      if (visitSection) visitSection.hidden = false;
      if (visitTitleEl) {
        if (!hasAddress) {
          visitTitleEl.textContent = 'Connect';
        } else if (!hasContact && !hasSocial) {
          visitTitleEl.textContent = 'Visit';
        } else {
          visitTitleEl.textContent = content.visitTitle || 'Visit & Connect';
        }
      }
    }
  }

  function renderStars(rating) {
    var n = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    var html = '';
    for (var i = 1; i <= 5; i += 1) {
      html += '<span class="profile-review-star' + (i <= n ? ' is-filled' : '') + '">★</span>';
    }
    return html;
  }

  function truncateMessage(message, max) {
    var text = String(message || '').trim();
    if (text.length <= max) return text;
    return text.slice(0, max).trim() + '…';
  }

  function buildReviewCard(review, index) {
    var preview = truncateMessage(review.message, 72);
    return (
      '<button type="button" class="profile-review-card" data-review-index="' + index + '">' +
      '<p class="profile-review-card__name">' + escapeHtml(review.clientName || 'Client') + '</p>' +
      '<div class="profile-review-card__stars" aria-hidden="true">' + renderStars(review.rating) + '</div>' +
      '<p class="profile-review-card__message">' + escapeHtml(preview) + '</p>' +
      '</button>'
    );
  }

  function populateReviews(content, theme) {
    var settings = window.__STYLD_REVIEWS_SETTINGS__ || { enabled: true };
    var reviews = Array.isArray(window.__STYLD_SITE_REVIEWS__) ? window.__STYLD_SITE_REVIEWS__ : [];
    var section = document.getElementById('profile-reviews-section');
    var marquee = document.getElementById('profile-reviews-marquee');
    var modal = document.getElementById('profile-review-modal');

    if (!section || !marquee) return;

    var enabled = settings.enabled !== false;
    var hidden = isSectionHidden(content, 'reviews');
    var show = enabled && !hidden && reviews.length > 0;

    section.hidden = !show;
    if (!show) {
      marquee.innerHTML = '';
      return;
    }

    var surface =
      (theme && theme.backgroundColor) ||
      getComputedStyle(document.documentElement).getPropertyValue('--card-surface').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() ||
      '';
    if (surface) {
      section.style.setProperty('--review-surface', surface);
      marquee.style.setProperty('--review-surface', surface);
    }

    var titleEl = document.getElementById('profile-reviews-title');
    if (titleEl) titleEl.textContent = content.reviewsTitle || 'Client Reviews';

    var cards = reviews.map(function (review, index) {
      return buildReviewCard(review, index);
    }).join('');
    marquee.innerHTML =
      '<div class="profile-reviews-marquee__track">' + cards + cards + '</div>';

    if (modal && !modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-review-modal-close]')) {
          modal.hidden = true;
        }
      });
      marquee.addEventListener('click', function (e) {
        var card = e.target && e.target.closest ? e.target.closest('.profile-review-card') : null;
        if (!card) return;
        var idx = Number(card.getAttribute('data-review-index'));
        var review = reviews[idx];
        if (!review) return;
        var starsEl = document.getElementById('profile-review-modal-stars');
        var nameEl = document.getElementById('profile-review-modal-name');
        var messageEl = document.getElementById('profile-review-modal-message');
        if (starsEl) starsEl.innerHTML = renderStars(review.rating);
        if (nameEl) nameEl.textContent = review.clientName || 'Client';
        if (messageEl) messageEl.textContent = review.message || '';
        modal.hidden = false;
      });
    }
  }

  function resolvePortfolioMediaUrl(path) {
    if (!path) return '';
    if (window.StyldTenant && typeof window.StyldTenant.resolveStyleCoverUrl === 'function') {
      return window.StyldTenant.resolveStyleCoverUrl(path);
    }
    var config = window.__STYLD_TENANT_CONFIG__ || {};
    var supabaseUrl = config.supabaseUrl || '';
    if (!supabaseUrl) return '';
    return (
      supabaseUrl.replace(/\/$/, '') +
      '/storage/v1/object/public/style-covers/' +
      String(path).replace(/^\/+/, '')
    );
  }

  function normalizePortfolioItems(theme) {
    if (!theme) return [];
    if (Array.isArray(theme.portfolioItems) && theme.portfolioItems.length) {
      return theme.portfolioItems.filter(function (item) {
        return item && item.storagePath;
      });
    }
    if (Array.isArray(theme.galleryImagePaths)) {
      return theme.galleryImagePaths
        .filter(function (path) {
          return typeof path === 'string' && path.trim();
        })
        .map(function (path) {
          return { storagePath: path.trim(), mediaType: 'image' };
        });
    }
    return [];
  }

  function buildPortfolioMediaInner(item, url) {
    var safeUrl = escapeHtml(url);
    if (item.mediaType === 'video') {
      return (
        '<video src="' +
        safeUrl +
        '" autoplay muted playsinline loop preload="metadata"></video>'
      );
    }
    return '<img src="' + safeUrl + '" alt="" loading="lazy" />';
  }

  function buildPortfolioItemHtml(item, url, options) {
    options = options || {};
    var clickable = options.clickable !== false;
    var type = item.mediaType === 'video' ? 'video' : 'image';
    var cls =
      'profile-portfolio-item' + (type === 'video' ? ' profile-portfolio-item--video' : '');
    var inner = buildPortfolioMediaInner(item, url);
    var safeUrl = escapeHtml(url);

    if (!clickable) {
      return '<div class="' + cls + '">' + inner + '</div>';
    }

    return (
      '<button type="button" class="' +
      cls +
      ' profile-portfolio-item-btn" data-portfolio-url="' +
      safeUrl +
      '" data-portfolio-type="' +
      type +
      '">' +
      inner +
      '</button>'
    );
  }

  function normalizeCertificationItems(theme) {
    if (!theme) return [];
    if (Array.isArray(theme.certificationItems) && theme.certificationItems.length) {
      return theme.certificationItems
        .filter(function (item) {
          return item && item.storagePath;
        })
        .map(function (item) {
          return {
            storagePath: item.storagePath,
            mediaType: item.mediaType === 'video' ? 'video' : 'image',
            caption: typeof item.caption === 'string' ? item.caption : '',
          };
        });
    }
    return [];
  }

  function buildCertificationCardHtml(item, url) {
    var safeUrl = escapeHtml(url);
    var caption = typeof item.caption === 'string' ? item.caption.trim() : '';
    var captionHtml = caption
      ? '<p class="profile-certification-card__caption">' + escapeHtml(caption) + '</p>'
      : '';

    return (
      '<article class="profile-certification-card">' +
      '<div class="profile-certification-card__frame">' +
      '<button type="button" class="profile-certification-card__btn profile-portfolio-item-btn" data-portfolio-url="' +
      safeUrl +
      '" data-portfolio-type="image">' +
      '<img class="profile-certification-card__img" src="' +
      safeUrl +
      '" alt="" loading="lazy" />' +
      '</button>' +
      '</div>' +
      captionHtml +
      '</article>'
    );
  }

  function populateSiteNav(content) {
    var linksWrap = document.getElementById('profile-nav-links');
    var tabsWrap = document.getElementById('profile-nav-tabs');
    var menuBtn = document.getElementById('profile-nav-menu-btn');
    var drawer = document.getElementById('profile-nav-drawer');
    if (!linksWrap && !menuBtn && !drawer) return;

    var showCertifications = !isSectionHidden(content, 'certifications');
    var showProducts = !isSectionHidden(content, 'products');
    var showNav = showCertifications || showProducts;

    var certLabel = (content.certificationsTitle || 'Certifications').trim() || 'Certifications';
    var productsLabel = (content.productsTitle || 'Shop').trim() || 'Shop';
    var activeCert = document.body.classList.contains('page-certifications') ? 'certifications' : '';
    var activeProducts = document.body.classList.contains('page-products') ? 'products' : '';

    document.querySelectorAll('[data-nav-page="certifications"]').forEach(function (link) {
      link.textContent = certLabel;
      link.hidden = !showCertifications;
      link.classList.toggle('is-active', activeCert === 'certifications');
    });

    document.querySelectorAll('[data-nav-page="products"]').forEach(function (link) {
      link.textContent = productsLabel;
      link.hidden = !showProducts;
      link.classList.toggle('is-active', activeProducts === 'products');
    });

    if (linksWrap) linksWrap.hidden = !showNav;
    if (tabsWrap) tabsWrap.hidden = !showNav;
    if (menuBtn) menuBtn.hidden = !showNav;
    if (drawer && !showNav) drawer.hidden = true;
  }

  function bindSiteNavMenu() {
    if (document.documentElement.dataset.siteNavBound === '1') return;
    document.documentElement.dataset.siteNavBound = '1';

    var menuBtn = document.getElementById('profile-nav-menu-btn');
    var drawer = document.getElementById('profile-nav-drawer');
    if (!menuBtn || !drawer) return;

    function closeDrawer() {
      drawer.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }

    menuBtn.addEventListener('click', function () {
      var opening = drawer.hidden;
      drawer.hidden = !opening;
      menuBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('click', function (e) {
      if (drawer.hidden) return;
      if (e.target === menuBtn || menuBtn.contains(e.target)) return;
      if (drawer.contains(e.target)) return;
      closeDrawer();
    });
  }

  function normalizeSiteProducts(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (item) {
        if (!item || typeof item !== 'object') return null;
        var id = item.id ? String(item.id) : '';
        var title = item.title ? String(item.title).trim() : '';
        if (!id || !title) return null;
        var price = Number(item.price);
        if (!Number.isFinite(price) || price < 0) price = 0;
        var imagePaths = Array.isArray(item.imagePaths)
          ? item.imagePaths.map(function (p) { return String(p || '').trim(); }).filter(Boolean)
          : [];
        if (!imagePaths.length && item.storagePath) imagePaths = [String(item.storagePath)];
        var trackInventory = item.trackInventory === true;
        var stockQty =
          typeof item.stockQty === "number" && Number.isFinite(item.stockQty)
            ? Math.max(0, Math.floor(item.stockQty))
            : 0;
        return {
          id: id,
          title: title,
          description: item.description ? String(item.description).trim() : '',
          price: Math.round(price * 100) / 100,
          storagePath: imagePaths[0] || (item.storagePath ? String(item.storagePath) : ''),
          imagePaths: imagePaths,
          enabled: item.enabled !== false,
          trackInventory: trackInventory,
          stockQty: stockQty,
        };
      })
      .filter(Boolean);
  }

  function productCoverPath(product) {
    if (product.imagePaths && product.imagePaths.length) return product.imagePaths[0];
    return product.storagePath || '';
  }

  function buildProductCardHtml(product) {
    var paths = product.imagePaths && product.imagePaths.length ? product.imagePaths : [];
    var cover = productCoverPath(product);
    var url = cover ? coverUrlFromPath(cover) : '';
    var extraPhotos = paths.length > 1 ? paths.length - 1 : 0;
    var inStock = !product.trackInventory || product.stockQty > 0;
    var stockLabel = product.trackInventory
      ? product.stockQty <= 0
        ? 'Out of stock'
        : product.stockQty === 1
          ? '1 in stock'
          : product.stockQty + ' in stock'
      : '';
    var imgHtml = url
      ? '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(product.title) + '" class="profile-product-card__img" loading="lazy" decoding="async" />'
      : '<div class="profile-product-card__img profile-product-card__img--placeholder">No photo</div>';
    var desc = product.description
      ? '<p class="profile-product-card__desc">' + escapeHtml(product.description) + '</p>'
      : '';
    var bookingUrl = '/booking?product=' + encodeURIComponent(product.id);
    var orderUrl = '/products/order?product=' + encodeURIComponent(product.id);
    var stockHtml = stockLabel
      ? '<p class="profile-product-card__stock' +
        (inStock ? '' : ' profile-product-card__stock--out') +
        '">' +
        escapeHtml(stockLabel) +
        '</p>'
      : '';
    var actionsHtml = inStock
      ? '<div class="profile-product-card__actions">' +
        '<a class="btn btn-secondary profile-product-card__btn" href="' +
        bookingUrl +
        '">Add when booking</a>' +
        '<a class="btn btn-primary profile-product-card__btn" href="' +
        orderUrl +
        '">Order now</a>' +
        '</div>'
      : '<p class="profile-product-card__unavailable">Currently unavailable</p>';
    return (
      '<article class="profile-product-card' +
      (inStock ? '' : ' profile-product-card--out') +
      '">' +
      imgHtml +
      '<div class="profile-product-card__body">' +
      '<h2 class="profile-product-card__title">' +
      escapeHtml(product.title) +
      '</h2>' +
      desc +
      '<p class="profile-product-card__price">$' +
      product.price.toFixed(2) +
      (extraPhotos > 0 ? ' · ' + (paths.length + ' photos') : '') +
      '</p>' +
      stockHtml +
      actionsHtml +
      '</div></article>'
    );
  }

  function populateProductsCatalog(content) {
    var section = document.getElementById('profile-products-catalog');
    var grid = document.getElementById('products-catalog-grid');
    var emptyEl = document.getElementById('products-catalog-empty');
    if (!section || !grid) return;

    var products = normalizeSiteProducts(window.__STYLD_SITE_PRODUCTS__ || []).filter(function (p) {
      return p.enabled;
    });
    var hidden = isSectionHidden(content, 'products');
    var show = !hidden;

    section.hidden = !show;
    if (!show) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.hidden = true;
      return;
    }

    var titleEl = document.getElementById('products-catalog-title');
    if (titleEl) titleEl.textContent = content.productsTitle || 'Shop';

    var blurbEl = document.getElementById('products-catalog-blurb');
    if (blurbEl) {
      var blurb = content.productsBlurb || '';
      blurbEl.textContent = blurb;
      blurbEl.hidden = !blurb;
    }

    if (!products.length) {
      grid.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = hidden ? 'This page is not available.' : 'No products yet.';
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    grid.innerHTML = products.map(buildProductCardHtml).join('');
  }

  function populateCertificationsCatalog(content, theme) {
    var section = document.getElementById('profile-certifications-catalog');
    var grid = document.getElementById('certifications-catalog-grid');
    var emptyEl = document.getElementById('certifications-catalog-empty');
    if (!section || !grid) return;

    var items = normalizeCertificationItems(theme);
    var hidden = isSectionHidden(content, 'certifications');
    var show = !hidden;

    section.hidden = !show;
    if (!show) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.hidden = true;
      return;
    }

    var titleEl = document.getElementById('certifications-catalog-title');
    if (titleEl) titleEl.textContent = content.certificationsTitle || 'Certifications';

    var blurbEl = document.getElementById('certifications-catalog-blurb');
    if (blurbEl) {
      var blurb = content.certificationsBlurb || '';
      blurbEl.textContent = blurb;
      blurbEl.hidden = !blurb;
    }

    if (!items.length) {
      grid.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = hidden ? 'This page is not available.' : 'No certifications uploaded yet.';
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = items
      .map(function (item) {
        var url = coverUrlFromPath(item.storagePath);
        if (!url) return '';
        return buildCertificationCardHtml(item, url);
      })
      .filter(Boolean)
      .join('');
  }

  function buildPortfolioViewMoreSlide() {
    return (
      '<a class="profile-portfolio-carousel__slide profile-portfolio-view-more-slide" href="/portfolio">' +
      '<span class="profile-portfolio-view-more-slide__label">View more</span>' +
      '</a>'
    );
  }

  function openPortfolioLightbox(url, mediaType) {
    var modal = document.getElementById('profile-portfolio-lightbox');
    var stage = document.getElementById('profile-portfolio-lightbox-stage');
    if (!modal || !stage) return;

    stage.innerHTML = '';
    if (mediaType === 'video') {
      var video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.className = 'profile-portfolio-lightbox__media';
      stage.appendChild(video);
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    } else {
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'profile-portfolio-lightbox__media';
      stage.appendChild(img);
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closePortfolioLightbox() {
    var modal = document.getElementById('profile-portfolio-lightbox');
    var stage = document.getElementById('profile-portfolio-lightbox-stage');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (stage) {
      stage.querySelectorAll('video').forEach(function (video) {
        video.pause();
      });
      stage.innerHTML = '';
    }
  }

  function bindPortfolioLightbox() {
    if (document.documentElement.dataset.portfolioLightboxBound === '1') return;
    document.documentElement.dataset.portfolioLightboxBound = '1';

    document.addEventListener('click', function (e) {
      var btn =
        e.target && e.target.closest ? e.target.closest('.profile-portfolio-item-btn') : null;
      if (btn) {
        e.preventDefault();
        var url = btn.getAttribute('data-portfolio-url');
        var type = btn.getAttribute('data-portfolio-type') || 'image';
        if (url) openPortfolioLightbox(url, type);
        return;
      }

      if (e.target && e.target.closest && e.target.closest('[data-portfolio-lightbox-close]')) {
        closePortfolioLightbox();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePortfolioLightbox();
    });
  }

  function startPortfolioVideos(root) {
    if (!root) return;
    root.querySelectorAll('video').forEach(function (video) {
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.loop = true;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    });
  }

  var PORTFOLIO_HOME_PREVIEW = 5;

  function populatePortfolioCatalog(content, theme) {
    var section = document.getElementById('profile-portfolio-catalog');
    var grid = document.getElementById('portfolio-catalog-grid');
    var emptyEl = document.getElementById('portfolio-catalog-empty');
    if (!grid) return;

    var items = normalizePortfolioItems(theme);
    var hidden = isSectionHidden(content, 'portfolio');
    var show = !hidden && items.length > 0;

    if (section) section.hidden = false;

    var titleEl = document.getElementById('portfolio-catalog-title');
    if (titleEl) titleEl.textContent = content.reelsTitle || 'Our work';

    var blurbEl = document.getElementById('portfolio-catalog-blurb');
    if (blurbEl) {
      var blurb = content.reelsBlurb || '';
      blurbEl.textContent = blurb;
      blurbEl.hidden = !blurb;
    }

    if (!show) {
      grid.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = hidden ? 'This gallery is not available.' : 'No portfolio items yet.';
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    grid.innerHTML = items
      .map(function (item) {
        var url = resolvePortfolioMediaUrl(item.storagePath);
        if (!url) return '';
        return buildPortfolioItemHtml(item, url);
      })
      .join('');
    startPortfolioVideos(grid);

    document.title =
      (content.reelsTitle || 'Our work') + ' | ' + (content.brandName || 'Book online');
  }

  function populatePortfolio(content, theme) {
    var section = document.getElementById('profile-portfolio-section');
    var track = document.getElementById('profile-portfolio-carousel-track');
    var viewMore = document.getElementById('profile-portfolio-view-more');
    if (!section || !track) return;

    var items = normalizePortfolioItems(theme);
    var hidden = isSectionHidden(content, 'portfolio');
    var show = !hidden && items.length > 0;

    section.hidden = !show;
    if (!show) {
      track.innerHTML = '';
      if (viewMore) viewMore.hidden = true;
      return;
    }

    var titleEl = document.getElementById('profile-portfolio-title');
    if (titleEl) titleEl.textContent = content.reelsTitle || 'Our work';

    var blurbEl = document.getElementById('profile-portfolio-blurb');
    if (blurbEl) {
      var blurb = content.reelsBlurb || '';
      blurbEl.textContent = blurb;
      blurbEl.hidden = !blurb;
    }

    var previewItems = items.slice(0, PORTFOLIO_HOME_PREVIEW);
    var slidesHtml = previewItems
      .map(function (item) {
        var url = resolvePortfolioMediaUrl(item.storagePath);
        if (!url) return '';
        return (
          '<div class="profile-portfolio-carousel__slide">' +
          buildPortfolioItemHtml(item, url) +
          '</div>'
        );
      })
      .join('');

    if (items.length > PORTFOLIO_HOME_PREVIEW) {
      slidesHtml += buildPortfolioViewMoreSlide();
    }

    track.innerHTML = slidesHtml;

    startPortfolioVideos(track);

    if (viewMore) {
      viewMore.hidden = items.length <= PORTFOLIO_HOME_PREVIEW;
      viewMore.href = '/portfolio';
    }
  }

  function normalizeFaqItems(content) {
    if (!content || !Array.isArray(content.faqItems)) return [];
    return content.faqItems
      .filter(function (item) {
        return item && (String(item.question || '').trim() || String(item.answer || '').trim());
      })
      .map(function (item) {
        return {
          question: String(item.question || '').trim(),
          answer: String(item.answer || '').trim(),
        };
      })
      .filter(function (item) {
        return item.question && item.answer;
      });
  }

  function populateFaq(content) {
    var section = document.getElementById('profile-faq-section');
    var listEl = document.getElementById('profile-faq-list');
    if (!section || !listEl) return;

    var items = normalizeFaqItems(content);
    var hidden = isSectionHidden(content, 'faq');
    var show = !hidden && items.length > 0;

    section.hidden = !show;
    if (!show) {
      listEl.innerHTML = '';
      return;
    }

    var titleEl = document.getElementById('profile-faq-title');
    if (titleEl) titleEl.textContent = content.faqTitle || 'FAQ';

    var blurbEl = document.getElementById('profile-faq-blurb');
    if (blurbEl) {
      var blurb = content.faqBlurb || '';
      blurbEl.textContent = blurb;
      blurbEl.hidden = !blurb;
    }

    listEl.innerHTML = items
      .map(function (item, index) {
        return (
          '<div class="profile-faq-item">' +
          '<button class="profile-faq-item__question" type="button" aria-expanded="false" aria-controls="profile-faq-answer-' +
          index +
          '">' +
          '<span class="profile-faq-item__question-text">' +
          escapeHtml(item.question) +
          '</span>' +
          '<span class="profile-faq-item__toggle" aria-hidden="true">+</span>' +
          '</button>' +
          '<div class="profile-faq-item__answer" id="profile-faq-answer-' +
          index +
          '" hidden>' +
          formatFaqAnswer(item.answer) +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  if (document.documentElement.dataset.profileFaqBound !== '1') {
    document.documentElement.dataset.profileFaqBound = '1';
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.profile-faq-item__question') : null;
      if (!btn) return;
      var answer = btn.nextElementSibling;
      if (!answer || !answer.classList.contains('profile-faq-item__answer')) return;
      var opening = answer.hidden;
      answer.hidden = !opening;
      btn.classList.toggle('is-open', opening);
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
  }

  bindPortfolioLightbox();
  bindSiteNavMenu();

  window.applyStyldPreviewContent = function applyStyldPreviewContent() {
    var content = window.__STYLD_SITE_CONTENT__;
    if (!content || typeof content !== 'object') return;

    var theme = window.__STYLD_SITE_THEME__ || {};
    var styles = window.__STYLD_SITE_STYLES__ || [];
    var isPortfolioPage = document.body.classList.contains('page-portfolio');
    var isCertificationsPage = document.body.classList.contains('page-certifications');
    var isProductsPage = document.body.classList.contains('page-products');

    if (isProductsPage) {
      var prodBrandEl = document.getElementById('profile-brand-name');
      if (prodBrandEl) prodBrandEl.textContent = content.brandName || '';
      populateSiteNav(content);
      populateProductsCatalog(content);
      return;
    }

    if (isCertificationsPage) {
      var certBrandEl = document.getElementById('profile-brand-name');
      if (certBrandEl) certBrandEl.textContent = content.brandName || '';

      if (theme.logoImageUrl) {
        var certLogoPlaceholder = document.getElementById('profile-logo-placeholder');
        if (certLogoPlaceholder) {
          var certLogoImg = document.createElement('img');
          certLogoImg.className = 'profile-brand__logo-img';
          certLogoImg.src = theme.logoImageUrl;
          certLogoImg.alt = '';
          certLogoImg.width = 38;
          certLogoImg.height = 38;
          certLogoImg.decoding = 'async';
          certLogoPlaceholder.replaceWith(certLogoImg);
        }
      }

      populateSiteNav(content);
      populateCertificationsCatalog(content, theme);

      if (window.StyldTenant && window.StyldTenant.applySiteFooter) {
        window.StyldTenant.applySiteFooter(content);
      } else {
        var certFooterBrand = document.getElementById('preview-footer-brand');
        if (certFooterBrand && content.brandName) {
          certFooterBrand.textContent = '\u00A9 ' + content.brandName;
        }
      }
      return;
    }

    if (isPortfolioPage) {
      var portfolioBrandEl = document.getElementById('profile-brand-name');
      if (portfolioBrandEl) portfolioBrandEl.textContent = content.brandName || '';

      if (theme.logoImageUrl) {
        var portfolioLogoPlaceholder = document.getElementById('profile-logo-placeholder');
        if (portfolioLogoPlaceholder) {
          var portfolioLogoImg = document.createElement('img');
          portfolioLogoImg.className = 'profile-brand__logo-img';
          portfolioLogoImg.src = theme.logoImageUrl;
          portfolioLogoImg.alt = '';
          portfolioLogoImg.width = 38;
          portfolioLogoImg.height = 38;
          portfolioLogoImg.decoding = 'async';
          portfolioLogoPlaceholder.replaceWith(portfolioLogoImg);
        }
      }

      populatePortfolioCatalog(content, theme);
      populateSiteNav(content);

      if (window.StyldTenant && window.StyldTenant.applySiteFooter) {
        window.StyldTenant.applySiteFooter(content);
      } else {
        var portfolioFooterBrand = document.getElementById('preview-footer-brand');
        if (portfolioFooterBrand && content.brandName) {
          portfolioFooterBrand.textContent = '\u00A9 ' + content.brandName;
        }
      }
      return;
    }

    // Brand name
    var brandNameEl = document.getElementById('profile-brand-name');
    if (brandNameEl) brandNameEl.textContent = content.brandName || '';

    // Logo
    if (theme.logoImageUrl) {
      var logoPlaceholder = document.getElementById('profile-logo-placeholder');
      if (logoPlaceholder) {
        var logoImg = document.createElement('img');
        logoImg.className = 'profile-brand__logo-img';
        logoImg.src = theme.logoImageUrl;
        logoImg.alt = '';
        logoImg.width = 38;
        logoImg.height = 38;
        logoImg.decoding = 'async';
        logoPlaceholder.replaceWith(logoImg);
      }
    }

    // Hero layout — reset previous layout, then apply cover/stack/banner/minimal
    var heroSection = document.querySelector('.profile-hero');
    var heroPhoto = document.getElementById('profile-hero-photo');

    function resetHeroLayoutState() {
      if (heroSection) {
        heroSection.classList.remove('profile-hero--cover', 'profile-hero--stack');
        heroSection.querySelectorAll('.profile-hero-stack').forEach(function (el) {
          el.remove();
        });
      }
      if (heroPhoto) {
        heroPhoto.style.display = '';
        heroPhoto.querySelectorAll('.profile-cover-overlay').forEach(function (el) {
          el.remove();
        });
      }
      document.body.classList.remove('hero-layout-cover', 'page-cover-splash');
      document.querySelectorAll('.profile-below-hero').forEach(function (el) {
        el.hidden = false;
      });
      var navReset = document.getElementById('profile-nav') || document.querySelector('.profile-nav');
      if (navReset) {
        navReset.classList.remove('profile-nav--cover-splash');
      }
    }

    resetHeroLayoutState();

    theme = theme || {};
    theme.heroLayout = normalizeHeroLayout(theme.heroLayout);

    var isCover = theme.heroLayout === 'cover';
    var isStack = theme.heroLayout === 'stack';
    var isMinimal = theme.heroLayout === 'minimal';
    var isBanner = theme.heroLayout === 'banner';
    var isSplashPage = document.body.classList.contains('page-splash');
    var isBookPage = document.body.classList.contains('page-book');
    var isCoverSplash = isCover && isSplashPage;

    if (heroSection) {
      if (isMinimal && !isCoverSplash) {
        heroSection.hidden = true;
      } else {
        heroSection.hidden = false;
      }
    }

    var photoWrap = document.getElementById('profile-photo-wrap');
    var heroGrid = heroSection ? heroSection.querySelector('.profile-hero__grid') : null;
    var showHeroPhoto = !isMinimal && theme.heroPhotoEnabled !== false;
    if (photoWrap && !isStack) {
      photoWrap.hidden = !showHeroPhoto;
    }
    if (heroGrid && !isStack) {
      heroGrid.classList.toggle('profile-hero__grid--no-photo', !showHeroPhoto);
      if (isBanner && showHeroPhoto) {
        heroGrid.classList.add('profile-hero__grid--photo-only');
      }
    }

    if (isCoverSplash && heroSection) {
      heroSection.classList.add('profile-hero--cover');
      document.body.classList.add('hero-layout-cover', 'page-cover-splash');

      if (heroPhoto && !heroPhoto.querySelector('.profile-cover-overlay')) {
        heroPhoto.style.position = 'relative';
        var overlay = document.createElement('div');
        overlay.className = 'profile-cover-overlay';
        var brandSpan = document.createElement('span');
        brandSpan.className = 'profile-cover-brand';
        brandSpan.textContent = content.brandName || '';
        var bookBtn = document.createElement('a');
        bookBtn.className = 'profile-book-btn profile-book-btn--cover-splash';
        bookBtn.href = '/book';
        bookBtn.textContent = 'Book Now';
        overlay.appendChild(brandSpan);
        overlay.appendChild(bookBtn);
        heroPhoto.appendChild(overlay);
      }

      document.querySelectorAll('.profile-below-hero').forEach(function (el) {
        el.hidden = true;
      });

      var navEl = document.getElementById('profile-nav') || document.querySelector('.profile-nav');
      if (navEl) {
        navEl.hidden = false;
        navEl.classList.add('profile-nav--cover-splash');
      }
    } else {
      document.body.classList.remove('hero-layout-cover', 'page-cover-splash');
      var navElReset = document.getElementById('profile-nav') || document.querySelector('.profile-nav');
      if (navElReset) {
        navElReset.hidden = false;
        navElReset.classList.remove('profile-nav--cover-splash');
      }
    }

    var navBookBtn = document.querySelector('.profile-nav .profile-book-btn');
    if (navBookBtn) {
      navBookBtn.href = isCoverSplash ? '/book' : '/booking';
    }

    if (isCoverSplash && theme.hideBookNowButton && navBookBtn) {
      navBookBtn.style.display = 'none';
    } else if (navBookBtn) {
      navBookBtn.style.display = '';
    }

    if (isCoverSplash) {
      document.title = content.brandName || 'Your Brand';
    } else {
      document.title = (content.brandName || 'Your Brand') + ' | Book online';
    }

    if (isStack && heroSection) {
      heroSection.classList.add('profile-hero--stack');
      var stackUrls = Array.isArray(theme.heroStackImageUrls) ? theme.heroStackImageUrls : [];
      if (stackUrls.length > 0) {
        var stackEl = document.createElement('div');
        var stackFormat = theme.heroStackImageFormat === 'tall' ? 'tall' : 'wide';
        stackEl.className = 'profile-hero-stack profile-hero-stack--' + stackFormat;
        stackUrls.forEach(function (url, index) {
          var img = document.createElement('img');
          img.src = url;
          img.className = 'profile-hero-stack__img';
          img.alt = '';
          img.loading = 'lazy';
          var focusList = Array.isArray(theme.heroStackImageFocus) ? theme.heroStackImageFocus : [];
          var focus = focusList[index];
          if (focus && typeof focus.x === 'number' && typeof focus.y === 'number') {
            img.style.objectPosition = focus.x + '% ' + focus.y + '%';
          }
          stackEl.appendChild(img);
        });
        var stackHeroGrid = heroSection.querySelector('.profile-hero__grid');
        if (stackHeroGrid) {
          heroSection.insertBefore(stackEl, stackHeroGrid);
        } else {
          heroSection.prepend(stackEl);
        }
        if (heroPhoto) heroPhoto.style.display = 'none';
      }
    } else if (heroSection) {
      heroSection.classList.remove('profile-hero--stack');
    }

    if (!isStack && heroPhoto && theme.heroImageUrl) {
      var imageUrl = String(theme.heroImageUrl).replace(/'/g, '%27');
      var imagePosition =
        typeof theme.heroImageFocusX === 'number' && typeof theme.heroImageFocusY === 'number'
          ? theme.heroImageFocusX + '% ' + theme.heroImageFocusY + '%'
          : 'center center';
      var useCoverBlur = isCover && theme.heroCoverBlur === true;

      if (useCoverBlur) {
        heroPhoto.classList.add('profile-photo__bg--blurred');
        heroPhoto.style.backgroundImage = 'none';
        heroPhoto.style.setProperty('--hero-cover-bg', "url('" + imageUrl + "')");
        heroPhoto.style.setProperty('--hero-cover-position', imagePosition);
      } else {
        heroPhoto.classList.remove('profile-photo__bg--blurred');
        heroPhoto.style.removeProperty('--hero-cover-bg');
        heroPhoto.style.removeProperty('--hero-cover-position');
        heroPhoto.style.backgroundImage = "url('" + imageUrl + "')";
        heroPhoto.style.backgroundPosition = imagePosition;
      }
    }

    // About Me and Policies — always separate sections in <main> (reorderMainSections)
    var profileInfo = document.querySelector('.profile-info');
    var aboutBlock = document.getElementById('profile-about-block');
    var policyBlock = document.getElementById('profile-policy-block');
    var aboutHidden = isSectionHidden(content, 'aboutMe');
    var policiesHidden = isSectionHidden(content, 'policies');

    // About title — always "About Me"
    var aboutTitleEl = document.getElementById('profile-about-title');
    if (aboutTitleEl) aboutTitleEl.textContent = 'About Me';

    // About text
    var aboutEl = document.getElementById('profile-about-body');
    if (aboutEl) {
      aboutEl.textContent = content.heroDescription || '';
    }
    if (aboutBlock) {
      aboutBlock.hidden = aboutHidden;
    }

    // Policy bullets — bookingPolicy is newline-separated; render as <ul><li> list
    var policyEl = document.getElementById('profile-policy-body');
    if (policyEl) {
      var policyText = (content.bookingPolicy || '').trim();
      var bullets = policyText
        ? policyText.split('\n').map(function(l){ return l.trim(); }).filter(Boolean)
        : [];
      policyEl.innerHTML = '';
      bullets.forEach(function(bullet) {
        var li = document.createElement('li');
        li.textContent = bullet;
        policyEl.appendChild(li);
      });
      if (policyBlock) {
        policyBlock.hidden = policiesHidden || bullets.length === 0;
      }
    }

    if (profileInfo && isCoverSplash) {
      profileInfo.style.display = 'none';
    }

    var bookIntro = document.querySelector('.profile-book-intro');
    if (bookIntro && isCoverSplash) {
      bookIntro.hidden = true;
    }

    // Menu title & blurb
    var menuTitleEl = document.getElementById('profile-menu-title');
    if (menuTitleEl) menuTitleEl.textContent = content.menuTitle || 'Menu';
    var menuBlurbEl = document.getElementById('profile-menu-blurb');
    if (menuBlurbEl) menuBlurbEl.textContent = content.menuBlurb || '';

    // Service cards
    var serviceGrid = document.getElementById('profile-service-grid');
    if (serviceGrid) {
      serviceGrid.innerHTML = buildProfileServiceCards(styles, theme);

      // Description expand/collapse via event delegation
      serviceGrid.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest
          ? e.target.closest('.profile-service-card__expand-btn')
          : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var wrap = btn.closest('.profile-service-card-wrap');
        if (!wrap) return;
        var descEl = wrap.querySelector('.profile-service-card__desc');
        if (!descEl) return;
        var opening = descEl.hidden;
        descEl.hidden = !opening;
        btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        btn.classList.toggle('is-open', opening);
      });
    }

    // Location info columns (also handles visit title + section visibility)
    populateLocationInfo(content);

    // Map
    var mapFrame = document.getElementById('profile-map');
    if (mapFrame) {
      var embedUrl = buildGoogleMapsEmbedUrl(content);
      if (embedUrl && !isLocationPartHidden(content, 'map')) {
        mapFrame.src = embedUrl;
        mapFrame.title = 'Map to ' + formatSiteAddress(content);
        mapFrame.style.display = '';
      } else {
        mapFrame.style.display = 'none';
      }
    }

    populateReviews(content, theme);
    populatePortfolio(content, theme);
    populateFaq(content);
    reorderMainSections(content, theme);
    populateSiteNav(content);
    bindSiteNavMenu();

    // Section visibility (menu, visit, etc. — not aboutMe/policies, handled above)
    document.querySelectorAll('[data-site-section]').forEach(function (el) {
      var sectionId = el.getAttribute('data-site-section');
      if (
        sectionId &&
        sectionId !== 'reviews' &&
        sectionId !== 'aboutMe' &&
        sectionId !== 'policies' &&
        sectionId !== 'portfolio' &&
        sectionId !== 'faq'
      ) {
        el.hidden = isSectionHidden(content, sectionId);
      }
    });

    // Footer
    if (window.StyldTenant && window.StyldTenant.applySiteFooter) {
      window.StyldTenant.applySiteFooter(content);
    } else {
      var footerBrand = document.getElementById('preview-footer-brand');
      if (footerBrand && content.brandName) {
        footerBrand.textContent = '\u00A9 ' + content.brandName;
      }
    }
  };

  if (window.__STYLD_SITE_CONTENT__) {
    window.applyStyldPreviewContent();
  }
})();
