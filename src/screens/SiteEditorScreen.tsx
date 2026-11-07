import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SiteDesignEditor from '../components/site/SiteDesignEditor';
import SitePortfolioEditor from '../components/site/SitePortfolioEditor';
import SitePreviewWebView from '../components/site/SitePreviewWebView';
import SiteSectionOrderEditor from '../components/site/SiteSectionOrderEditor';
import SiteBookingEditor from '../components/site/SiteBookingEditor';
import { useServiceCatalog } from '../context/ServiceCatalogContext';
import { useSiteContent } from '../context/SiteContentContext';
import { useSiteTheme } from '../context/SiteThemeContext';
import { useAppAccess } from '../context/AppAccessContext';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { usePurchases } from '../context/PurchasesContext';
import { socialLinksPreviewText } from '../data/socialLinks';
import { DEFAULT_REVIEWS_SETTINGS, ReviewsSettings, SiteReview } from '../data/reviewsSettings';
import { DEFAULT_STYLE_DURATION_MINUTES, formatStyleDuration, formatStylePriceRange } from '../data/siteStyles';
import { LOCATION_PARTS, LocationPart, portfolioPlacementFromOrder, resolveMainSectionOrder, SITE_SECTIONS, SiteContent, SiteSection, formatSiteAddress } from '../data/siteContent';
import { buildSitePreviewInjection, buildSitePreviewTheme, SitePreviewTheme } from '../lib/sitePreviewHtml';
import { loadReviewsSettings, loadSiteReviews } from '../lib/siteReviews';
import { normalizeHeroLayout } from '../data/siteTheme';
import { getSiteRootDomain, normalizeSubdomain } from '../data/sitePublish';
import { checkSubdomainAvailability } from '../lib/sitePublish';
import { openLiveSiteUrl } from '../lib/openLiveSite';
import { SiteStackParamList } from '../navigation/SiteNavigator';
import { colors } from '../theme';

type Props = NativeStackScreenProps<SiteStackParamList, 'SiteEditor'>;

type EditorTab = 'style' | 'photos' | 'content' | 'booking' | 'order' | 'publish';
type PublishStep = 'idle' | 'publishing' | 'success' | 'error';
type PreviewMode = 'split' | 'fullscreen' | 'hidden';

