(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
      var handle = (content.instagramHandle || '').replace(/^@/, '').trim();
      if (handle) {
        hasSocial = true;
        var igUrl = 'https://www.instagram.com/' + encodeURIComponent(handle) + '/';
        html +=
          '<div class="profile-location-col"><h3>Social</h3>' +
          '<p class="profile-ig-link">' +
          '<a href="' + escapeHtml(igUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '<svg class="profile-ig-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>' +
          '@' + escapeHtml(handle) +
          '</a></p></div>';
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

  function reviewInitials(name) {
    var parts = String(name || '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return String(name || 'C').slice(0, 2).toUpperCase();
  }

  function getReviewCardClass(theme) {
    var layout = theme && theme.styleCardLayout;
    return layout === 'outlined'
      ? 'profile-review-card profile-review-card--outlined'
      : 'profile-review-card';
  }

  function buildReviewCard(review, index, theme) {
    var preview = truncateMessage(review.message, 72);
    var cardClass = getReviewCardClass(theme);
    return (
      '<button type="button" class="' + cardClass + '" data-review-index="' + index + '">' +
      '<div class="profile-review-card__avatar" aria-hidden="true">' + escapeHtml(reviewInitials(review.clientName)) + '</div>' +
      '<div class="profile-review-card__body">' +
      '<div class="profile-review-card__stars" aria-hidden="true">' + renderStars(review.rating) + '</div>' +
      '<p class="profile-review-card__message">' + escapeHtml(preview) + '</p>' +
      '<p class="profile-review-card__name">' + escapeHtml(review.clientName || 'Client') + '</p>' +
      '</div>' +
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
      return buildReviewCard(review, index, theme || {});
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
        var modalCard = modal.querySelector('.profile-review-modal__card');
        if (starsEl) starsEl.innerHTML = renderStars(review.rating);
        if (nameEl) nameEl.textContent = review.clientName || 'Client';
        if (messageEl) messageEl.textContent = review.message || '';
        if (modalCard) {
          modalCard.classList.toggle(
            'profile-review-modal__card--outlined',
            theme && theme.styleCardLayout === 'outlined',
          );
        }
        modal.hidden = false;
      });
    }
  }

  window.applyStyldPreviewContent = function applyStyldPreviewContent() {
    var content = window.__STYLD_SITE_CONTENT__;
    if (!content || typeof content !== 'object') return;

    var theme = window.__STYLD_SITE_THEME__ || {};
    var styles = window.__STYLD_SITE_STYLES__ || [];

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

    // Hero layout — apply cover/stack class and inject overlays if needed
    var heroSection = document.querySelector('.profile-hero');
    var heroPhoto = document.getElementById('profile-hero-photo');
    var isCover = theme.heroLayout === 'cover';
    var isStack = theme.heroLayout === 'stack';
    var isSplashPage = document.body.classList.contains('page-splash');
    var isBookPage = document.body.classList.contains('page-book');
    var isCoverSplash = isCover && isSplashPage;

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
        // Build the stack gallery and insert before .profile-hero__grid
        var stackEl = document.createElement('div');
        var stackFormat = theme.heroStackImageFormat === 'tall' ? 'tall' : 'wide';
        stackEl.className = 'profile-hero-stack profile-hero-stack--' + stackFormat;
        stackUrls.forEach(function(url, index) {
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
        var heroGrid = heroSection.querySelector('.profile-hero__grid');
        if (heroGrid) {
          heroSection.insertBefore(stackEl, heroGrid);
        } else {
          heroSection.prepend(stackEl);
        }
        // Hide the single hero photo slot — stack replaces it
        if (heroPhoto) heroPhoto.style.display = 'none';
      }
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

    // About & policy — split: beside photo; cover: on /book page only
    var isSplit = theme.heroLayout === 'split';
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

    var aboutVisible = !aboutHidden;
    var policyVisible = !policiesHidden && policyBlock && !policyBlock.hidden;
    var showAboutPolicyArea = aboutVisible || policyVisible;

    if (profileInfo) {
      if (isBookPage) {
        profileInfo.style.display = showAboutPolicyArea ? '' : 'none';
      } else if (isCoverSplash) {
        profileInfo.style.display = 'none';
      } else if (isSplit || isCover) {
        profileInfo.style.display = showAboutPolicyArea ? '' : 'none';
      } else {
        profileInfo.style.display = 'none';
      }
    }

    var bookIntro = document.querySelector('.profile-book-intro');
    if (bookIntro) {
      bookIntro.hidden = !showAboutPolicyArea;
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

    // Section visibility (menu, visit, etc. — not aboutMe/policies, handled above)
    document.querySelectorAll('[data-site-section]').forEach(function (el) {
      var sectionId = el.getAttribute('data-site-section');
      if (
        sectionId &&
        sectionId !== 'reviews' &&
        sectionId !== 'aboutMe' &&
        sectionId !== 'policies'
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
