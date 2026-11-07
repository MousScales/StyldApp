import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useServiceCatalog } from '../../context/ServiceCatalogContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { useSiteTheme } from '../../context/SiteThemeContext';
import { normalizeHeroLayout } from '../../data/siteTheme';
import {
  buildOrderEditorRows,
  flattenOrderEditorRows,
  formatSiteAddress,
  isOrderEditorSectionVisible,
  isReorderableOrderRow,
  MAIN_SITE_SECTIONS,
  MainSiteSection,
  mergeOrderEditorChange,
  moveOrderEditorRows,
  OrderEditorRow,
  OrderEditorVisibilityContext,
  SiteContent,
  SiteSection,
} from '../../data/siteContent';
import { socialLinksPreviewText } from '../../data/socialLinks';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors } from '../../theme';

type SiteSectionOrderEditorProps = {
  order: MainSiteSection[];
  hiddenSections: SiteSection[];
  reviewsEnabled: boolean;
  reviewCount: number;
  onOrderChange: (order: MainSiteSection[]) => void;
};

type SectionPreview = {
  blurb: string;
  detail: string;
  imageUrls: string[];
};

type SectionVisibility = {
  badge?: string;
};

function resolveSectionBadge(
  sectionId: MainSiteSection,
  heroLayout: string,
): SectionVisibility {
  if (
    heroLayout === 'cover' &&
    (sectionId === 'aboutMe' || sectionId === 'policies')
  ) {
    return { badge: '/book page' };
  }
  return {};
}

function clipText(value: string, max = 80): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function firstPolicyLine(policy: string): string {
  const line = policy
    .split('\n')
    .map((row) => row.trim())
    .find(Boolean);
  return line ?? '';
}

function buildSectionPreview(
  sectionId: MainSiteSection,
  content: SiteContent,
  portfolioUrls: string[],
  serviceCount: number,
): SectionPreview {
  switch (sectionId) {
    case 'aboutMe':
      return {
        blurb: clipText(content.heroDescription) || 'Your bio and introduction',
        detail: 'About Me',
        imageUrls: [],
      };
    case 'policies':
      return {
        blurb: clipText(firstPolicyLine(content.bookingPolicy)) || 'Booking rules and cancellation policy',
        detail: 'Policies',
        imageUrls: [],
      };
    case 'reviews':
      return {
        blurb: 'Scrolling star ratings and quotes from clients',
        detail: 'Client Reviews',
        imageUrls: [],
      };
    case 'portfolio':
      return {
        blurb: clipText(content.reelsBlurb) || clipText(content.reelsTitle) || 'Photos and videos of your work',
        detail: content.reelsTitle?.trim() || 'Previous work',
        imageUrls: portfolioUrls.slice(0, 3),
      };
    case 'menu':
      return {
        blurb: clipText(content.menuBlurb) || 'Services, prices, and booking links',
        detail: `${content.menuTitle?.trim() || 'Menu'}${serviceCount > 0 ? ` · ${serviceCount} service${serviceCount === 1 ? '' : 's'}` : ''}`,
        imageUrls: [],
      };
    case 'faq':
      return {
        blurb:
          clipText(content.faqBlurb) ||
          clipText(content.faqItems[0]?.question ?? '') ||
          'Questions and answers for clients',
        detail: content.faqTitle?.trim() || 'FAQ',
        imageUrls: [],
      };
    case 'visit': {
      const address = formatSiteAddress(content);
      const contact = [content.phoneDisplay, content.email].filter(Boolean).join(' · ');
      const social = socialLinksPreviewText(content.socialLinks);
      const detail = [address, contact, social !== 'Not set' ? social : ''].filter(Boolean).join(' · ');
      return {
        blurb: clipText(content.visitBody) || detail || 'Address, map, phone, and social links',
        detail: content.visitTitle?.trim() || 'Visit & contact',
        imageUrls: [],
      };
    }
    default:
      return { blurb: '', detail: '', imageUrls: [] };
  }
}

function orderEditorHint(theme: {
  heroLayout: string;
  heroPhotoEnabled: boolean;
}): string {
  if (theme.heroLayout === 'cover') {
    return 'Splash stays on home — reorder sections for your /book page';
  }
  if (theme.heroLayout === 'stack') {
    return 'Banner images stay on top — reorder sections below';
  }
  if (theme.heroLayout === 'banner' && theme.heroPhotoEnabled !== false) {
    return 'Header photo stays on top — About Me and Policies reorder separately below';
  }
  return 'Tap arrows to reorder page sections';
}