function SectionHeadingFields({
  title,
  blurb,
  onTitleChange,
  onBlurbChange,
  titlePlaceholder,
  blurbPlaceholder,
}: {
  title: string;
  blurb: string;
  onTitleChange: (value: string) => void;
  onBlurbChange: (value: string) => void;
  titlePlaceholder?: string;
  blurbPlaceholder?: string;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const titleRef = useRef<TextInput>(null);
  const blurbRef = useRef<TextInput>(null);

  return (
    <View style={styles.sectionHeadingBlock}>
      <View style={styles.sectionHeadingRow}>
        <TextInput
          ref={titleRef}
          style={styles.sectionHeadingTitle}
          value={title}
          onChangeText={onTitleChange}
          placeholder={titlePlaceholder}
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          onPress={() => titleRef.current?.focus()}
          hitSlop={8}
          style={styles.sectionHeadingEditBtn}
          accessibilityLabel="Edit section title"
        >
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.sectionHeadingRow}>
        <TextInput
          ref={blurbRef}
          style={styles.sectionHeadingBlurb}
          value={blurb}
          onChangeText={onBlurbChange}
          placeholder={blurbPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          onPress={() => blurbRef.current?.focus()}
          hitSlop={8}
          style={styles.sectionHeadingEditBtn}
          accessibilityLabel="Edit section blurb"
        >
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function ContentSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.contentSection}>
      <Text style={styles.contentSectionTitle}>{title}</Text>
      {hint ? <Text style={styles.helper}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ContentNavRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Pressable style={styles.contentNavRow} onPress={onPress}>
      <View style={styles.navRowBody}>
        <Text style={styles.navRowLabel}>{label}</Text>
        <Text style={styles.navRowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function ContentShowToggle({
  label,
  visible,
  onToggle,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <Pressable style={styles.contentShowToggle} onPress={onToggle}>
      <Text style={styles.contentShowToggleLabel}>{label}</Text>
      <View style={[styles.toggleBox, visible && styles.toggleBoxOn]}>
        {visible ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

function ContentItemRow({
  label,
  value,
  visible,
  onPress,
  onToggleVisible,
}: {
  label: string;
  value: string;
  visible: boolean;
  onPress: () => void;
  onToggleVisible: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={[styles.contentItemRow, !visible && styles.contentItemRowHidden]}>
      <Pressable style={styles.contentItemTap} onPress={onPress}>
        <View style={styles.navRowBody}>
          <Text style={[styles.navRowLabel, !visible && styles.navRowLabelHidden]}>{label}</Text>
          <Text style={styles.navRowValue} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
      <Pressable hitSlop={10} onPress={onToggleVisible} style={styles.contentItemToggle}>
        <View style={[styles.toggleBox, visible && styles.toggleBoxOn]}>
          {visible ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
      </Pressable>
    </View>
  );
}

function visitPartPreview(part: LocationPart, content: SiteContent): string {
  switch (part) {
    case 'address':
      return formatSiteAddress(content).trim() || 'Not set';
    case 'map':
      if (content.mapEmbedUrl?.trim()) {
        const url = content.mapEmbedUrl.trim();
        return url.length > 48 ? `${url.slice(0, 48)}…` : url;
      }
      return formatSiteAddress(content).trim() ? 'Uses your address' : 'Not set';
    case 'contact':
      return [content.phoneDisplay, content.email].filter(Boolean).join(' · ') || 'Not set';
    case 'social':
      return socialLinksPreviewText(content.socialLinks);
    default:
      return 'Not set';
  }
}

function aboutMeHint(heroLayout: string): string {
  const layout = normalizeHeroLayout(heroLayout);
  if (layout === 'cover') return 'Shown on your /book page after the splash screen.';
  if (layout === 'minimal') return 'Shown in your page order — no header photo on this layout.';
  return 'Always its own section — reorder it under Order (separate from Policies).';
}

function policiesHint(heroLayout: string): string {
  const layout = normalizeHeroLayout(heroLayout);
  if (layout === 'cover') return 'Shown as its own section on your /book page.';
  return 'Always its own section — reorder it independently under Order.';
}

export default function SiteEditorScreen({ navigation }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { content, updateContent, isSaving, hasPendingChanges: hasContentPending, saveContentNow, flushPendingSave: flushContentSave } = useSiteContent();
  const { user } = useAuth();
  const { isBuildSiteOnly } = useAppAccess();
  const { isConfigured, isSubscriptionReady, forceCheckSubscriptionStatus } = usePurchases();
  const { sitePublish, publishSite } = useOnboarding();
  const {
    theme,
    updateTheme,
    heroImageUrl,
    logoImageUrl,
    stackImageUrls,
    portfolioMediaUrls,
    uploadPortfolioMedia,
    removePortfolioItem,
    isSaving: isSavingTheme,
    hasPendingChanges: hasThemePending,
    saveThemeNow,
    flushPendingSave: flushThemeSave,
  } = useSiteTheme();
  const { catalogServices, getCoverUrl, getPrice, getStyleMeta, isSaving: isSavingStyles, refresh } =
    useServiceCatalog();
  const [tab, setTab] = useState<EditorTab>('style');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('hidden');
  const [previewKey, setPreviewKey] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [domainInputFocused, setDomainInputFocused] = useState(false);
  const [siteReviews, setSiteReviews] = useState<SiteReview[]>([]);
  const [reviewsSettings, setReviewsSettings] = useState<ReviewsSettings>(DEFAULT_REVIEWS_SETTINGS);
  const scrollRef = useRef<ScrollView>(null);
  const publishScrollY = useRef(0);
  const { height: windowHeight } = useWindowDimensions();

  // Bump the preview key every time this screen comes into focus so the
  // WebView always loads the latest theme/content on re-entry.
  useFocusEffect(
    useCallback(() => {
      setPreviewKey((k) => k + 1);
      return () => {
        void Promise.all([flushContentSave(), flushThemeSave()]);
      };
    }, [flushContentSave, flushThemeSave]),
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    Promise.all([loadSiteReviews(user.id), loadReviewsSettings(user.id)])
      .then(([reviews, settings]) => {
        if (!cancelled) {
          setSiteReviews(reviews);
          setReviewsSettings(settings);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const scrollToDomainField = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, publishScrollY.current - 12),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setDomainInputFocused(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (domainInputFocused && keyboardVisible) {
      scrollToDomainField();
    }
  }, [domainInputFocused, keyboardVisible, scrollToDomainField]);

  const shrinkPreviewForKeyboard =
    previewMode === 'split' && keyboardVisible && tab === 'publish';
  const splitPreviewHeight = shrinkPreviewForKeyboard
    ? Math.round(windowHeight * 0.16)
    : Math.round(windowHeight * 0.52);

  // ── Publish state ──
  const rootDomain = getSiteRootDomain();
  const [subdomain, setSubdomain] = useState('');
  const [publishAvailable, setPublishAvailable] = useState<boolean | null>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishStep, setPublishStep] = useState<PublishStep>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [subdomainAlts, setSubdomainAlts] = useState<string[]>([]);
  const isAlreadyLive = sitePublish.published && sitePublish.publicUrl;

  useEffect(() => {
    if (isAlreadyLive && sitePublish.subdomain) {
      setSubdomain(sitePublish.subdomain);
    }
  }, [isAlreadyLive, sitePublish.subdomain]);

  // ── Animations ──
  const tabAnim = useRef(new Animated.Value(1)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;
  const altsAnim = useRef(new Animated.Value(0)).current;

  const fadeTab = () => {
    tabAnim.setValue(0);
    Animated.timing(tabAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  };

  function generateAlternatives(slug: string): string[] {
    const suffixes = ['2', '3', '-pro', '-studio', '-salon', '-hair'];
    const candidates: string[] = [];
    for (const s of suffixes) {
      const candidate = `${slug}${s}`.replace(/[^a-z0-9-]/g, '').slice(0, 32);
      if (candidate.length >= 2) candidates.push(candidate);
      if (candidates.length >= 3) break;
    }
    return candidates;
  }

  useEffect(() => { fadeTab(); }, [tab]);

  useEffect(() => {
    const slug = normalizeSubdomain(subdomain);
    setSubdomainAlts([]);
    statusAnim.setValue(0);
    altsAnim.setValue(0);
    if (slug.length < 2) {
      setPublishAvailable(null);
      setPublishStatus(null);
      return;
    }
    const currentSlug = normalizeSubdomain(sitePublish.subdomain || '');
    if (isAlreadyLive && slug === currentSlug) {
      setPublishAvailable(true);
      setPublishStatus('Your current domain');
      setSubdomainAlts([]);
      Animated.timing(statusAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await checkSubdomainAvailability(slug, user?.id ?? '');
        setPublishAvailable(result.available);
        if (result.available) {
          setPublishStatus('Available');
          setSubdomainAlts([]);
          Animated.timing(statusAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        } else {
          setPublishStatus(result.reason ?? 'Already taken');
          const alts = generateAlternatives(slug);
          setSubdomainAlts(alts);
          Animated.timing(statusAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          Animated.timing(altsAnim, { toValue: 1, duration: 250, delay: 80, useNativeDriver: true }).start();
        }
      } catch {
        setPublishAvailable(null);
        setPublishStatus(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain, isAlreadyLive, sitePublish.subdomain, user?.id]);

  const runPublish = async (slug: string) => {
    setPublishStep('publishing');
    setPublishError(null);
    try {
      await Promise.all([flushContentSave(), flushThemeSave()]);
      await publishSite(slug);
      setPublishStep('success');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed.');
      setPublishStep('error');
    }
  };

  const handlePublish = async () => {
    const slug = normalizeSubdomain(subdomain);

    if (!isAlreadyLive) {
      if (slug.length < 2) {
        setTab('publish');
        setPublishError('Choose your domain on the Publish tab first.');
        setPublishStep('error');
        return;
      }
      if (publishAvailable === false) {
        setTab('publish');
        setPublishError(publishStatus ?? 'That domain is not available.');
        setPublishStep('error');
        return;
      }
      if (isConfigured && isSubscriptionReady) {
        const entitled = await forceCheckSubscriptionStatus();
        if (!entitled) {
          navigation.navigate('MandatoryPaywall', { pendingSubdomain: slug });
          return;
        }
      }
    }

    await runPublish(slug);
  };

  const canPublish =
    publishStep !== 'publishing' &&
    (isAlreadyLive || (publishAvailable !== false && normalizeSubdomain(subdomain).length >= 2));

  useEffect(() => {
  }, [tab, refresh]);

  const previewStyles = useMemo(
    () =>
      catalogServices.map((service) => {
        const meta = getStyleMeta(service.id);
        const price = getPrice(service.id);
        return {
          id: service.id,
          title: meta?.title ?? service.name,
          description: meta?.description ?? service.description ?? '',
          priceLabel: formatStylePriceRange(price, meta?.addons, meta?.variants),
          sizeLabel: service.variant !== 'STANDARD' ? service.variant : undefined,
          durationLabel: formatStyleDuration(
            meta?.durationMinutes ?? DEFAULT_STYLE_DURATION_MINUTES,
          ),
          imageUrl: getCoverUrl(service.id),
          category: meta?.category ?? '',
        };
      }),
    [catalogServices, getCoverUrl, getPrice, getStyleMeta],
  );

  const previewLayoutKey = useMemo(
    () =>
      [
        normalizeHeroLayout(theme.heroLayout),
        theme.heroPhotoEnabled === false ? '0' : '1',
        theme.heroCoverBlur ? '1' : '0',
        theme.heroStackImageFormat ?? 'wide',
        String(stackImageUrls.length),
      ].join('-'),
    [
      theme.heroLayout,
      theme.heroPhotoEnabled,
      theme.heroCoverBlur,
      theme.heroStackImageFormat,
      stackImageUrls.length,
    ],
  );

  const previewTheme = useMemo<SitePreviewTheme>(
    () =>
      buildSitePreviewTheme(
        theme,
        {
          heroImageUrl,
          logoImageUrl,
          heroStackImageUrls: stackImageUrls,
          portfolioMedia: portfolioMediaUrls,
        },
        {
          zoomedOut: previewMode === 'split',
          coverPreviewOnBookPage: true,
        },
      ),
    [heroImageUrl, logoImageUrl, portfolioMediaUrls, previewMode, stackImageUrls, theme],
  );

  const fullscreenTheme = useMemo<SitePreviewTheme>(
    () => ({
      ...previewTheme,
      zoomedOut: false,
      embeddedPreview: false,
      coverPreviewOnBookPage: true,
    }),
    [previewTheme],
  );

  const isSavingAny = isSaving || isSavingStyles || isSavingTheme || hasContentPending || hasThemePending;

  const flushAllPendingSaves = useCallback(async () => {
    await Promise.all([flushContentSave(), flushThemeSave()]);
    return true;
  }, [flushContentSave, flushThemeSave]);

  const { unsavedChangesDialog } = useUnsavedChangesGuard({
    hasUnsavedChanges: isSavingAny,
    onSave: flushAllPendingSaves,
    message: 'Your site is still saving. Wait a moment or leave without finishing?',
    title: 'Still saving',
  });

  const toggleSection = (sectionId: SiteSection) => {
    const current = content.hiddenSections ?? [];
    const next = current.includes(sectionId)
      ? current.filter((s) => s !== sectionId)
      : [...current, sectionId];
    updateContent({ hiddenSections: next });
  };

  const isSectionVisible = (id: SiteSection) =>
    !(content.hiddenSections ?? []).includes(id);

  const toggleLocationPart = (partId: LocationPart) => {
    const current = content.hiddenLocationParts ?? [];
    const next = current.includes(partId)
      ? current.filter((p) => p !== partId)
      : [...current, partId];
    updateContent({ hiddenLocationParts: next });
  };

  const isLocationPartVisible = (id: LocationPart) =>
    !(content.hiddenLocationParts ?? []).includes(id);

  const insets = useSafeAreaInsets();

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {!isBuildSiteOnly ? (
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Edit site</Text>
        <View style={styles.headerRight}>
          {isSavingAny ? (
            <View style={styles.savingBadge}>
              <View style={styles.savingDot} />
              <Text style={styles.savingText}>Saving</Text>
            </View>
          ) : (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#4ade80" />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          )}
          <Pressable
            style={[styles.publishButton, publishStep === 'publishing' && styles.publishButtonBusy]}
            onPress={handlePublish}
            disabled={publishStep === 'publishing'}
          >
            {publishStep === 'publishing' ? (
              <ActivityIndicator size="small" color={colors.accentPink} />
            ) : publishStep === 'success' ? (
              <>
                <Ionicons name="checkmark-circle" size={15} color="#4ade80" />
                <Text style={[styles.publishButtonText, { color: '#4ade80' }]}>Live</Text>
              </>
            ) : (
              <>
                <Ionicons name="rocket-outline" size={15} color={colors.accentPink} />
                <Text style={styles.publishButtonText}>Publish</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Preview mode controls */}
      <View style={styles.previewControls}>
        <View style={styles.previewModeBar}>
          {([
            ['hidden', 'Edit only', 'create-outline'],
            ['split', 'Desktop', 'desktop-outline'],
            ['fullscreen', 'Mobile', 'phone-portrait-outline'],
          ] as const).map(([mode, label, icon]) => (
            <Pressable
              key={mode}
              style={[styles.previewModeBtn, previewMode === mode && styles.previewModeBtnActive]}
              onPress={() => { setPreviewMode(mode); if (mode !== 'hidden') setPreviewKey((k) => k + 1); }}
            >
              <Ionicons
                name={icon}
                size={14}
                color={previewMode === mode ? colors.accentPink : colors.textMuted}
              />
              <Text
                style={[
                  styles.previewModeBtnText,
                  previewMode === mode && styles.previewModeBtnTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {previewMode !== 'hidden' && (
          <Pressable
            style={styles.previewRefreshBtn}
            onPress={() => setPreviewKey((k) => k + 1)}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Split preview */}
      {previewMode === 'split' ? (
        <View style={[styles.previewWrap, { height: splitPreviewHeight }]}>
          <SitePreviewWebView
            key={`${previewKey}-${previewLayoutKey}`}
            content={content}
            styles={previewStyles}
            theme={previewTheme}
            reviews={siteReviews}
            reviewsEnabled={reviewsSettings.enabled}
            compact
          />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.editorPanel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
      >
        {/* Editor tabs */}
        <View style={styles.tabs}>
          {([
            ['style', 'Style', 'color-palette-outline'],
            ['photos', 'Photos', 'images-outline'],
            ['content', 'Content', 'create-outline'],
            ['booking', 'Booking', 'calendar-outline'],
            ['order', 'Order', 'reorder-three-outline'],
            ['publish', 'Domain', 'globe-outline'],
          ] as const).map(([key, label, icon]) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Ionicons
                name={icon}
                size={16}
                color={tab === key ? colors.accentPink : colors.textMuted}
              />
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'order' ? (
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.orderScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: tabAnim }}>
              <SiteSectionOrderEditor
                order={resolveMainSectionOrder(content)}
                hiddenSections={content.hiddenSections ?? []}
                reviewsEnabled={reviewsSettings.enabled}
                reviewCount={siteReviews.length}
                onOrderChange={(mainSectionOrder) => {
                  const portfolioPlacement = portfolioPlacementFromOrder(mainSectionOrder);
                  const next = { ...content, mainSectionOrder, portfolioPlacement };
                  updateContent({ mainSectionOrder, portfolioPlacement });
                  void saveContentNow(next);
                }}
              />
            </Animated.View>
          </ScrollView>
        ) : tab === 'booking' ? (
          <SiteBookingEditor />
        ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.formScroll}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
        <Animated.View style={{ opacity: tabAnim }}>
        {/* ── Style tab: colors + fonts ── */}
        {tab === 'style' ? (
          <SiteDesignEditor section="style" />
        ) : null}

        {/* ── Photos tab: header layout + images + logo ── */}
        {tab === 'photos' ? (
          <SiteDesignEditor section="photos" />
        ) : null}

        {/* ── Content tab: bio, policy, menu ── */}
        {tab === 'content' ? (
          <>
            <>
                <ContentSection
                  title="About Me"
                  hint={aboutMeHint(theme.heroLayout)}
                >
                  <ContentItemRow
                    label="Bio"
                    value={
                      content.heroDescription
                        ? content.heroDescription.slice(0, 48) +
                          (content.heroDescription.length > 48 ? '…' : '')
                        : 'Not set'
                    }
                    visible={isSectionVisible('aboutMe')}
                    onPress={() => navigation.navigate('HeroAbout')}
                    onToggleVisible={() => toggleSection('aboutMe')}
                  />
                </ContentSection>

                <ContentSection title="Policies" hint={policiesHint(theme.heroLayout)}>
                  <ContentItemRow
                    label="Booking policy"
                    value={
                      content.bookingPolicy
                        ? content.bookingPolicy.split('\n')[0].slice(0, 48) + '…'
                        : 'Not set'
                    }
                    visible={isSectionVisible('policies')}
                    onPress={() => navigation.navigate('HeroPolicy')}
                    onToggleVisible={() => toggleSection('policies')}
                  />
                </ContentSection>
            </>

            <ContentSection title="Services menu">
              <SectionHeadingFields
                title={content.menuTitle}
                blurb={content.menuBlurb}
                onTitleChange={(menuTitle) => updateContent({ menuTitle })}
                onBlurbChange={(menuBlurb) => updateContent({ menuBlurb })}
                titlePlaceholder="Menu"
                blurbPlaceholder="Browse services & prices"
              />
              <Text style={styles.contentFootnote}>
                Edit services and prices in Profile → Style menu.
              </Text>
            </ContentSection>

            <ContentSection title="Previous work">
              <SectionHeadingFields
                title={content.reelsTitle}
                blurb={content.reelsBlurb}
                onTitleChange={(reelsTitle) => updateContent({ reelsTitle })}
                onBlurbChange={(reelsBlurb) => updateContent({ reelsBlurb })}
                titlePlaceholder="Our work"
                blurbPlaceholder="Browse our latest styles and transformations."
              />
              <ContentShowToggle
                label="Show on site"
                visible={isSectionVisible('portfolio')}
                onToggle={() => toggleSection('portfolio')}
              />
              <SitePortfolioEditor
                items={portfolioMediaUrls}
                busy={isSavingTheme}
                onAddMedia={uploadPortfolioMedia}
                onRemoveMedia={removePortfolioItem}
              />
            </ContentSection>

            <ContentSection title="FAQ">
              <SectionHeadingFields
                title={content.faqTitle}
                blurb={content.faqBlurb}
                onTitleChange={(faqTitle) => updateContent({ faqTitle })}
                onBlurbChange={(faqBlurb) => updateContent({ faqBlurb })}
                titlePlaceholder="FAQ"
                blurbPlaceholder="Common questions about booking and our services."
              />
              <ContentShowToggle
                label="Show on site"
                visible={isSectionVisible('faq')}
                onToggle={() => toggleSection('faq')}
              />
              <ContentNavRow
                label="Questions & answers"
                value={
                  content.faqItems.length > 0
                    ? `${content.faqItems.length} question${content.faqItems.length === 1 ? '' : 's'}`
                    : 'Not set'
                }
                onPress={() => navigation.navigate('HeroFaq')}
              />
            </ContentSection>

            <ContentSection title="Visit & contact">
              <SectionHeadingFields
                title={content.visitTitle}
                blurb={content.visitBody}
                onTitleChange={(visitTitle) => updateContent({ visitTitle })}
                onBlurbChange={(visitBody) => updateContent({ visitBody })}
                titlePlaceholder="Visit & connect"
                blurbPlaceholder="Share your studio address or how clients can find you."
              />
              <ContentShowToggle
                label="Show on site"
                visible={isSectionVisible('visit')}
                onToggle={() => toggleSection('visit')}
              />
              {LOCATION_PARTS.map((part) => (
                <ContentItemRow
                  key={part.id}
                  label={part.label}
                  value={visitPartPreview(part.id, content)}
                  visible={isLocationPartVisible(part.id)}
                  onPress={() => navigation.navigate('HeroVisitPart', { part: part.id })}
                  onToggleVisible={() => toggleLocationPart(part.id)}
                />
              ))}
            </ContentSection>

            <ContentSection title="Book Now button">
              <ContentShowToggle
                label="Show Book Now button"
                visible={!theme.hideBookNowButton}
                onToggle={() => updateTheme({ hideBookNowButton: !theme.hideBookNowButton })}
              />
              <Text style={styles.contentFootnote}>
                {theme.heroLayout === 'cover'
                  ? 'Hides the top-right nav button only — your splash page keeps its centered Book Now.'
                  : 'Controls the button in the top-right of your site.'}
              </Text>
            </ContentSection>
          </>
        ) : null}

        {tab === 'publish' ? (
          <View style={styles.publishTab}>
            {/* Status row */}
            {isAlreadyLive ? (
              <View style={styles.publishStatusRow}>
                <View style={styles.publishLiveBadge}>
                  <View style={styles.publishLiveDot} />
                  <Text style={styles.publishLiveText}>Live</Text>
                </View>
                <Text style={styles.publishUrl} numberOfLines={1}>{sitePublish.publicUrl}</Text>
                <Pressable
                  onPress={() => {
                    void (async () => {
                      await Promise.all([flushContentSave(), flushThemeSave()]);
                      await openLiveSiteUrl(sitePublish);
                    })();
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="open-outline" size={16} color={colors.accentPink} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.publishStatusRow}>
                <View style={styles.publishDraftBadge}>
                  <Text style={styles.publishDraftText}>Not published</Text>
                </View>
                <Text style={styles.publishHint}>Use Publish top-right to go live.</Text>
              </View>
            )}

            {publishStep === 'error' && publishError ? (
              <Text style={styles.publishErrorText}>{publishError}</Text>
            ) : null}

            <View style={styles.publishDivider} />

            {/* Domain */}
            <Text style={styles.publishSectionLabel}>Domain</Text>
            <View
              style={styles.publishDomainRow}
              onLayout={(event) => {
                publishScrollY.current = event.nativeEvent.layout.y;
              }}
            >
              <TextInput
                style={styles.publishSubdomainInput}
                value={subdomain}
                onChangeText={(v) => { setSubdomain(v); setPublishStep('idle'); setPublishError(null); }}
                onFocus={() => {
                  setDomainInputFocused(true);
                  scrollToDomainField();
                }}
                onBlur={() => setDomainInputFocused(false)}
                placeholder="your-name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.publishDomainSuffix}>.{rootDomain}</Text>
            </View>
            {publishStatus ? (
              <Animated.Text style={[styles.publishAvailabilityText, publishAvailable ? styles.publishAvailableGreen : styles.publishAvailableRed, { opacity: statusAnim }]}>
                {publishStatus}
              </Animated.Text>
            ) : null}
            {subdomainAlts.length > 0 && (
              <Animated.View style={[styles.publishAltsRow, { opacity: altsAnim }]}>
                <Text style={styles.publishAltsLabel}>Try:</Text>
                {subdomainAlts.map((alt) => (
                  <Pressable
                    key={alt}
                    style={styles.publishAltChip}
                    onPress={() => { setSubdomain(alt); setPublishStep('idle'); setPublishError(null); }}
                  >
                    <Text style={styles.publishAltChipText}>{alt}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}
            <Text style={styles.publishHint}>
              {isAlreadyLive
                ? 'Changing domain takes effect on your next publish.'
                : 'Pick a domain when you are ready — it is saved when you publish.'}
            </Text>
          </View>
        ) : null}
        </Animated.View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Fullscreen preview modal */}
      <Modal
        visible={previewMode === 'fullscreen'}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPreviewMode('split')}
      >
        <View style={[styles.fullscreenContainer, { paddingTop: insets.top }]}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>Live preview</Text>
            <Pressable
              style={styles.fullscreenClose}
              onPress={() => setPreviewMode('split')}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={styles.fullscreenCloseText}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.fullscreenWebView}>
            <SitePreviewWebView
              key={`${previewKey}-${previewLayoutKey}-full`}
              content={content}
              styles={previewStyles}
              theme={fullscreenTheme}
              reviews={siteReviews}
              reviewsEnabled={reviewsSettings.enabled}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    {unsavedChangesDialog}
    </>
  );
}

const BASE_STYLES = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPink,
    opacity: 0.8,
  },
  savingText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    minWidth: 72,
    justifyContent: 'center',
  },
  publishButtonBusy: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '700',
  },
  previewControls: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewModeBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.navbar,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.navbarBorder,
    gap: 2,
  },
  previewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  previewModeBtnActive: {
    backgroundColor: colors.card,
  },
  previewModeBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  previewModeBtnTextActive: {
    color: colors.accentPink,
  },
  previewRefreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.navbarBorder,
  },
  previewWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  editorPanel: {
    flex: 1,
  },
  formScroll: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.navbar,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.navbarBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: colors.accentPink,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  orderScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 10,
  },
  contentSection: {
    marginBottom: 28,
  },
  contentSectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  contentNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  contentShowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 4,
  },
  contentShowToggleLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  contentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  contentItemRowHidden: {
    opacity: 0.65,
  },
  contentItemTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
    gap: 8,
  },
  contentItemToggle: {
    paddingVertical: 12,
    paddingLeft: 4,
  },
  contentFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  sectionHeadingBlock: {
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  sectionHeadingTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  sectionHeadingBlurb: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 36,
    textAlignVertical: 'top',
  },
  sectionHeadingEditBtn: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxOn: {
    backgroundColor: colors.accentPink,
    borderColor: colors.accentPink,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationSectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  locationToggle: {
    padding: 2,
  },
  igRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  igPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
  },
  igAt: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  igInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  // Fullscreen modal
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  fullscreenTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fullscreenCloseText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenWebView: {
    flex: 1,
  },

  // ── Publish tab ──
  publishTab: {
    padding: 20,
    gap: 12,
  },
  publishStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  publishDraftBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  publishDraftText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  publishLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  publishLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  publishLiveText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  publishUrl: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  publishDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  publishSectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  publishDomainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  publishSubdomainInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  publishDomainSuffix: {
    color: colors.textMuted,
    fontSize: 14,
  },
  publishAvailabilityText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  publishAvailableGreen: {
    color: '#4ade80',
  },
  publishAvailableRed: {
    color: '#f87171',
  },
  publishAltsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -4,
  },
  publishAltsLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  publishAltChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  publishAltChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  publishHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
  },
  publishErrorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '500',
  },
  navRowBody: {
    flex: 1,
    gap: 2,
  },
  navRowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  navRowLabelHidden: {
    color: colors.textMuted,
  },
  navRowValue: {
    color: colors.textMuted,
    fontSize: 12,
  },
};
