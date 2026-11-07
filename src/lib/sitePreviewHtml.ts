import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  formatSiteAddress,
  LocationPart,
  resolveMainSectionOrder,
  SiteContent,
  SiteSection,
  MainSiteSection,
} from '../data/siteContent';
import {
  buildSocialLinksHtml,
  hasAnySocialLink,
  listActiveSocialLinks,
  formatSocialDisplay,
  buildSocialUrl,
} from '../data/socialLinks';
import { DEFAULT_SITE_THEME, FontFamily, FONT_FAMILY_OPTIONS, GOOGLE_FONTS_URL, HeroLayout, normalizeHeroLayout, PortfolioMediaType, SiteTextColors, SiteTextColorSources, StyleCardLayout, TemplateId, SiteTheme } from '../data/siteTheme';
import { buildTextColorsCssFromTheme } from './siteTextColors';
import { focusToBackgroundPosition, HeroImageFocus } from './heroImageFocus';

const SITE_PREVIEW_CSS = `
:root{--pink:#db2777;--pink-dark:#9f1239;--ink:#0a0a0a;--cream:#fafafa;--muted:#525252;--muted-soft:#737373;--pink-heading:#ec4899;--hero-pink:#f472b6;--hero-pink-deep:#be185d;--white:#fff;--radius:12px;--shadow:0 8px 32px rgba(13,13,13,.08);--font-display:"Cormorant Garamond",Georgia,serif;--font-body:"Source Sans 3",system-ui,sans-serif;--filter-active-text:#fff}
*{box-sizing:border-box}body{margin:0;font-family:var(--font-body);font-size:1rem;line-height:1.6;color:var(--ink);background:var(--cream)}
.container{width:min(1120px,calc(100% - 2rem));margin-inline:auto}
.preview-banner{position:sticky;top:0;z-index:200;background:#0a0a0a;color:#fafafa;text-align:center;font:600 12px/1 var(--font-body);padding:8px 12px;letter-spacing:.04em}
.hero-landing{position:relative;min-height:520px;display:flex;flex-direction:column;color:var(--ink);overflow:hidden;background:var(--white)}
.hero-landing__bg{position:absolute;inset:0;background:#fff;background-image:radial-gradient(ellipse 95% 70% at 8% 5%,rgba(244,114,182,.11),transparent 58%),linear-gradient(180deg,#fffafc 0%,#fff 45%,#fafafa 100%)}
.hero-landing__vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 115% 95% at 44% 48%,transparent 52%,rgba(250,250,250,.92) 100%);opacity:.35}
.hero-nav{position:relative;z-index:3;padding:1rem 0 .5rem}
.hero-nav__inner{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.hero-brand{display:inline-flex;align-items:center;gap:.65rem;text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:1.2rem;font-weight:600}
.hero-brand__logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#fce7f3,#fbcfe8);box-shadow:0 4px 14px rgba(219,39,119,.15)}
.hero-nav__panel{margin-left:auto;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.hero-nav__links{display:flex;gap:1rem}.hero-nav__links a{color:var(--muted);font-weight:600;text-decoration:none;font-size:.9rem}
.hero-btn{display:inline-flex;align-items:center;justify-content:center;padding:.65rem 1.2rem;font-weight:700;border-radius:14px;text-decoration:none;background:var(--pink);color:#fff;box-shadow:0 4px 18px rgba(219,39,119,.32);font-size:.9rem}
.hero-landing__content{position:relative;z-index:2;flex:1;display:flex;align-items:center;padding:1.5rem 0 2.5rem}
.hero-scale-layout{width:100%;max-width:960px;margin:0 auto}
.hero-scale-title__grid{display:grid;grid-template-columns:1fr minmax(140px,220px) 1fr;gap:1rem;align-items:center}
.hero-scale-col--left{text-align:right}.hero-scale-col--right{text-align:left}
.hero-scale-col--center{text-align:center;max-width:640px;margin:0 auto}
.hero-scale-kicker{margin:0 0 .35rem;font-size:.85rem;font-weight:600;color:#9ca3af;letter-spacing:.04em}
.hero-scale-display{margin:0;font-size:clamp(2rem,8vw,4.5rem);font-weight:800;letter-spacing:-.03em;line-height:.92;text-transform:uppercase}
.hero-scale-display--ink{color:var(--ink)}.hero-scale-display--brand{color:var(--pink);display:flex;flex-direction:column}
.hero-scale-visual{aspect-ratio:4/5;border-radius:28px;background:linear-gradient(180deg,#f9f5f6 0%,#f3eef0 100%);box-shadow:0 30px 60px -20px rgba(190,24,93,.22),0 0 0 1px rgba(244,114,182,.35)}
.hero-scale-visual--photo{background-size:cover;background-position:center}
.hero-layout--image-below{display:flex;flex-direction:column;align-items:center;gap:1.25rem}
.hero-layout--image-below .hero-scale-visual{width:min(100%,320px)}
.hero-layout--image-below .hero-scale-col--center,.hero-layout--minimal .hero-scale-col--center{text-align:center}
.hero-layout--minimal .hero-scale-title__grid{display:block}
.hero-layout--minimal .hero-scale-visual{display:none}
.hero-layout--minimal .hero-scale-col--left,.hero-layout--minimal .hero-scale-col--right{display:none}
.hero-ctas{display:flex;gap:.75rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap}
.hero-btn--outline-light{background:#fff;color:var(--ink);border:1.5px solid rgba(244,114,182,.45);box-shadow:none}
.hero-btn--gold{background:var(--pink);color:#fff;border:none}
.section{padding:2.5rem 0}.section-alt{background:var(--white);border-block:1px solid rgba(184,134,11,.12)}
.section-head{text-align:center;max-width:640px;margin:0 auto 1.5rem}.section-head h2{font-family:var(--font-display);font-size:clamp(1.5rem,3vw,2rem);margin:0 0 .5rem}.section-head p{margin:0;color:var(--muted)}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}
.section-head--popular h2{font-family:var(--font-display);font-size:clamp(2.1rem,4.5vw,3rem);font-weight:700;margin:0;display:inline-block;padding-bottom:.5rem;border-bottom:2px solid var(--pink)}
.section-popular-styles .catalog-service-cards--popular{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem 1.25rem}
.section-popular-styles .catalog-service-card{display:flex;flex-direction:row;align-items:stretch;gap:1rem;padding:.85rem 1rem;border-radius:14px;border:1px solid rgba(219,39,119,.14);background:var(--white);box-shadow:0 2px 12px rgba(13,13,13,.05);text-decoration:none;color:inherit;transition:border-color .15s ease,box-shadow .15s ease}
.section-popular-styles .catalog-service-card:hover{border-color:rgba(219,39,119,.35);box-shadow:0 4px 18px rgba(219,39,119,.12)}
.section-popular-styles .catalog-service-card__media{width:90px;min-width:90px;min-height:90px;align-self:center;border-radius:12px;background:linear-gradient(145deg,#ebe7df 0%,#d8d3c9 100%);border:1px dashed rgba(15,23,42,.12)}
.section-popular-styles .catalog-service-card__media--photo{background-size:cover;background-position:center;background-repeat:no-repeat;border:1px solid rgba(15,23,42,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.section-popular-styles .catalog-service-card__body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.35rem}
.section-popular-styles .catalog-service-card__title{font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--ink);line-height:1.25}
.section-popular-styles .catalog-service-card__mid{display:flex;flex-direction:row;align-items:baseline;justify-content:space-between;gap:.75rem}
.section-popular-styles .catalog-service-card__size{font-size:.85rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.section-popular-styles .catalog-service-card__price{font-size:1.1rem;font-weight:700;color:var(--ink);white-space:nowrap}
.section--reels-showcase{background:linear-gradient(180deg,rgba(253,242,248,.42) 0%,#fff 100%);border-block:1px solid rgba(219,39,119,.09)}
.reels-carousel__track{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.5rem}
.reels-carousel__slide{flex:0 0 min(18rem,calc(100vw - 3rem));scroll-snap-align:start}
.ig-reel-card{display:flex;flex-direction:column;min-height:420px;background:#fff;border:1px solid rgba(219,39,119,.16);border-radius:12px;overflow:hidden;text-decoration:none;color:inherit}
.ig-reel-card__media{display:flex;flex:1;min-height:320px;align-items:center;justify-content:center;background:linear-gradient(145deg,#111,#2a0c1a)}
.ig-reel-card__play{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.92);color:var(--pink-dark);font-size:1.4rem}
.ig-reel-card__body{padding:1rem;display:grid;gap:.25rem}
.ig-reel-card__handle{color:var(--pink-dark);font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.video-note--reels{margin-top:1.5rem;text-align:center;color:var(--muted)}
.info-card{background:var(--white);border-radius:var(--radius);padding:1.5rem;border:1px solid rgba(181,154,91,.28);box-shadow:var(--shadow)}
.info-card h3{font-family:var(--font-display);color:var(--pink-heading);margin:0 0 1rem}
.info-card p{margin:.25rem 0;color:var(--muted-soft)}.location-map{width:100%;height:220px;border:0;margin-top:1rem;border-radius:10px}
.location-address-link{display:block;color:inherit;text-decoration:none}.location-address-link:hover,.location-address-link:focus-visible{color:var(--pink-dark);text-decoration:underline}.location-address-link p{margin:0 0 .35rem}
.site-footer{padding:2rem 0 2.5rem;background:#111;color:#fafafa;text-align:center}.site-footer p{margin:.35rem 0;font-size:.9rem;color:#a1a1aa}.footer-built-by{margin:.35rem 0 0}.footer-built-by__link{display:inline-flex;align-items:center;gap:.4rem;font-size:.76rem;color:rgba(255,255,255,.55);text-decoration:none}.footer-built-by__logo{width:22px;height:22px;border-radius:6px;object-fit:cover}
@media (max-width:767px){.hero-landing__content{justify-content:center;width:100%}.hero-scale-layout{width:100%;max-width:100%}.hero-scale-title{width:100%;display:flex;flex-direction:column;align-items:center}.hero-scale-title__grid{display:flex;flex-direction:column;align-items:center;gap:1.15rem;width:100%;max-width:min(24rem,100%);margin-inline:auto}.hero-scale-visual{order:-1;max-width:min(360px,92vw);width:100%;margin-inline:auto;align-self:center}.hero-scale-col--left,.hero-scale-col--right,.hero-scale-col--center{width:100%;align-items:center;text-align:center}.hero-scale-display,.hero-scale-display--brand{align-items:center;text-align:center;width:100%}.hero-ctas--scale{width:100%;max-width:min(22rem,92vw);margin-inline:auto;justify-content:center;align-items:center;flex-direction:column}.hero-ctas--scale .hero-btn--lg{width:100%;max-width:20rem;margin-inline:auto;justify-content:center}.hero-nav__burger{display:inline-flex}.hero-nav__panel{display:none;flex-direction:column;align-items:stretch;width:100%;order:3;gap:1rem;margin-top:.35rem;padding:1rem 1.1rem 1.2rem;background:rgba(255,255,255,.98);border-radius:14px;border:1px solid rgba(244,114,182,.28)}.hero-nav__panel.hero-nav__panel--open{display:flex}.hero-nav__links{flex-direction:column;align-items:stretch}.hero-nav__actions{flex-direction:column;width:100%}.hero-nav__actions .hero-btn--nav{width:100%;justify-content:center}}
@media (max-width:720px){.section-popular-styles .catalog-service-cards--popular{grid-template-columns:1fr}}
.style-pill-list{display:flex;flex-direction:column;gap:.6rem;width:100%}
.style-pill{display:flex;align-items:center;gap:.85rem;padding:.6rem 1rem .6rem .6rem;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 2px 8px rgba(0,0,0,.05);text-decoration:none;color:inherit;transition:box-shadow .15s}
.style-pill:hover{box-shadow:0 4px 16px rgba(0,0,0,.1)}
.style-pill__img{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;background:linear-gradient(145deg,#e8e4dc,#d4cfc5)}
.style-pill__img--bg{width:48px;height:48px;border-radius:50%;flex-shrink:0;background-size:cover;background-position:center}
.style-pill__body{flex:1;min-width:0}
.style-pill__name{font-weight:700;font-size:.92rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.style-pill__desc{font-size:.75rem;color:var(--muted);margin-top:.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.style-pill__price{font-weight:800;font-size:.9rem;color:var(--ink);flex-shrink:0;white-space:nowrap}
@media (max-width:768px){.section{padding:2.4rem 0}.section-head{margin-bottom:1.65rem;text-align:center}.card-grid{display:flex;flex-wrap:nowrap;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 .25rem .85rem;margin-inline:-.25rem;-webkit-overflow-scrolling:touch}.card-grid>*{flex:0 0 min(18.25rem,calc(100vw - 3rem));scroll-snap-align:start;max-width:min(18.25rem,calc(100vw - 3rem))}.info-cards{display:grid;grid-template-columns:1fr;gap:1rem}.location-map{height:220px}.hero-ctas--scale{flex-direction:column;align-items:stretch;width:100%;max-width:360px;margin-inline:auto}.hero-ctas--scale .hero-btn--lg{width:100%;justify-content:center}}
.profile-nav{background:var(--nav-bg,var(--pink));border-bottom:none;padding:.875rem 0;position:sticky;top:0;z-index:100}
.profile-nav__inner{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.profile-nav__links{display:none;align-items:center;justify-content:center;flex:1;min-width:0;margin:0 .35rem}
.profile-nav__tabs{display:inline-flex;align-items:center;gap:1.75rem;max-width:100%;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.profile-nav__tabs::-webkit-scrollbar{display:none}
.profile-nav__link,.profile-nav__drawer-link{display:inline-flex;align-items:center;padding:0;border-radius:0;font-family:var(--font-body);font-size:.875rem;font-weight:700;color:rgba(255,255,255,.88);text-decoration:none;background:transparent;border:none;white-space:nowrap;transition:color .15s,opacity .15s}
.profile-nav__link[hidden],.profile-nav__drawer-link[hidden]{display:none!important}
.profile-nav__link:hover{color:#fff;background:transparent}
.profile-nav__link.is-active{color:#fff;background:transparent;box-shadow:none;text-decoration:underline;text-underline-offset:4px}
.profile-nav__actions{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
.profile-nav__menu-btn{display:inline-flex;align-items:center;justify-content:center;width:2.35rem;height:2.35rem;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.08);color:var(--nav-text,#fff);cursor:pointer}
.profile-nav__menu-icon{display:block;width:1.05rem;height:2px;background:currentColor;position:relative;border-radius:1px}
.profile-nav__menu-icon::before,.profile-nav__menu-icon::after{content:'';position:absolute;left:0;width:100%;height:2px;background:currentColor;border-radius:1px}
.profile-nav__menu-icon::before{top:-6px}
.profile-nav__menu-icon::after{top:6px}
.profile-nav__drawer{background:var(--nav-bg-solid,var(--nav-bg,var(--pink)));border-top:1px solid rgba(255,255,255,.12)}
.profile-nav__drawer-inner{padding:.65rem 0 .85rem}
.profile-nav__drawer-tabs{display:flex;flex-direction:column;gap:.25rem;padding:.35rem;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08)}
.profile-nav__drawer-link{width:100%;justify-content:flex-start;border-radius:10px}
.profile-nav__drawer-link:hover{background:rgba(255,255,255,.1)}
.profile-nav__drawer-link.is-active{background:rgba(255,255,255,.2);color:var(--nav-text,#fff)}
@media(min-width:768px){.profile-nav__links:not([hidden]){display:flex}.profile-nav__menu-btn{display:none!important}.profile-nav__drawer{display:none!important}}
@media(max-width:767px){.profile-brand{min-width:0;flex:1}.profile-brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.profile-brand{font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--text-nav,var(--nav-text,#fff));display:flex;align-items:center;gap:.6rem;text-decoration:none}
.profile-brand__logo{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.2);flex-shrink:0}
.profile-brand__logo-img{width:38px;height:38px;border-radius:10px;object-fit:cover;flex-shrink:0}
.profile-book-btn{display:inline-flex;align-items:center;padding:.6rem 1.35rem;background:var(--text-nav-button-bg,var(--ink));color:var(--text-nav-button,var(--pink));border-radius:999px;font-weight:700;font-size:.9rem;text-decoration:none;white-space:nowrap;transition:opacity .15s}
.profile-book-btn:hover{opacity:.88}
.profile-about-body,.profile-policy-body{color:var(--text-body,var(--muted));font-size:.975rem;line-height:1.72;margin:0}
.profile-policy-body{padding-left:1.25rem;list-style:disc}
.profile-policy-body li{margin-bottom:.35rem}
.profile-policy-body li:last-child{margin-bottom:0}
.profile-hero{padding:2.5rem 0 2rem;background:var(--cream)}
.profile-hero__grid{display:grid;grid-template-columns:2fr 3fr;gap:2.5rem;align-items:start}
.profile-photo{border-radius:20px;overflow:hidden;aspect-ratio:3/4;background:linear-gradient(180deg,#f0ece5 0%,#e4dfd7 100%);box-shadow:0 12px 40px rgba(0,0,0,.10)}
.profile-photo__bg{width:100%;height:100%;background-size:cover;background-position:center;min-height:240px}
.profile-info{display:flex;flex-direction:column;gap:1.75rem;padding-top:.5rem}
.profile-section-block{display:flex;flex-direction:column;gap:.5rem}
.profile-ordered-block-section{padding-block:2.5rem}
.profile-ordered-block-section .profile-section-block{max-width:48rem}
.profile-about-head,.profile-policy-head{font-family:var(--font-display);color:var(--ink);margin:0}
.profile-about-head{font-size:1.5rem;font-weight:700;border-bottom:2px solid var(--pink);display:inline-block;padding-bottom:.2rem}
.profile-policy-head{font-size:1.5rem;font-weight:700;border-bottom:2px solid var(--pink);display:inline-block;padding-bottom:.2rem}
.profile-menu-section{padding:2.5rem 0;background:var(--cream,#fff);border-top:1px solid rgba(0,0,0,.06)}
.profile-portfolio-section{padding:2.5rem 0 1.75rem;background:var(--cream,#fff);border-top:1px solid rgba(0,0,0,.06);overflow:hidden}
.profile-portfolio-head__row{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
.profile-portfolio-view-more{font-size:.875rem;font-weight:600;color:var(--pink);text-decoration:none;white-space:nowrap}
.profile-portfolio-carousel{overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:.15rem 0 .35rem}
.profile-portfolio-carousel::-webkit-scrollbar{display:none}
.profile-portfolio-carousel__track{display:flex;gap:.75rem;width:max-content;padding:0 1rem}
.profile-portfolio-carousel__slide{flex:0 0 min(68vw,260px);scroll-snap-align:start}
.profile-portfolio-item{width:100%;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:#111;position:relative}
.profile-portfolio-item-btn{display:block;width:100%;padding:0;margin:0;border:0;cursor:pointer;background:#111}
.profile-portfolio-item img,.profile-portfolio-item video{width:100%;height:100%;object-fit:cover;display:block}
.profile-portfolio-item--video{background:#111}
.profile-portfolio-view-more-slide{display:flex;align-items:center;justify-content:center;aspect-ratio:3/4;border-radius:14px;border:1.5px dashed rgba(255,255,255,.18);text-decoration:none;color:var(--pink)}
.profile-portfolio-lightbox{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:1rem}
.profile-portfolio-lightbox[hidden]{display:none!important}
.profile-portfolio-lightbox__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.94)}
.profile-portfolio-lightbox__close{position:absolute;top:.85rem;right:.85rem;z-index:2;width:2.5rem;height:2.5rem;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:1.6rem;cursor:pointer}
.profile-portfolio-lightbox__stage{position:relative;z-index:1;width:min(96vw,720px);max-height:92vh;display:grid;place-items:center}
.profile-portfolio-lightbox__media{max-width:100%;max-height:92vh;object-fit:contain;display:block;border-radius:8px}
.profile-faq-section{padding:2.5rem 0;background:var(--cream,#fff);border-top:1px solid rgba(0,0,0,.06)}
.profile-faq-list{display:flex;flex-direction:column}
.profile-faq-item{display:flex;flex-direction:column;border-bottom:1px solid var(--card-border,rgba(0,0,0,.1))}
.profile-faq-item:last-child{border-bottom:0}
.profile-faq-item__question{width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.15rem 0;border:0;background:transparent;font-family:var(--font-body);font-size:clamp(.95rem,2.2vw,1.05rem);font-weight:700;color:var(--ink);text-align:left;cursor:pointer}
.profile-faq-item__question-text{flex:1;line-height:1.35;color:var(--text-service-name,var(--ink))}
.profile-faq-item__toggle{flex-shrink:0;width:1.35rem;height:1.35rem;display:inline-flex;align-items:center;justify-content:center;color:var(--text-accent,var(--pink));font-size:1.45rem;font-weight:300;line-height:1;transition:transform .2s ease,color .15s}
.profile-faq-item__question:hover .profile-faq-item__question-text,.profile-faq-item__question:hover .profile-faq-item__toggle{color:var(--text-accent,var(--pink))}
.profile-faq-item__question.is-open .profile-faq-item__toggle{transform:rotate(45deg)}
.profile-faq-item__answer{padding:0 0 1.15rem;font-size:.92rem;line-height:1.65;color:var(--text-muted,var(--muted));white-space:pre-wrap}
.profile-faq-item__answer strong{color:var(--text-service-name,var(--ink));font-weight:700}
.profile-menu-head{margin-bottom:1.25rem}
.profile-menu-head h2{font-family:var(--font-display);font-size:clamp(1.5rem,3vw,2.1rem);font-weight:700;color:var(--ink);margin:0 0 .3rem;border-bottom:2px solid var(--pink);display:inline-block;padding-bottom:.2rem}
.profile-menu-blurb{color:var(--muted);font-size:.9rem;margin:0}
.profile-menu-filters{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid rgba(0,0,0,.08);margin-bottom:1.25rem}
.profile-menu-filter{padding:.45rem .9rem;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;background:transparent;font-family:var(--font-body);font-size:.875rem;font-weight:600;color:var(--ink);cursor:pointer;transition:color .15s,border-color .15s;white-space:nowrap}
.profile-menu-filter:hover{color:var(--ink)}
.profile-menu-filter--active{color:var(--ink);border-bottom-color:var(--pink)}
.profile-service-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.875rem}
.profile-service-card{display:flex;align-items:center;gap:.85rem;padding:.75rem;border-radius:14px;background:var(--cream,#fff);border:1px solid rgba(0,0,0,.07);text-decoration:none;color:inherit;transition:box-shadow .15s}
.profile-service-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);border-color:rgba(219,39,119,.2)}.profile-service-card--outlined{background:var(--cream);border:1.5px solid var(--card-outline,var(--ink))}.profile-service-card--outlined:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);border-color:var(--ink)}
.profile-service-card__img{width:64px;height:64px;border-radius:12px;flex-shrink:0;background:linear-gradient(145deg,#e8e3db,#d6d0c7);background-size:cover;background-position:center}
.profile-service-card__body{flex:1;min-width:0}
.profile-service-card__name{font-weight:700;font-size:.88rem;color:var(--ink);line-height:1.3}
.profile-service-card__price{font-size:.83rem;font-weight:700;color:var(--ink);margin-top:.15rem}
.profile-service-card__duration{font-size:.76rem;color:var(--muted)}
.profile-location-section{padding:2.5rem 0;background:var(--cream);border-top:1px solid rgba(0,0,0,.06)}
.profile-location-head{margin-bottom:1.25rem}
.profile-location-head h2{font-family:var(--font-display);font-size:clamp(1.4rem,2.5vw,2rem);font-weight:700;color:var(--ink);margin:0;border-bottom:2px solid var(--pink);display:inline-block;padding-bottom:.2rem}
.profile-location-card{background:var(--cream,#fff);border-radius:20px;border:1px solid rgba(0,0,0,.07);overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06)}
.profile-location-info{padding:1.25rem 1.5rem;display:flex;flex-wrap:wrap;gap:1.25rem 2.5rem}
.profile-location-col h3{font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 .4rem}
.profile-location-col p{margin:.2rem 0;color:var(--ink);font-size:.9rem}
.profile-location-col a{color:var(--pink);text-decoration:none}
.profile-location-col a:hover{text-decoration:underline}
.profile-ig-link a{display:inline-flex;align-items:center;gap:.35rem}
.profile-social-link{margin:.2rem 0}
.profile-social-link a{color:var(--text-link,var(--pink));text-decoration:none}
.profile-social-link a:hover{text-decoration:underline}
.profile-ig-icon{width:15px;height:15px;flex-shrink:0;vertical-align:middle;color:var(--pink)}
.profile-location-map{width:100%;height:240px;border:0;border-top:1px solid rgba(0,0,0,.06);display:block}
.profile-location-map--preview{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.05);color:var(--muted);font-size:.85rem;font-weight:600}
.profile-service-card-wrap{display:flex;flex-direction:column}
.profile-service-card-wrap .profile-service-card{flex:1}
.profile-service-card__expand-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:.45rem .75rem;background:transparent;border:none;border-top:1px solid rgba(0,0,0,.07);cursor:pointer;font-family:var(--font-body);font-size:.76rem;font-weight:400;color:var(--muted);text-align:left;gap:.5rem}
.profile-service-card__expand-label{font-size:inherit;font-weight:inherit;color:inherit}
.profile-service-card__expand-btn:hover{color:var(--pink)}
.profile-service-card__expand-chevron{flex-shrink:0;transition:transform .2s}
.profile-service-card__expand-btn.is-open .profile-service-card__expand-chevron{transform:rotate(180deg)}
.profile-service-card__desc{padding:.65rem .75rem .75rem;font-size:.85rem;line-height:1.6;color:var(--muted);border-top:1px solid rgba(0,0,0,.06);background:rgba(0,0,0,.02);border-radius:0 0 14px 14px}
[hidden]{display:none!important}
@media(max-width:680px){.profile-hero__grid{grid-template-columns:1fr}.profile-photo{aspect-ratio:4/3;max-height:260px;width:100%;margin:0 auto;justify-self:center}.profile-service-grid{grid-template-columns:1fr}}
.profile-hero--stack{overflow:hidden}
.profile-hero--cover{padding:0}
.profile-hero--cover .profile-hero__grid{display:block;width:100%;max-width:100%;margin:0;padding:0}
.profile-hero--cover .profile-photo{width:100%;aspect-ratio:unset;height:100dvh;min-height:480px;max-height:none;border-radius:0;box-shadow:none}
.profile-hero--cover .profile-photo__bg{background-position:center;background-size:cover;min-height:unset;height:100%;position:relative}
.profile-cover-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.12) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,.62) 100%);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:2rem 1.5rem;gap:1.1rem}
.profile-cover-overlay .profile-cover-brand{font-size:clamp(1.85rem,6vw,3rem);font-weight:700;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.45);font-family:var(--font-display);line-height:1.15;max-width:18ch}
.profile-cover-overlay .profile-book-btn{align-self:center;padding:.75rem 1.75rem;font-size:1rem;background:#fff;color:var(--ink);box-shadow:0 4px 24px rgba(0,0,0,.28)}
.profile-cover-overlay .profile-book-btn:hover{opacity:.92}
.profile-photo__bg--blurred{background-image:none!important;overflow:hidden}
.profile-photo__bg--blurred::before{content:'';position:absolute;inset:-28px;background-image:var(--hero-cover-bg);background-size:cover;background-position:var(--hero-cover-position,center center);filter:blur(14px);transform:scale(1.06);z-index:0}
.profile-photo__bg--blurred .profile-cover-overlay{z-index:1}
.profile-hero--cover .profile-info{padding:2rem 0 .5rem;scroll-margin-top:4.5rem}
#site-main-content{scroll-margin-top:4.5rem}
body.hero-layout-cover .profile-nav:not(.profile-nav--cover-splash) .profile-brand{visibility:hidden}
body.page-cover-splash .preview-banner{display:none!important}
body.page-cover-splash{margin:0;overflow:hidden;height:100dvh;background:var(--cream,#fafafa)}
body.page-cover-splash .profile-nav--cover-splash{display:block!important;position:fixed;top:0;left:0;right:0;z-index:30;background:transparent!important;border:none;box-shadow:none;padding:.875rem 0;pointer-events:none}
body.page-cover-splash .profile-nav--cover-splash .profile-nav__inner{pointer-events:auto}
body.page-cover-splash .profile-nav--cover-splash .profile-brand{visibility:visible!important;color:var(--text-splash-brand,#fff);text-shadow:0 1px 10px rgba(0,0,0,.55)}
body.page-cover-splash .profile-nav--cover-splash .profile-book-btn{display:none!important}
body.page-cover-splash .profile-nav:not(.profile-nav--cover-splash){display:none!important}
body.page-cover-splash .profile-hero--cover{padding:0;margin:0;background:transparent}
body.page-cover-splash .profile-hero--cover .container{width:100%;max-width:100%;margin:0;padding:0}
body.page-cover-splash .profile-hero--cover .profile-photo{width:100%;aspect-ratio:unset;height:100dvh;min-height:320px;max-height:none;border-radius:0;box-shadow:none}
body.page-cover-splash .profile-hero--cover .profile-photo__bg{min-height:100%;height:100%;position:relative}
body.page-cover-splash .profile-below-hero{display:none!important}
body.preview-cover-on-book{overflow:auto;height:auto;min-height:100%;background:var(--cream,#fafafa)}
body.preview-cover-on-book.page-book .profile-nav{position:sticky;top:0;z-index:100}
body.preview-cover-on-book .preview-cover-splash{display:none!important}
.preview-cover-book[hidden]{display:none!important}
.preview-cover-book:not([hidden]){display:block}
.profile-book-intro{padding:1rem 0 .25rem}
body.page-book .profile-nav .profile-brand{visibility:visible}
html{scroll-behavior:smooth}
.profile-hero-stack{display:block;width:100%}
.profile-hero-stack__img{display:block;width:100%;max-width:100%;aspect-ratio:3/1;object-fit:cover;object-position:center}
.profile-hero-stack--tall{display:flex;flex-direction:column;align-items:center;width:100%}
.profile-hero-stack--tall .profile-hero-stack__img{aspect-ratio:4/9;width:min(92vw,400px);max-width:400px}
.profile-hero--stack .profile-hero__grid{grid-template-columns:1fr;padding-top:1.5rem}
.profile-hero--stack .profile-photo{display:none}
.profile-about-head,.profile-policy-head,.profile-menu-head h2,.profile-location-head h2,.profile-faq-head h2{color:var(--text-heading,var(--ink));border-bottom-color:var(--text-accent,var(--pink))}
.profile-about-body,.profile-policy-body{color:var(--text-body,var(--muted))}
.profile-menu-blurb,.profile-service-card__duration,.profile-service-card__expand-btn,.profile-service-card__desc,.profile-faq-item__answer{color:var(--text-muted,var(--muted))}
.profile-service-card__name,.profile-faq-item__question-text{color:var(--text-service-name,var(--ink))}
.profile-service-card__price{color:var(--text-price,var(--ink))}
.profile-menu-filter{color:var(--text-heading,var(--ink))}
.profile-menu-filter:hover{color:var(--text-heading,var(--ink))}
.profile-menu-filter--active{color:var(--text-heading,var(--ink));border-bottom-color:var(--text-accent,var(--pink))}
.profile-location-col a,.profile-ig-link a{color:var(--text-link,var(--pink))}
.profile-brand{color:var(--text-nav,var(--nav-text,#fff))}
.profile-book-btn:not(.profile-book-btn--cover-splash){color:var(--text-nav-button,var(--pink));background:var(--text-nav-button-bg,var(--ink))}
.profile-cover-overlay .profile-cover-brand{color:var(--text-splash-brand,#fff)}
.profile-cover-overlay .profile-book-btn{color:var(--text-splash-button,var(--ink));background:var(--text-splash-button-bg,#fff)}
.profile-hero__grid--photo-only{grid-template-columns:1fr}
.profile-hero__grid--photo-only .profile-photo{max-width:min(520px,100%);margin:0 auto;justify-self:center}
.profile-hero__grid--no-photo{grid-template-columns:1fr}
.profile-hero--hidden{display:none!important}
.profile-hero__grid--in-main{margin:0}
.profile-header-main-section .profile-photo{aspect-ratio:3/4;max-height:320px}
.profile-reviews-section{padding:2.5rem 0 1.75rem;background:var(--review-surface,var(--cream,#fff));border-top:1px solid rgba(0,0,0,.06)}
.profile-reviews-head.profile-menu-head{margin-bottom:1.35rem;text-align:center}
.profile-reviews-head.profile-menu-head h2{color:var(--text-heading,var(--ink));border-bottom:none;display:block;padding-bottom:0}
.profile-reviews-marquee{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.profile-reviews-marquee__track{display:flex;gap:.875rem;width:max-content;animation:profile-reviews-scroll 42s linear infinite}
.profile-reviews-marquee__track:hover{animation-play-state:paused}
@keyframes profile-reviews-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.profile-review-card{flex:0 0 300px;display:flex;flex-direction:column;align-items:stretch;gap:0;text-align:left;padding:1rem 1.05rem;border-radius:12px;background:var(--review-surface,var(--cream,#fff));border:1px solid rgba(0,0,0,.1);font-family:var(--font-body);color:inherit;cursor:pointer;transition:border-color .15s}
.profile-review-card:hover{border-color:rgba(0,0,0,.16)}
.profile-review-card__stars{display:flex;gap:.12rem;margin:0 0 .55rem}
.profile-review-star{color:rgba(0,0,0,.18);font-size:.82rem;line-height:1}
.profile-review-star.is-filled{color:#facc15}
.profile-review-card__message{margin:0;color:var(--text-body,var(--muted));font-size:.84rem;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.profile-review-card__name{margin:0 0 .4rem;font-weight:700;font-size:.95rem;color:var(--text-heading,var(--ink));line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.profile-review-modal{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:1.25rem}
.profile-review-modal[hidden]{display:none!important}
.profile-review-modal__backdrop{position:absolute;inset:0;background:rgba(10,10,10,.55)}
.profile-review-modal__card{position:relative;z-index:1;width:min(520px,100%);background:var(--cream,#fff);border-radius:14px;padding:1.35rem 1.25rem 1.25rem;border:1px solid rgba(0,0,0,.08);box-shadow:0 20px 60px rgba(0,0,0,.18);font-family:var(--font-body)}
.profile-review-modal__close{position:absolute;top:.65rem;right:.75rem;border:none;background:none;font-size:1.6rem;line-height:1;color:var(--muted);cursor:pointer}
.profile-review-modal__name{margin:0 0 .4rem;font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--ink)}
.profile-review-modal__stars{margin:0 0 .75rem;display:flex;gap:.12rem}
.profile-review-modal__message{margin:0;color:var(--muted);font-size:.95rem;line-height:1.55;white-space:pre-wrap}
body.styld-preview-desktop{overflow-x:hidden}
body.styld-preview-embedded:not(.styld-preview-desktop) .profile-hero{padding:1.25rem 0 1rem}
body.styld-preview-embedded:not(.styld-preview-desktop) .profile-hero__grid{gap:1rem}
body.styld-preview-embedded:not(.styld-preview-desktop) .profile-photo{max-height:220px}
body.styld-preview-embedded:not(.styld-preview-desktop) .profile-header-main-section .profile-photo{max-height:220px}
body.styld-preview-embedded.page-cover-splash{height:100%;min-height:100%}
body.styld-preview-embedded.page-cover-splash .profile-hero--cover .profile-photo{height:100%;min-height:280px;max-height:none}
body.styld-preview-embedded.page-cover-splash .profile-hero--cover .profile-photo__bg{min-height:280px}
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatFaqAnswer(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export type SitePreviewReview = {
  clientName: string;
  rating: number;
  message: string;
};

export type SitePreviewContext = {
  reviews?: SitePreviewReview[];
  reviewsEnabled?: boolean;
};

export type SitePreviewStyle = {
  id?: string;
  title: string;
  description: string;
  priceLabel: string;
  sizeLabel?: string;
  durationLabel?: string;
  imageUrl?: string | null;
  category?: string;
};

export type SitePreviewPortfolioMedia = {
  url: string;
  mediaType: PortfolioMediaType;
};

export type SitePreviewTheme = {
  heroLayout: HeroLayout;
  heroImageUrl?: string | null;
  logoImageUrl?: string | null;
  heroStackImageUrls?: string[];
  heroImageFocusX?: number;
  heroImageFocusY?: number;
  heroStackImageFocus?: HeroImageFocus[];
  heroStackImageFormat?: 'wide' | 'tall';
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  navbarColor?: string | null;
  cardOutlineColor?: string | null;
  zoomedOut?: boolean;
  styleCardLayout?: StyleCardLayout;
  fontFamily?: FontFamily | null;
  templateId?: TemplateId | null;
  hideBookNowButton?: boolean;
  /** True when rendered inside the compact editor WebView (Desktop preview pane). */
  embeddedPreview?: boolean;
  /** Cover layout: open on the scrollable book/home page instead of the splash screen. */
  coverPreviewOnBookPage?: boolean;
  heroCoverBlur?: boolean;
  heroPhotoEnabled?: boolean;
  textColors?: SiteTextColors;
  textColorSources?: SiteTextColorSources;
  portfolioMedia?: SitePreviewPortfolioMedia[];
};

export const DEFAULT_PREVIEW_THEME: SitePreviewTheme = {
  heroLayout: 'banner',
  heroImageUrl: null,
  logoImageUrl: null,
  primaryColor: '#db2777',
  secondaryColor: '#0a0a0a',
  backgroundColor: null,
  zoomedOut: false,
  fontFamily: 'cormorant',
  templateId: 'profile',
};

export function buildSitePreviewTheme(
  theme: SiteTheme,
  assets: {
    heroImageUrl?: string | null;
    logoImageUrl?: string | null;
    heroStackImageUrls?: string[];
    portfolioMedia?: SitePreviewPortfolioMedia[];
  },
  options?: {
    zoomedOut?: boolean;
    embeddedPreview?: boolean;
    coverPreviewOnBookPage?: boolean;
  },
): SitePreviewTheme {
  return {
    heroLayout: normalizeHeroLayout(theme.heroLayout),
    heroImageUrl: assets.heroImageUrl,
    logoImageUrl: assets.logoImageUrl,
    heroStackImageUrls: assets.heroStackImageUrls,
    heroImageFocusX: theme.heroImageFocusX,
    heroImageFocusY: theme.heroImageFocusY,
    heroStackImageFocus: theme.heroStackImageFocus,
    heroStackImageFormat: theme.heroStackImageFormat,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    backgroundColor: theme.backgroundColor,
    navbarColor: theme.navbarColor,
    cardOutlineColor: theme.cardOutlineColor,
    styleCardLayout: theme.styleCardLayout,
    fontFamily: theme.fontFamily,
    templateId: theme.templateId,
    hideBookNowButton: theme.hideBookNowButton,
    heroCoverBlur: theme.heroCoverBlur,
    heroPhotoEnabled: theme.heroPhotoEnabled,
    textColors: theme.textColors,
    textColorSources: theme.textColorSources,
    portfolioMedia: assets.portfolioMedia ?? [],
    zoomedOut: options?.zoomedOut ?? false,
    embeddedPreview: options?.embeddedPreview ?? false,
    coverPreviewOnBookPage: options?.coverPreviewOnBookPage ?? false,
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    '#' +
    rgb
      .map((c) => Math.max(0, Math.round(c * factor)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lightenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    '#' +
    rgb
      .map((c) => Math.min(255, Math.round(c + (255 - c) * factor)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function buildColorOverrideCss(theme: SitePreviewTheme): string {
  const primary = theme.primaryColor || '#db2777';
  const secondary = theme.secondaryColor || '#0a0a0a';
  const primaryDark = darkenHex(primary, 0.68);
  const primaryLight = lightenHex(primary, 0.22);
  const primaryHeading = lightenHex(primary, 0.1);
  const fontOpt = FONT_FAMILY_OPTIONS.find((f) => f.id === theme.fontFamily);
  const fontDisplay = fontOpt ? fontOpt.css : '"Cormorant Garamond", Georgia, serif';
  const fontBody = fontOpt ? fontOpt.bodyCss : '"Source Sans 3", system-ui, sans-serif';
  const bgColor = theme.backgroundColor && /^#[0-9a-fA-F]{6}$/.test(theme.backgroundColor)
    ? theme.backgroundColor
    : null;
  // Only set --cream (body/section background) to the user's chosen color.
  // --white is intentionally NOT overridden so service cards remain visually
  // distinct from the page background.
  const bgPart = bgColor ? `--cream:${bgColor};--white:${bgColor};` : '';
  const navbarColor = theme.navbarColor && /^#[0-9a-fA-F]{6}$/.test(theme.navbarColor)
    ? theme.navbarColor
    : null;
  const navBgPart = navbarColor ? `--nav-bg:${navbarColor};--nav-bg-solid:${navbarColor};` : '';
  const navTextPart = `--nav-text:${secondary};`;
  const cardOutlineColor = theme.cardOutlineColor && /^#[0-9a-fA-F]{6}$/.test(theme.cardOutlineColor)
    ? theme.cardOutlineColor : null;
  const cardOutlinePart = cardOutlineColor ? `--card-outline:${cardOutlineColor};` : '';
  const secRgb = hexToRgb(secondary);
  const mutedPart = secRgb
    ? `--muted:rgba(${secRgb[0]},${secRgb[1]},${secRgb[2]},0.62);--muted-soft:rgba(${secRgb[0]},${secRgb[1]},${secRgb[2]},0.46);`
    : '';
  const primaryRgb = hexToRgb(primary);
  const primaryLuminance = primaryRgb
    ? (0.299 * primaryRgb[0] + 0.587 * primaryRgb[1] + 0.114 * primaryRgb[2]) / 255
    : 0;
  const filterActiveText = primaryLuminance > 0.5 ? '#000000' : '#ffffff';
  const hideBookNowPart = theme.hideBookNowButton
    ? '.profile-nav .profile-book-btn{display:none!important}'
    : '';
  const textColorsPart = buildTextColorsCssFromTheme({
    ...DEFAULT_SITE_THEME,
    primaryColor: primary,
    secondaryColor: secondary,
    backgroundColor: bgColor,
    navbarColor: navbarColor,
    textColors: theme.textColors ?? {},
    textColorSources: theme.textColorSources ?? {},
  });
  return `:root{--pink:${primary};--pink-dark:${primaryDark};--pink-heading:${primaryHeading};--hero-pink:${primaryLight};--hero-pink-deep:${primaryDark};--pink-light:${primaryLight};--ink:${secondary};--font-display:${fontDisplay};--font-body:${fontBody};--filter-active-text:${filterActiveText};${bgPart}${navBgPart}${navTextPart}${mutedPart}${cardOutlinePart}${textColorsPart}}${hideBookNowPart}`;
}

export function getSitePreviewPageUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_SITE_PREVIEW_URL?.trim().replace(/\/$/, '');
  if (!base) return null;
  return `${base}/preview.html`;
}

/** In-preview click handling — embedded in inline HTML; also injected for hosted preview. */
export const STYLD_PREVIEW_INTERACTIONS_SCRIPT = `
(function(){
  if(window.__styldPreviewBound) return;
  window.__styldPreviewBound = true;
  function renderReviewStars(rating){
    var n=Math.max(1,Math.min(5,Math.round(Number(rating)||5)));
    var html='';
    for(var i=1;i<=5;i+=1){
      html+='<span class="profile-review-star'+(i<=n?' is-filled':'')+'">★</span>';
    }
    return html;
  }
  document.addEventListener('click', function(e){
    if(e.target&&e.target.classList&&e.target.classList.contains('profile-review-modal__backdrop')){
      var modalBackdrop=e.target.closest('.profile-review-modal');
      if(modalBackdrop) modalBackdrop.hidden=true;
      return;
    }
    var link = e.target && e.target.closest ? e.target.closest('a') : null;
    if(link){
      var action = link.getAttribute('data-styld-preview') || '';
      var href = (link.getAttribute('href') || '').trim();
      var coverBook = document.getElementById('preview-cover-book');
      if(action === 'open-book' || (coverBook && link.classList.contains('profile-book-btn--cover-splash'))){
        e.preventDefault();
        e.stopPropagation();
        if(window.showStyldPreviewCoverBook) window.showStyldPreviewCoverBook();
        return false;
      }
      if(action === 'open-splash' && coverBook && !coverBook.hasAttribute('hidden')){
        e.preventDefault();
        e.stopPropagation();
        if(window.showStyldPreviewCoverSplash) window.showStyldPreviewCoverSplash();
        return false;
      }
      if(href.indexOf('/booking') === 0 || href === '/book'){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if(link.classList.contains('profile-service-card') || link.classList.contains('style-pill')){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if(href && href !== '#' && href.indexOf('javascript:') !== 0){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return;
    }
    var btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if(btn){
      if(btn.id === 'profile-nav-menu-btn'){
        e.preventDefault();
        var drawer = document.getElementById('profile-nav-drawer');
        if(drawer){
          var opening = drawer.hidden;
          drawer.hidden = !opening;
          btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        }
        return;
      }
      if(btn.classList.contains('profile-review-card')){
        e.preventDefault();
        var reviewModal=document.getElementById('profile-review-modal');
        if(!reviewModal) return;
        var starsEl=document.getElementById('profile-review-modal-stars');
        var nameEl=document.getElementById('profile-review-modal-name');
        var messageEl=document.getElementById('profile-review-modal-message');
        if(starsEl) starsEl.innerHTML=renderReviewStars(btn.getAttribute('data-review-rating'));
        if(nameEl) nameEl.textContent=btn.getAttribute('data-review-name')||'Client';
        if(messageEl) messageEl.textContent=btn.getAttribute('data-review-message')||'';
        reviewModal.hidden=false;
        return;
      }
      if(btn.classList.contains('profile-review-modal__close')){
        e.preventDefault();
        var closeModal=document.getElementById('profile-review-modal');
        if(closeModal) closeModal.hidden=true;
        return;
      }
      if(!btn.getAttribute('onclick')){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }, true);
  document.addEventListener('submit', function(e){ e.preventDefault(); }, true);
})();
`;

export function buildSitePreviewInjection(
  content: SiteContent,
  styles: SitePreviewStyle[] = [],
  theme: SitePreviewTheme = DEFAULT_PREVIEW_THEME,
  context: SitePreviewContext = {},
): string {
  const colorCss = buildColorOverrideCss(theme);
  const colorInject = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(colorCss)};document.head.appendChild(s);})();`;
  const reviewsJson = JSON.stringify(context.reviews ?? []);
  const reviewsSettingsJson = JSON.stringify({ enabled: context.reviewsEnabled !== false });
  return `window.__STYLD_SITE_CONTENT__=${JSON.stringify(content)};window.__STYLD_SITE_STYLES__=${JSON.stringify(styles)};window.__STYLD_SITE_THEME__=${JSON.stringify(theme)};window.__STYLD_SITE_REVIEWS__=${reviewsJson};window.__STYLD_REVIEWS_SETTINGS__=${reviewsSettingsJson};${colorInject}`;
}

function heroImageAttr(url: string | null | undefined, focus?: HeroImageFocus): string {
  if (!url) return '';
  const position = focus ? focusToBackgroundPosition(focus) : 'center';
  return ` style="background-image:url('${url.replace(/'/g, '%27')}');background-size:cover;background-position:${position};"`;
}

function stackImageTag(url: string, focus?: HeroImageFocus): string {
  const position = focus ? focusToBackgroundPosition(focus) : 'center';
  return `<img class="profile-hero-stack__img" src="${url.replace(/"/g, '%22')}" alt="" loading="lazy" style="object-position:${position};"/>`;
}

function buildHeroCtasHtml(): string {
  return `<div class="hero-ctas hero-ctas--landing hero-ctas--scale"><a class="hero-btn hero-btn--outline-light hero-btn--lg" href="#preview-menu-section">Browse menu &amp; prices</a>
<a class="hero-btn hero-btn--gold hero-btn--lg" href="/booking">Book now</a></div>`;
}

function buildHeroInnerHtml(content: SiteContent, theme: SitePreviewTheme): string {
  const brand = escapeHtml(content.brandName);
  const left = escapeHtml(content.taglineLeft);
  const r1 = escapeHtml(content.taglineRightLine1);
  const r2 = escapeHtml(content.taglineRightLine2);
  const img = heroImageAttr(theme.heroImageUrl, {
    x: theme.heroImageFocusX ?? 50,
    y: theme.heroImageFocusY ?? 22,
  });
  const visualClass = theme.heroImageUrl
    ? 'hero-scale-visual hero-scale-visual--photo'
    : 'hero-scale-visual';
  const ctas = buildHeroCtasHtml();

  if (theme.heroLayout === 'minimal') {
    return `<div class="hero-scale-layout hero-layout--minimal">
<h1 class="hero-scale-title"><span class="hero-scale-title__grid">
<span class="hero-scale-col hero-scale-col--center">
<span class="hero-scale-kicker">${brand}</span>
<span class="hero-scale-display hero-scale-display--ink">${left}</span>
<span class="hero-scale-display hero-scale-display--brand"><span class="hero-scale-display__line">${r1}</span><span class="hero-scale-display__line">${r2}</span></span>
</span></span></h1>${ctas}</div>`;
  }

  if (theme.heroLayout === 'banner') {
    return `<div class="hero-scale-layout hero-layout--image-below">
<span class="${visualClass}"${img}></span>
<h1 class="hero-scale-title"><span class="hero-scale-col hero-scale-col--center">
<span class="hero-scale-kicker">${brand}</span>
<span class="hero-scale-display hero-scale-display--ink">${left}</span>
<span class="hero-scale-display hero-scale-display--brand"><span class="hero-scale-display__line">${r1}</span><span class="hero-scale-display__line">${r2}</span></span>
</span></h1>${ctas}</div>`;
  }

  return `<div class="hero-scale-layout hero-layout--image-below">
<span class="${visualClass}"${img}></span>
<h1 class="hero-scale-title"><span class="hero-scale-col hero-scale-col--center">
<span class="hero-scale-kicker">${brand}</span>
<span class="hero-scale-display hero-scale-display--ink">${left}</span>
<span class="hero-scale-display hero-scale-display--brand"><span class="hero-scale-display__line">${r1}</span><span class="hero-scale-display__line">${r2}</span></span>
</span></h1>${ctas}</div>`;
}

function buildCatalogServiceCardHtml(style: SitePreviewStyle): string {
  const mediaClass = style.imageUrl
    ? 'catalog-service-card__media catalog-service-card__media--photo'
    : 'catalog-service-card__media';
  const mediaStyle = style.imageUrl
    ? ` style="background-image:url('${style.imageUrl.replace(/'/g, '%27')}');"`
    : '';
  const sizeHtml = style.sizeLabel
    ? `<span class="catalog-service-card__size">${escapeHtml(style.sizeLabel)}</span>`
    : '';
  const durationHtml = style.durationLabel
    ? `<span class="catalog-service-card__duration">${escapeHtml(style.durationLabel)}</span>`
    : '';
  const priceHtml = style.priceLabel
    ? `<span class="catalog-service-card__price">${escapeHtml(style.priceLabel)}</span>`
    : '';
  const midHtml =
    sizeHtml || durationHtml || priceHtml
      ? `<div class="catalog-service-card__mid">${sizeHtml}${durationHtml}${priceHtml}</div>`
      : '';

  const bookHref = style.id ? `/booking?style=${encodeURIComponent(style.id)}` : '/booking';
  return `<a class="catalog-service-card" href="${bookHref}"><div class="${mediaClass}" aria-hidden="true"${mediaStyle}></div><div class="catalog-service-card__body"><span class="catalog-service-card__title">${escapeHtml(style.title)}</span>${midHtml}</div></a>`;
}

function buildCatalogServiceCardsHtml(styles: SitePreviewStyle[]): string {
  if (!styles.length) {
    return `<div class="catalog-service-cards catalog-service-cards--popular">${buildCatalogServiceCardHtml({
      title: 'Add styles',
      description: '',
      priceLabel: '',
      sizeLabel: 'Your menu',
    })}</div>`;
  }

  const cards = styles.slice(0, 12).map(buildCatalogServiceCardHtml).join('');
  return `<div class="catalog-service-cards catalog-service-cards--popular">${cards}</div>`;
}

function buildStylePillsHtml(styles: SitePreviewStyle[]): string {
  if (!styles.length) {
    return `<div class="style-pill-list"><a class="style-pill" href="#"><div class="style-pill__img"></div><div class="style-pill__body"><div class="style-pill__name">Add styles</div><div class="style-pill__desc">Your services appear here</div></div></a></div>`;
  }
  const items = styles
    .slice(0, 20)
    .map((style) => {
      const imgHtml = style.imageUrl
        ? `<div class="style-pill__img--bg" style="background-image:url('${style.imageUrl.replace(/'/g, '%27')}')"></div>`
        : `<div class="style-pill__img"></div>`;
      const desc = style.description
        ? `<div class="style-pill__desc">${escapeHtml(style.description)}</div>`
        : style.durationLabel
          ? `<div class="style-pill__desc">${escapeHtml(style.durationLabel)}</div>`
          : '';
      const price = style.priceLabel
        ? `<span class="style-pill__price">${escapeHtml(style.priceLabel)}</span>`
        : '';
      return `<a class="style-pill" href="#">${imgHtml}<div class="style-pill__body"><div class="style-pill__name">${escapeHtml(style.title)}</div>${desc}</div>${price}</a>`;
    })
    .join('');
  return `<div class="style-pill-list">${items}</div>`;
}

function isSectionHidden(content: SiteContent, section: SiteSection): boolean {
  return Array.isArray(content.hiddenSections) && content.hiddenSections.includes(section);
}

function isLocationPartHidden(content: SiteContent, part: LocationPart): boolean {
  return Array.isArray(content.hiddenLocationParts) && content.hiddenLocationParts.includes(part);
}

type ProfilePreviewNavOptions = {
  brandHref?: string;
  bookHref?: string;
  bookPreviewAction?: string;
  activePage?: 'certifications' | 'products' | null;
  coverSplash?: boolean;
};

function buildProfilePreviewNavHtml(
  content: SiteContent,
  logoHtml: string,
  options: ProfilePreviewNavOptions = {},
): string {
  const {
    brandHref = '#',
    bookHref = '#',
    bookPreviewAction = '',
    activePage = null,
    coverSplash = false,
  } = options;

  if (coverSplash) {
    return `<nav class="profile-nav profile-nav--cover-splash" id="profile-nav"><div class="container profile-nav__inner">
<a class="profile-brand" href="#">${logoHtml}<span>${escapeHtml(content.brandName)}</span></a>
</div></nav>`;
  }

  const showCert = !isSectionHidden(content, 'certifications');
  const showProd = !isSectionHidden(content, 'products');
  const showNav = showCert || showProd;

  const certLabel = escapeHtml((content.certificationsTitle || 'Certifications').trim() || 'Certifications');
  const prodLabel = escapeHtml((content.productsTitle || 'Shop').trim() || 'Shop');

  const certLink = `<a class="profile-nav__link${activePage === 'certifications' ? ' is-active' : ''}" href="#" data-nav-page="certifications"${showCert ? '' : ' hidden'}>${certLabel}</a>`;
  const prodLink = `<a class="profile-nav__link${activePage === 'products' ? ' is-active' : ''}" href="#" data-nav-page="products"${showProd ? '' : ' hidden'}>${prodLabel}</a>`;
  const certDrawerLink = `<a class="profile-nav__drawer-link${activePage === 'certifications' ? ' is-active' : ''}" href="#" data-nav-page="certifications"${showCert ? '' : ' hidden'}>${certLabel}</a>`;
  const prodDrawerLink = `<a class="profile-nav__drawer-link${activePage === 'products' ? ' is-active' : ''}" href="#" data-nav-page="products"${showProd ? '' : ' hidden'}>${prodLabel}</a>`;

  const linksHtml = showNav
    ? `<div class="profile-nav__links" id="profile-nav-links"><div class="profile-nav__tabs" id="profile-nav-tabs">${certLink}${prodLink}</div></div>`
    : '';

  const menuBtnHtml = showNav
    ? `<button class="profile-nav__menu-btn" type="button" id="profile-nav-menu-btn" aria-expanded="false" aria-controls="profile-nav-drawer" aria-label="Open menu"><span class="profile-nav__menu-icon" aria-hidden="true"></span></button>`
    : '';

  const drawerHtml = showNav
    ? `<div class="profile-nav__drawer" id="profile-nav-drawer" hidden><div class="container profile-nav__drawer-inner"><div class="profile-nav__drawer-tabs">${certDrawerLink}${prodDrawerLink}</div></div></div>`
    : '';

  const bookActionAttr = bookPreviewAction ? ` data-styld-preview="${bookPreviewAction}"` : '';

  return `<nav class="profile-nav" id="profile-nav"><div class="container profile-nav__inner">
<a class="profile-brand" href="${brandHref}"${bookPreviewAction === 'open-splash' ? ' data-styld-preview="open-splash"' : ''}>${logoHtml}<span>${escapeHtml(content.brandName)}</span></a>
${linksHtml}
<div class="profile-nav__actions">${menuBtnHtml}<a class="profile-book-btn" href="${bookHref}"${bookActionAttr}>Book Now</a></div>
</div>${drawerHtml}</nav>`;
}

function buildPortfolioSectionHtml(content: SiteContent, theme: SitePreviewTheme): string {
  if (isSectionHidden(content, 'portfolio')) return '';
  const items = theme.portfolioMedia ?? [];
  if (!items.length) return '';
  const previewItems = items.slice(0, 5);
  const slides = previewItems
    .map((item) => {
      const safeUrl = escapeHtml(item.url);
      const inner =
        item.mediaType === 'video'
          ? `<button type="button" class="profile-portfolio-item profile-portfolio-item--video profile-portfolio-item-btn"><video src="${safeUrl}" autoplay muted playsinline loop preload="metadata"></video></button>`
          : `<button type="button" class="profile-portfolio-item profile-portfolio-item-btn"><img src="${safeUrl}" alt="" loading="lazy"/></button>`;
      return `<div class="profile-portfolio-carousel__slide">${inner}</div>`;
    })
    .join('');
  const viewMoreSlide =
    items.length > 5
      ? '<a class="profile-portfolio-carousel__slide profile-portfolio-view-more-slide" href="#"><span class="profile-portfolio-view-more-slide__label">View more</span></a>'
      : '';
  const blurb = content.reelsBlurb
    ? `<p class="profile-menu-blurb">${escapeHtml(content.reelsBlurb)}</p>`
    : '';
  const headerViewMore =
    items.length > 5
      ? '<a class="profile-portfolio-view-more" href="#">View more</a>'
      : '';
  return `<section class="profile-portfolio-section" data-site-section="portfolio"><div class="container"><div class="profile-menu-head profile-portfolio-head"><div class="profile-portfolio-head__row"><div class="profile-portfolio-head__copy"><h2>${escapeHtml(content.reelsTitle || 'Our work')}</h2>${blurb}</div>${headerViewMore}</div></div></div><div class="profile-portfolio-carousel-wrap"><div class="profile-portfolio-carousel" aria-label="Our work preview"><div class="profile-portfolio-carousel__track">${slides}${viewMoreSlide}</div></div></div></section>`;
}

function buildFaqSectionHtml(content: SiteContent): string {
  if (isSectionHidden(content, 'faq')) return '';
  const items = (content.faqItems ?? []).filter(
    (item) => item.question?.trim() && item.answer?.trim(),
  );
  if (!items.length) return '';

  const blurb = content.faqBlurb?.trim()
    ? `<p class="profile-menu-blurb">${escapeHtml(content.faqBlurb)}</p>`
    : '';

  const listHtml = items
    .map(
      (item, index) =>
        `<div class="profile-faq-item"><button class="profile-faq-item__question" type="button" aria-expanded="false" aria-controls="preview-faq-answer-${index}" onclick="(function(btn){var answer=btn.nextElementSibling;if(!answer)return;var open=answer.hidden;answer.hidden=!open;btn.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',open?'true':'false');})(this)"><span class="profile-faq-item__question-text">${escapeHtml(item.question)}</span><span class="profile-faq-item__toggle" aria-hidden="true">+</span></button><div class="profile-faq-item__answer" id="preview-faq-answer-${index}" hidden>${formatFaqAnswer(item.answer)}</div></div>`,
    )
    .join('');

  return `<section class="profile-faq-section" data-site-section="faq"><div class="container"><div class="profile-menu-head profile-faq-head"><h2>${escapeHtml(content.faqTitle || 'FAQ')}</h2>${blurb}</div><div class="profile-faq-list">${listHtml}</div></div></section>`;
}

function buildAboutMainSectionHtml(content: SiteContent, aboutBodyHtml: string): string {
  if (isSectionHidden(content, 'aboutMe')) return '';
  return `<section class="profile-ordered-block-section" data-site-section="aboutMe"><div class="container"><div class="profile-section-block" id="profile-about-block"><h2 class="profile-about-head" id="profile-about-title">About Me</h2>${aboutBodyHtml}</div></div></section>`;
}

function buildPoliciesMainSectionHtml(content: SiteContent, policyBodyHtml: string): string {
  if (isSectionHidden(content, 'policies')) return '';
  return `<section class="profile-ordered-block-section" data-site-section="policies"><div class="container"><div class="profile-section-block" id="profile-policy-block"><h3 class="profile-policy-head">Policies</h3>${policyBodyHtml}</div></div></section>`;
}

function heroPhotoVisibleInPreview(theme: SitePreviewTheme): boolean {
  const layout = normalizeHeroLayout(theme.heroLayout);
  if (layout === 'minimal' || layout === 'stack') return false;
  return theme.heroPhotoEnabled !== false;
}

function orderMainSections(
  content: SiteContent,
  theme: SitePreviewTheme,
  menuSection: string,
  visitSection: string,
  aboutBodyHtml: string,
  policyBodyHtml: string,
  options?: {
    sectionOrder?: MainSiteSection[];
    reviews?: SitePreviewReview[];
    reviewsEnabled?: boolean;
  },
): string {
  const order = options?.sectionOrder ?? resolveMainSectionOrder(content);
  const reviews = options?.reviews ?? [];
  const reviewsEnabled = options?.reviewsEnabled ?? true;

  const sections: Record<MainSiteSection, string> = {
    aboutMe: buildAboutMainSectionHtml(content, aboutBodyHtml),
    policies: buildPoliciesMainSectionHtml(content, policyBodyHtml),
    reviews: buildReviewsMainSectionHtml(content, theme, reviews, reviewsEnabled),
    portfolio: buildPortfolioSectionHtml(content, theme),
    menu: menuSection,
    faq: buildFaqSectionHtml(content),
    visit: visitSection,
  };

  const parts: string[] = [];
  for (const sectionId of order) {
    const html = sections[sectionId];
    if (html) parts.push(html);
  }
  return parts.join('');
}

function renderReviewStars(rating: number): string {
  const n = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="profile-review-star${i + 1 <= n ? ' is-filled' : ''}">★</span>`,
  ).join('');
}

function truncateReviewMessage(message: string, max: number): string {
  const text = String(message || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function buildReviewCardHtml(
  review: SitePreviewReview,
  index: number,
): string {
  const preview = escapeHtml(truncateReviewMessage(review.message, 72));
  const name = escapeHtml(review.clientName || 'Client');
  const fullMessage = escapeHtml(review.message);
  return `<button type="button" class="profile-review-card" data-review-index="${index}" data-review-rating="${review.rating}" data-review-name="${name}" data-review-message="${fullMessage}"><p class="profile-review-card__name">${name}</p><div class="profile-review-card__stars" aria-hidden="true">${renderReviewStars(review.rating)}</div><p class="profile-review-card__message">${preview}</p></button>`;
}

function buildReviewsMainSectionHtml(
  content: SiteContent,
  theme: SitePreviewTheme,
  reviews: SitePreviewReview[],
  reviewsEnabled: boolean,
): string {
  if (isSectionHidden(content, 'reviews')) return '';
  const show = reviewsEnabled !== false && reviews.length > 0;
  if (!show) return '';

  const title = escapeHtml(
    (content as SiteContent & { reviewsTitle?: string }).reviewsTitle || 'Client Reviews',
  );
  const cards = reviews.map((review, index) => buildReviewCardHtml(review, index)).join('');
  const track = `<div class="profile-reviews-marquee__track">${cards}${cards}</div>`;

  return `<section class="profile-reviews-section" id="profile-reviews-section" data-site-section="reviews"><div class="container"><div class="profile-reviews-head profile-menu-head"><h2 id="profile-reviews-title">${title}</h2></div></div><div class="profile-reviews-marquee" id="profile-reviews-marquee" aria-label="Client reviews">${track}</div></section>`;
}

function buildReviewModalHtml(): string {
  return `<div id="profile-review-modal" class="profile-review-modal" hidden><div class="profile-review-modal__backdrop" role="presentation"></div><div class="profile-review-modal__card"><button type="button" class="profile-review-modal__close" aria-label="Close">&times;</button><p class="profile-review-modal__name" id="profile-review-modal-name"></p><div class="profile-review-modal__stars" id="profile-review-modal-stars"></div><p class="profile-review-modal__message" id="profile-review-modal-message"></p></div></div>`;
}

function buildProfileServiceCardHtml(style: SitePreviewStyle, outlined = false): string {
  const cls = outlined ? 'profile-service-card profile-service-card--outlined' : 'profile-service-card';
  const imgStyle = style.imageUrl
    ? ` style="background-image:url('${style.imageUrl.replace(/'/g, '%27')}');background-size:cover;background-position:center;"`
    : '';
  const cardHref = '#';
  const cat = style.category?.trim() || '';
  const desc = style.description?.trim() || '';

  const cardLink = `<a class="${cls}" href="${cardHref}"><div class="profile-service-card__img" aria-hidden="true"${imgStyle}></div><div class="profile-service-card__body"><div class="profile-service-card__name">${escapeHtml(style.title)}</div>${style.priceLabel ? `<div class="profile-service-card__price">${escapeHtml(style.priceLabel)}</div>` : ''}${style.durationLabel ? `<div class="profile-service-card__duration">${escapeHtml(style.durationLabel)}</div>` : ''}</div></a>`;

  const expandHtml = desc
    ? `<button class="profile-service-card__expand-btn" type="button" aria-expanded="false" onclick="(function(btn){var w=btn.closest('.profile-service-card-wrap');var d=w&&w.querySelector('.profile-service-card__desc');if(!d)return;var open=d.hidden;d.hidden=!open;btn.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',open?'true':'false');})(this)"><span class="profile-service-card__expand-label">About this service</span><svg class="profile-service-card__expand-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="profile-service-card__desc" hidden>${escapeHtml(desc)}</div>`
    : '';

  return `<div class="profile-service-card-wrap"${cat ? ` data-category="${escapeHtml(cat)}"` : ''}>${cardLink}${expandHtml}</div>`;
}

function buildProfileServiceGridHtml(styles: SitePreviewStyle[], outlined = false): string {
  if (!styles.length) {
    return `<div class="profile-service-grid">${buildProfileServiceCardHtml({ title: 'Add styles in your app', description: '', priceLabel: '', sizeLabel: '' }, outlined)}</div>`;
  }

  const cards = styles.map((s) => buildProfileServiceCardHtml(s, outlined)).join('');

  // Build category filter tabs if any style has a category
  const categories = Array.from(new Set(styles.map((s) => (s.category || '').trim()).filter(Boolean)));
  const filtersHtml = categories.length > 0
    ? `<div class="profile-menu-filters" id="preview-menu-filters">
<button class="profile-menu-filter profile-menu-filter--active" data-filter="__all__" onclick="(function(btn){var filters=btn.closest('.profile-menu-filters');filters.querySelectorAll('.profile-menu-filter').forEach(function(b){b.classList.toggle('profile-menu-filter--active',b===btn)});var grid=document.getElementById('preview-service-grid');if(!grid)return;grid.querySelectorAll('.profile-service-card-wrap').forEach(function(w){w.hidden=false});})(this)">All</button>${categories.map((c) => `<button class="profile-menu-filter" data-filter="${escapeHtml(c)}" onclick="(function(btn){var filters=btn.closest('.profile-menu-filters');filters.querySelectorAll('.profile-menu-filter').forEach(function(b){b.classList.toggle('profile-menu-filter--active',b===btn)});var grid=document.getElementById('preview-service-grid');if(!grid)return;var filter=btn.dataset.filter;grid.querySelectorAll('.profile-service-card-wrap').forEach(function(w){w.hidden=(w.dataset.category||'')!==filter});})(this)">${escapeHtml(c)}</button>`).join('')}
</div>`
    : '';

  return `${filtersHtml}<div class="profile-service-grid" id="preview-service-grid">${cards}</div>`;
}

export function buildProfileSitePreviewHtml(
  content: SiteContent,
  styles: SitePreviewStyle[] = [],
  theme: SitePreviewTheme = DEFAULT_PREVIEW_THEME,
  context: SitePreviewContext = {},
): string {
  const colorOverrideCss = buildColorOverrideCss(theme);
  const viewportContent = theme.zoomedOut
    ? 'width=1120'
    : 'width=device-width,initial-scale=1,maximum-scale=1';

  const logoHtml = theme.logoImageUrl
    ? `<img class="profile-brand__logo-img" src="${theme.logoImageUrl.replace(/"/g, '%22')}" alt="" width="38" height="38" decoding="async"/>`
    : `<div class="profile-brand__logo" aria-hidden="true"></div>`;

  const layout = normalizeHeroLayout(theme.heroLayout);
  const isStack = layout === 'stack';
  const isCover = layout === 'cover';
  const isMinimal = layout === 'minimal';
  const isBanner = layout === 'banner';
  const stackUrls = theme.heroStackImageUrls ?? [];
  const focusStyle =
    theme.heroImageFocusX != null && theme.heroImageFocusY != null
      ? ` background-position:${focusToBackgroundPosition({ x: theme.heroImageFocusX, y: theme.heroImageFocusY })};`
      : '';
  const coverBgPosition =
    theme.heroImageFocusX != null && theme.heroImageFocusY != null
      ? focusToBackgroundPosition({ x: theme.heroImageFocusX, y: theme.heroImageFocusY })
      : 'center center';
  const coverBlur = isCover && theme.heroCoverBlur === true;
  const photoBgClass = coverBlur ? 'profile-photo__bg profile-photo__bg--blurred' : 'profile-photo__bg';
  let photoBgStyle = '';
  if (theme.heroImageUrl) {
    const escapedUrl = theme.heroImageUrl.replace(/'/g, '%27');
    photoBgStyle = coverBlur
      ? ` style="--hero-cover-bg:url('${escapedUrl}');--hero-cover-position:${coverBgPosition};"`
      : ` style="background-image:url('${escapedUrl}');${focusStyle}"`;
  }

  const coverOverlayHtml = isCover
    ? `<div class="profile-cover-overlay"><span class="profile-cover-brand">${escapeHtml(content.brandName)}</span><a class="profile-book-btn profile-book-btn--cover-splash" href="#" data-styld-preview="open-book">Book Now</a></div>`
    : '';

  const aboutHtml = content.heroDescription
    ? `<p class="profile-about-body" id="profile-about-body">${escapeHtml(content.heroDescription)}</p>`
    : `<p class="profile-about-body" id="profile-about-body" style="color:#bbb;font-style:italic">Add your bio in the editor…</p>`;

  const policyBullets = content.bookingPolicy
    ? content.bookingPolicy.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];
  const policyHtml = policyBullets.length > 0
    ? `<ul class="profile-policy-body">${policyBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
    : `<ul class="profile-policy-body"><li style="color:#bbb;font-style:italic;list-style:none">Add your booking policy…</li></ul>`;

  const isOutlined = theme.styleCardLayout === 'outlined';
  const menuSection = isSectionHidden(content, 'menu')
    ? ''
    : `<section class="profile-menu-section" id="preview-menu-section"><div class="container"><div class="profile-menu-head"><h2>${escapeHtml(content.menuTitle || 'Menu')}</h2>${content.menuBlurb ? `<p class="profile-menu-blurb">${escapeHtml(content.menuBlurb)}</p>` : ''}</div>${buildProfileServiceGridHtml(styles, isOutlined)}</div></section>`;

  const address = formatSiteAddress(content);
  const mapsSearchUrl = buildGoogleMapsSearchUrl(address);
  const mapSrc = buildGoogleMapsEmbedUrl(content);

  const hasAddress = !isLocationPartHidden(content, 'address') && address.trim().length > 0;
  const addressColHtml = hasAddress
    ? `<div class="profile-location-col"><h3>Address</h3><p><a href="${escapeHtml(mapsSearchUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(address)}</a></p></div>`
    : '';

  const hasContact = !isLocationPartHidden(content, 'contact') && !!(content.phoneDisplay || content.email);
  const contactColHtml = hasContact
    ? `<div class="profile-location-col"><h3>Contact</h3>${content.phoneDisplay ? `<p>${escapeHtml(content.phoneDisplay)}</p>` : ''}${content.email ? `<p>${escapeHtml(content.email)}</p>` : ''}</div>`
    : '';

  const hasSocial =
    !isLocationPartHidden(content, 'social') && hasAnySocialLink(content.socialLinks);
  const socialColHtml = hasSocial ? buildSocialLinksHtml(content.socialLinks, escapeHtml) : '';

  const mapHtml = !isLocationPartHidden(content, 'map') && mapSrc
    ? `<div class="profile-location-map profile-location-map--preview" aria-hidden="true">Map preview</div>`
    : '';

  const visitTitle = !hasAddress
    ? 'Connect'
    : !hasContact && !hasSocial
      ? 'Visit'
      : escapeHtml(content.visitTitle || 'Visit & Connect');

  const visitSection = isSectionHidden(content, 'visit') || (!hasAddress && !hasContact && !hasSocial)
    ? ''
    : `<section class="profile-location-section" id="preview-visit-section" data-site-section="visit"><div class="container"><div class="profile-location-head"><h2>${visitTitle}</h2></div><div class="profile-location-card"><div class="profile-location-info">${addressColHtml}${contactColHtml}${socialColHtml}</div>${mapHtml}</div></div></section>`;

  const stackFocus = theme.heroStackImageFocus ?? [];
  const stackFormat = theme.heroStackImageFormat === 'tall' ? 'tall' : 'wide';
  const stackImagesHtml = isStack && stackUrls.length > 0
    ? `<div class="profile-hero-stack profile-hero-stack--${stackFormat}">${stackUrls.map((u, i) => stackImageTag(u, stackFocus[i])).join('')}</div>`
    : '';

  const showTopHero = !isCover && !isMinimal && (isBanner || isStack);
  const showHeroPhoto = isCover || (showTopHero && heroPhotoVisibleInPreview(theme));
  const showTopHeroSection = isCover || (showTopHero && (isStack || showHeroPhoto));
  const heroGridClass =
    showTopHeroSection && isBanner
      ? !showHeroPhoto
        ? ' profile-hero__grid--no-photo'
        : ' profile-hero__grid--photo-only'
      : showTopHeroSection && !showHeroPhoto
        ? ' profile-hero__grid--no-photo'
        : '';
  const infoHtml = '';
  const photoColumnHidden = showHeroPhoto ? '' : ' hidden';
  const bookIntroHtml = '';

  const reviews = context.reviews ?? [];
  const reviewsEnabled = context.reviewsEnabled ?? true;
  const mainSectionOptions = {
    reviews,
    reviewsEnabled,
  };

  const heroSectionClass = isStack
    ? 'profile-hero profile-hero--stack'
    : isCover
      ? 'profile-hero profile-hero--cover'
      : !showTopHeroSection
        ? 'profile-hero profile-hero--hidden'
        : 'profile-hero';

  const coverStartOnBook = isCover && theme.coverPreviewOnBookPage === true;

  const bodyClass = [
    isCover
      ? coverStartOnBook
        ? 'tpl-profile page-home page-book preview-cover-on-book hero-layout-cover'
        : 'tpl-profile page-home page-splash page-cover-splash hero-layout-cover'
      : 'tpl-profile page-home',
    theme.zoomedOut ? 'styld-preview-desktop' : '',
    theme.embeddedPreview ? 'styld-preview-embedded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const footerHtml = `<footer class="site-footer site-footer--home-promo"><div class="container footer-bottom">
<p>&copy; ${escapeHtml(content.brandName)}</p>
<p class="footer-built-by"><a class="footer-built-by__link" href="https://styldd.com" target="_blank" rel="noopener noreferrer"><img class="footer-built-by__logo" src="https://styldd.com/assets/styld-icon.png" alt="" width="22" height="22" decoding="async"/><span>Built with Styld</span></a></p></div></footer>`;

  const bookPageMainHtml =
    isCover
      ? `<main>${orderMainSections(content, theme, menuSection, visitSection, aboutHtml, policyHtml, {
          ...mainSectionOptions,
        })}</main>${footerHtml}${buildReviewModalHtml()}`
      : '';

  const belowHeroHtml = isCover
    ? ''
    : `<main>
${orderMainSections(content, theme, menuSection, visitSection, aboutHtml, policyHtml, {
  ...mainSectionOptions,
})}
</main>
${footerHtml}
${buildReviewModalHtml()}`;

  const bookPageNavHtml = buildProfilePreviewNavHtml(content, logoHtml, {
    brandHref: '#',
    bookHref: '#',
    bookPreviewAction: 'open-splash',
  });

  const coverBookPageHtml = isCover
    ? `<div id="preview-cover-book" class="preview-cover-book"${coverStartOnBook ? '' : ' hidden'}>
${bookPageNavHtml}
${bookIntroHtml}
${bookPageMainHtml}
</div>`
    : '';

  const splashWrapOpen = isCover
    ? `<div id="preview-cover-splash" class="preview-cover-splash"${coverStartOnBook ? ' hidden' : ''}>`
    : '';
  const splashWrapClose = isCover ? '</div>' : '';

  const navBookHref = '#';

  const previewBannerHtml =
    isCover && !coverStartOnBook
      ? ''
      : '<div class="preview-banner">Styld preview — this is how your booking site will look</div>';

  const navHtml = isCover
    ? buildProfilePreviewNavHtml(content, logoHtml, { coverSplash: true })
    : buildProfilePreviewNavHtml(content, logoHtml, { bookHref: navBookHref });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="${viewportContent}"/>
<title>${escapeHtml(content.brandName)} | Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${GOOGLE_FONTS_URL}" rel="stylesheet"/>
<style>${SITE_PREVIEW_CSS}${colorOverrideCss}</style>
<script defer>
(function(){
  var coverSplashEl=document.getElementById('preview-cover-splash');
  var coverBookEl=document.getElementById('preview-cover-book');
  function fitCoverPreview(){
    if(!document.body.classList.contains('page-cover-splash')) return;
    var h=document.documentElement.clientHeight||window.innerHeight||0;
    if(h<1) return;
    document.documentElement.style.height=h+'px';
    document.body.style.height=h+'px';
    var photo=document.querySelector('.profile-hero--cover .profile-photo');
    var photoBg=document.getElementById('profile-hero-photo');
    if(photo) photo.style.height=h+'px';
    if(photoBg) photoBg.style.height='100%';
  }
  window.fitCoverPreview=fitCoverPreview;
  window.showStyldPreviewCoverBook=function(){
    try{
      if(!coverBookEl) return;
      document.body.classList.remove('page-cover-splash','page-splash');
      document.body.classList.add('page-book','preview-cover-on-book');
      if(coverSplashEl) coverSplashEl.setAttribute('hidden','');
      coverBookEl.removeAttribute('hidden');
      document.documentElement.style.height='auto';
      document.body.style.height='auto';
      document.body.style.overflow='auto';
      window.scrollTo(0,0);
    }catch(err){}
  };
  window.showStyldPreviewCoverSplash=function(){
    try{
      if(!coverSplashEl) return;
      document.body.classList.add('page-cover-splash','page-splash');
      document.body.classList.remove('page-book','preview-cover-on-book');
      if(coverBookEl) coverBookEl.setAttribute('hidden','');
      coverSplashEl.removeAttribute('hidden');
      document.body.style.overflow='hidden';
      fitCoverPreview();
      window.scrollTo(0,0);
    }catch(err){}
  };
  function bootCoverPreview(){
    if(!document.body.classList.contains('page-cover-splash')) return;
    fitCoverPreview();
    window.addEventListener('resize',fitCoverPreview);
  }
  function fitEmbeddedDesktopPreview(){
    if(!document.body.classList.contains('styld-preview-embedded')) return;
    if(!document.body.classList.contains('styld-preview-desktop')) return;
    var target=1120;
    var vw=window.innerWidth||document.documentElement.clientWidth||target;
    var scale=Math.min(1,vw/target);
    var meta=document.querySelector('meta[name=viewport]');
    if(meta){
      meta.setAttribute('content','width='+target+',initial-scale='+scale+',maximum-scale='+scale+',user-scalable=no');
    }
  }
  window.fitEmbeddedDesktopPreview=fitEmbeddedDesktopPreview;
  function bootEmbeddedDesktopPreview(){
    fitEmbeddedDesktopPreview();
    window.addEventListener('resize',fitEmbeddedDesktopPreview);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bootCoverPreview);
    document.addEventListener('DOMContentLoaded',bootEmbeddedDesktopPreview);
  }else{
    bootCoverPreview();
    bootEmbeddedDesktopPreview();
  }
})();
${STYLD_PREVIEW_INTERACTIONS_SCRIPT}
</script>
</head>
<body class="${bodyClass}">
${previewBannerHtml}
${splashWrapOpen}
${navHtml}
<section class="${heroSectionClass}">${stackImagesHtml}<div class="container profile-hero__grid${heroGridClass}">
<div class="profile-photo" id="profile-photo-wrap"${photoColumnHidden}><div class="${photoBgClass}" id="profile-hero-photo"${photoBgStyle}>${coverOverlayHtml}</div></div>
${infoHtml}
</div></section>
${splashWrapClose}
${coverBookPageHtml}
${belowHeroHtml}
</body></html>`;
}

export function buildSitePreviewHtml(
  content: SiteContent,
  styles: SitePreviewStyle[] = [],
  theme: SitePreviewTheme = DEFAULT_PREVIEW_THEME,
  context: SitePreviewContext = {},
): string {
  if (theme.templateId !== 'classic') {
    return buildProfileSitePreviewHtml(content, styles, theme, context);
  }
  const address = formatSiteAddress(content);
  const mapsSearchUrl = buildGoogleMapsSearchUrl(address);
  const mapSrc = buildGoogleMapsEmbedUrl(content);
  const socialLines = !isLocationPartHidden(content, 'social')
    ? listActiveSocialLinks(content.socialLinks)
        .map(({ platform, value }) => {
          const url = buildSocialUrl(platform.id, value);
          if (!url) return '';
          const label = formatSocialDisplay(platform, value);
          return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
        })
        .filter(Boolean)
        .join('')
    : '';

  const viewportContent = theme.zoomedOut
    ? 'width=800'
    : 'width=device-width,initial-scale=1,maximum-scale=1';

  const colorOverrideCss = buildColorOverrideCss(theme);

  const isPillLayout = theme.styleCardLayout === 'pill';
  const menuInner = isPillLayout ? buildStylePillsHtml(styles) : buildCatalogServiceCardsHtml(styles);
  const menuSection = isSectionHidden(content, 'menu')
    ? ''
    : `<section class="section section-popular-styles" id="preview-menu-section"><div class="container"><div class="section-head section-head--popular">
<h2>${escapeHtml(content.menuTitle || 'Menu')}</h2><p>${escapeHtml(content.menuBlurb || 'Browse our services & prices — book online.')}</p></div>
${menuInner}</div></section>`;

  const aboutSection = isSectionHidden(content, 'about')
    ? ''
    : `<section class="section"><div class="container"><div class="section-head">
<h2>${escapeHtml(content.aboutTitle)}</h2><p>${escapeHtml(content.aboutBody)}</p></div></div></section>`;

  const addressLine2 = [content.addressLine2, content.city, content.state, content.zip]
    .filter(Boolean)
    .join(', ');
  const addressBlock = isLocationPartHidden(content, 'address')
    ? ''
    : address.trim()
      ? `<a class="location-address-link" href="${escapeHtml(mapsSearchUrl)}" target="_blank" rel="noopener noreferrer">${
          content.addressLine1
            ? `<p><strong>${escapeHtml(content.addressLine1)}</strong></p>`
            : ''
        }${addressLine2 ? `<p>${escapeHtml(addressLine2)}</p>` : ''}${
          !content.addressLine1 && !addressLine2
            ? `<p><strong>${escapeHtml(address)}</strong></p>`
            : ''
        }</a>`
      : '';

  const contactBlock = isLocationPartHidden(content, 'contact')
    ? ''
    : `${content.phoneDisplay ? `<p>${escapeHtml(content.phoneDisplay)}</p>` : ''}${content.email ? `<p>${escapeHtml(content.email)}</p>` : ''}`;

  const socialBlock = isLocationPartHidden(content, 'social') ? '' : socialLines;

  const mapBlock =
    isLocationPartHidden(content, 'map') || !mapSrc
      ? ''
      : `<div class="location-map-wrap"><iframe class="location-map" title="Map to ${escapeHtml(address || 'location')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${escapeHtml(mapSrc)}"></iframe></div>`;

  const visitSection = isSectionHidden(content, 'visit')
    ? ''
    : `<section class="section section-alt" id="preview-visit-section"><div class="container"><div class="section-head">
<h2>${escapeHtml(content.visitTitle)}</h2><p>${escapeHtml(content.visitBody)}</p></div>
<div class="info-cards info-cards--location-layout">
<article class="info-card info-card--location"><h3>Location</h3><div class="info-card-body">
${addressBlock}${contactBlock}${socialBlock}${mapBlock}
</div></article></div></div></section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="${viewportContent}"/>
<title>${escapeHtml(content.brandName)} | Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${GOOGLE_FONTS_URL}" rel="stylesheet"/>
<style>${SITE_PREVIEW_CSS}${colorOverrideCss}</style>
</head>
<body class="page-home">
<div class="preview-banner">Styld preview — this is how your booking site will look</div>
<section class="hero-landing">
<div class="hero-landing__bg"></div><div class="hero-landing__vignette"></div>
<header class="hero-nav"><div class="container hero-nav__inner">
<a class="hero-brand" href="#"><span class="hero-brand__logo"></span><span>${escapeHtml(content.brandName)}</span></a>
<div class="hero-nav__panel"><nav class="hero-nav__links"><a href="#">Home</a></nav>
<a class="hero-btn" href="#preview-visit-section">Book Now</a></div></div></header>
<div class="container hero-landing__content">${buildHeroInnerHtml(content, theme)}</div>
</section>
<main>
${menuSection}
${aboutSection}
${visitSection}
</main>
<footer class="site-footer site-footer--home-promo"><div class="container footer-bottom">
<p>&copy; ${escapeHtml(content.brandName)}</p>
<p class="footer-built-by"><a class="footer-built-by__link" href="https://styldd.com" target="_blank" rel="noopener noreferrer"><img class="footer-built-by__logo" src="https://styldd.com/assets/styld-icon.png" alt="" width="22" height="22" decoding="async"/><span>Built with Styld</span></a></p></div></footer>
</body></html>`;
}