export default function SiteSectionOrderEditor({
  order,
  hiddenSections,
  reviewsEnabled,
  reviewCount,
  onOrderChange,
}: SiteSectionOrderEditorProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { content } = useSiteContent();
  const { theme, heroImageUrl, logoImageUrl, portfolioMediaUrls } = useSiteTheme();
  const { catalogServices } = useServiceCatalog();

  const accent = theme.primaryColor || colors.accentPink;
  const surface = theme.backgroundColor?.trim() || '#fafafa';
  const cardBg = theme.navbarColor?.trim() || colors.card;
  const portfolioUrls = portfolioMediaUrls.map((item) => item.url);

  const layoutCtx = useMemo(
    () => ({
      heroLayout: normalizeHeroLayout(theme.heroLayout),
      heroPhotoEnabled: theme.heroPhotoEnabled !== false,
    }),
    [theme.heroLayout, theme.heroPhotoEnabled],
  );

  const visibilityCtx = useMemo<OrderEditorVisibilityContext>(
    () => ({
      hiddenSections,
      reviewsEnabled,
      reviewCount,
      portfolioCount: portfolioUrls.length,
      heroLayout: normalizeHeroLayout(theme.heroLayout),
    }),
    [hiddenSections, reviewsEnabled, reviewCount, portfolioUrls.length, theme.heroLayout],
  );

  const isSectionVisible = useMemo(
    () => (sectionId: MainSiteSection) =>
      isOrderEditorSectionVisible(sectionId, content, visibilityCtx),
    [content, visibilityCtx],
  );

  const displayRows = useMemo(
    () =>
      buildOrderEditorRows(order, layoutCtx, {
        isSectionVisible,
      }),
    [order, layoutCtx, isSectionVisible],
  );

  const reorderableCount = useMemo(
    () => displayRows.filter(isReorderableOrderRow).length,
    [displayRows],
  );

  const sectionMeta = useMemo(
    () => new Map(MAIN_SITE_SECTIONS.map((section) => [section.id, section])),
    [],
  );

  const previews = useMemo(
    () =>
      new Map(
        order.map((sectionId) => [
          sectionId,
          buildSectionPreview(sectionId, content, portfolioUrls, catalogServices.length),
        ]),
      ),
    [order, content, portfolioUrls, catalogServices.length],
  );

  const moveRow = (reorderableIndex: number, direction: 'up' | 'down') => {
    const nextRows = moveOrderEditorRows(displayRows, reorderableIndex, direction);
    const newVisibleOrder = flattenOrderEditorRows(nextRows);
    onOrderChange(mergeOrderEditorChange(order, newVisibleOrder, content, visibilityCtx));
  };

  const renderBadges = (visibility: SectionVisibility) => {
    if (!visibility.badge) return null;
    return (
      <View style={styles.hiddenBadge}>
        <Text style={styles.hiddenBadgeText}>{visibility.badge}</Text>
      </View>
    );
  };

  const renderSectionBody = (
    sectionId: MainSiteSection,
    visibility: SectionVisibility,
    compact?: boolean,
  ) => {
    const meta = sectionMeta.get(sectionId);
    const preview = previews.get(sectionId);
    if (!meta || !preview) return null;

    return (
      <View
        key={sectionId}
        style={[styles.sectionBlock, compact && styles.sectionBlockCompact]}
      >
        <View style={styles.rowHeader}>
          <Text
            style={[styles.rowTitle, compact && styles.rowTitleCompact]}
            numberOfLines={1}
          >
            {meta.label}
          </Text>
          {renderBadges(visibility)}
        </View>
        {!compact ? (
          <>
            <Text style={styles.rowDetail} numberOfLines={1}>
              {preview.detail}
            </Text>
            {preview.imageUrls.length > 0 ? (
              <View style={styles.thumbRow}>
                {preview.imageUrls.map((url, thumbIndex) => (
                  <Image
                    key={`${sectionId}-${url}-${thumbIndex}`}
                    source={{ uri: url }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ))}
                <Text style={styles.rowBlurb} numberOfLines={2}>
                  {preview.blurb}
                </Text>
              </View>
            ) : (
              <Text style={styles.rowBlurb} numberOfLines={2}>
                {preview.blurb}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.rowBlurb} numberOfLines={1}>
            {preview.blurb}
          </Text>
        )}
      </View>
    );
  };

  const renderArrows = (reorderableIndex: number) => {
    const canMoveUp = reorderableIndex > 0;
    const canMoveDown = reorderableIndex < reorderableCount - 1;
    return (
      <View style={styles.arrows}>
        <Pressable
          style={[styles.arrowBtn, !canMoveUp && styles.arrowBtnDisabled]}
          onPress={() => moveRow(reorderableIndex, 'up')}
          disabled={!canMoveUp}
          hitSlop={6}
        >
          <Ionicons name="chevron-up" size={18} color={canMoveUp ? accent : colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.arrowBtn, !canMoveDown && styles.arrowBtnDisabled]}
          onPress={() => moveRow(reorderableIndex, 'down')}
          disabled={!canMoveDown}
          hitSlop={6}
        >
          <Ionicons
            name="chevron-down"
            size={18}
            color={canMoveDown ? accent : colors.textMuted}
          />
        </Pressable>
      </View>
    );
  };

  const renderRow = (row: OrderEditorRow, reorderableIndex: number | null, position: number | null) => {
    if (row.kind === 'pinned') {
      return (
        <View
          key={row.id}
          style={[styles.row, styles.rowPinned, { backgroundColor: cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={[styles.rowAccent, styles.rowAccentPinned]} />
          <View style={styles.rowMain}>
            <View style={styles.rowHeader}>
              <Ionicons name="pin-outline" size={13} color={colors.textMuted} />
              <Text style={styles.pinnedTitle} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedBadgeText}>Fixed</Text>
              </View>
            </View>
            <Text style={styles.rowBlurb}>{row.blurb}</Text>
          </View>
        </View>
      );
    }

    const visibility = resolveSectionBadge(row.sectionId, theme.heroLayout);

    const meta = sectionMeta.get(row.sectionId);
    const preview = previews.get(row.sectionId);
    if (!meta || !preview) return null;

    return (
      <View
        key={row.sectionId}
        style={[
          styles.row,
          { backgroundColor: cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.rowAccent, { backgroundColor: accent }]} />
        <View style={styles.rowMain}>
          <View style={styles.rowHeader}>
            {position !== null ? (
              <Text style={[styles.positionText, { color: accent }]}>{position}</Text>
            ) : null}
            <Text style={styles.rowTitle} numberOfLines={1}>
              {meta.label}
            </Text>
            {renderBadges(visibility)}
          </View>
          <Text style={styles.rowDetail} numberOfLines={1}>
            {preview.detail}
          </Text>
          {preview.imageUrls.length > 0 ? (
            <View style={styles.thumbRow}>
              {preview.imageUrls.map((url, thumbIndex) => (
                <Image
                  key={`${row.sectionId}-${url}-${thumbIndex}`}
                  source={{ uri: url }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ))}
              <Text style={styles.rowBlurb} numberOfLines={2}>
                {preview.blurb}
              </Text>
            </View>
          ) : (
            <Text style={styles.rowBlurb} numberOfLines={2}>
              {preview.blurb}
            </Text>
          )}
        </View>
        {reorderableIndex !== null ? renderArrows(reorderableIndex) : null}
      </View>
    );
  };

  let reorderableIndex = 0;
  let position = 1;

  return (
    <View style={[styles.wrap, { backgroundColor: surface }]}>
      <View style={styles.heroStrip}>
        {heroImageUrl && theme.heroPhotoEnabled !== false ? (
          <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: accent }]} />
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          {logoImageUrl ? (
            <Image source={{ uri: logoImageUrl }} style={styles.heroLogo} contentFit="cover" />
          ) : (
            <View style={[styles.heroLogo, styles.heroLogoFallback, { borderColor: accent }]} />
          )}
          <View style={styles.heroCopy}>
            <Text style={styles.brandName} numberOfLines={1}>
              {content.brandName || 'Your site'}
            </Text>
            <View style={[styles.brandRule, { backgroundColor: accent }]} />
            <Text style={styles.heroHint}>{orderEditorHint(theme)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        {displayRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No sections to reorder yet</Text>
            <Text style={styles.emptyStateBody}>
              Turn sections on in Content, add reviews, portfolio, or FAQ items — then they will appear here.
            </Text>
          </View>
        ) : (
          displayRows.map((row) => {
            const ri = isReorderableOrderRow(row) ? reorderableIndex++ : null;
            const pos = isReorderableOrderRow(row) ? position++ : null;
            return renderRow(row, ri, pos);
          })
        )}
      </View>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    marginHorizontal: -16,
    marginTop: -4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  heroStrip: {
    height: 84,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.52)',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
  },
  heroLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  heroLogoFallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  brandName: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  brandRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
  },
  heroHint: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  emptyState: {
    paddingHorizontal: 8,
    paddingVertical: 18,
    gap: 6,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 72,
  },
  rowPinned: {
    borderStyle: 'dashed',
    opacity: 0.92,
  },
  rowHeroProfile: {
    minHeight: 108,
  },
  rowHidden: {
    opacity: 0.58,
  },
  rowAccent: {
    width: 3,
  },
  rowAccentPinned: {
    backgroundColor: colors.textMuted,
  },
  rowMain: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 4,
    gap: 3,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  positionText: {
    fontSize: 12,
    fontWeight: '800',
    width: 14,
  },
  rowTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowTitleCompact: {
    flex: 0,
    flexGrow: 1,
    fontSize: 12,
  },
  rowTitleHidden: {
    color: colors.textMuted,
  },
  pinnedTitle: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  rowDetail: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  heroProfilePreview: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    alignItems: 'stretch',
  },
  heroProfilePhoto: {
    width: 52,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.navbar,
  },
  heroProfileCopy: {
    flex: 1,
    gap: 6,
  },
  heroProfileCopyFull: {
    paddingLeft: 0,
  },
  sectionBlock: {
    gap: 2,
  },
  sectionBlockCompact: {
    gap: 1,
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  thumb: {
    width: 28,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowBlurb: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  hiddenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hiddenBadgeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pinnedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pinnedBadgeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  groupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  arrows: {
    justifyContent: 'center',
    paddingRight: 6,
    gap: 2,
  },
  arrowBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  arrowBtnDisabled: {
    opacity: 0.35,
  },
};
