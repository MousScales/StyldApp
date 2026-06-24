import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { colors, fonts } from '../../theme';

const ADMIN_GRADIENT_MID = '#120818';
const ADMIN_GRADIENT_END = '#1a0a14';

export function AdminBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="adminBg" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={colors.background} />
            <Stop offset="0.5" stopColor={ADMIN_GRADIENT_MID} />
            <Stop offset="1" stopColor={ADMIN_GRADIENT_END} />
          </LinearGradient>
          <RadialGradient id="adminGlow" cx="85%" cy="8%" r="45%">
            <Stop offset="0" stopColor={colors.accentPinkGlow} stopOpacity="0.55" />
            <Stop offset="1" stopColor={colors.accentPinkGlow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#adminBg)" />
        <Rect width={width} height={height * 0.55} fill="url(#adminGlow)" />
      </Svg>
    </View>
  );
}

export function AdminShell({
  children,
  edges = ['top'],
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.shell}>
      <AdminBackground />
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function AdminHeader({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <AdminIconButton icon="arrow-back" onPress={onBack} />
        ) : (
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color={colors.accentPink} />
          </View>
        )}
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.headerSide, styles.headerActions]}>{actions}</View>
    </View>
  );
}

export function AdminIconButton({
  icon,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconBtn,
        active && styles.iconBtnActive,
        pressed && styles.iconBtnPressed,
      ]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons name={icon} size={18} color={active ? colors.accentPink : colors.textMuted} />
    </Pressable>
  );
}

export function AdminTabBar<T extends string>({
  tabs,
  active,
  onChange,
  showIcons = false,
}: {
  tabs: { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  active: T;
  onChange: (id: T) => void;
  showIcons?: boolean;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.tabBarWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <Pressable
              key={t.id}
              style={[styles.tabPill, selected && styles.tabPillActive]}
              onPress={() => onChange(t.id)}
            >
              {showIcons && t.icon ? (
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={selected ? colors.accentPink : colors.textMuted}
                />
              ) : null}
              <Text style={[styles.tabPillText, selected && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function AdminChrome({ children }: { children: ReactNode }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return <View style={styles.chrome}>{children}</View>;
}

export function AdminBody({ children, style }: { children: ReactNode; style?: object }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return <View style={[styles.body, style]}>{children}</View>;
}

export function AdminSearchField({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search…',
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={16} color={colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminHeroStat({
  label,
  value,
  icon,
  accent = colors.accentPink,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.heroStat}>
      <View style={[styles.heroStatIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.heroStatValue, { fontFamily: fonts.number }]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

export function AdminStatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'money' | 'success' | 'warn';
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const toneStyle =
    tone === 'money'
      ? styles.statTileMoney
      : tone === 'success'
        ? styles.statTileSuccess
        : tone === 'warn'
          ? styles.statTileWarn
          : null;
  return (
    <View style={[styles.statTile, toneStyle]}>
      <Text style={[styles.statTileValue, { fontFamily: fonts.number }]}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

export function AdminRevenueBanner({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.revenueBanner}>
      <View style={styles.revenueBannerGlow} />
      <Text style={styles.revenueBannerLabel}>{label}</Text>
      <Text style={[styles.revenueBannerValue, { fontFamily: fonts.number }]}>{value}</Text>
      {note ? <Text style={styles.revenueBannerNote}>{note}</Text> : null}
    </View>
  );
}

export function AdminBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'accent';
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const toneStyle =
    tone === 'success'
      ? styles.badgeSuccess
      : tone === 'warn'
        ? styles.badgeWarn
        : tone === 'danger'
          ? styles.badgeDanger
          : tone === 'accent'
            ? styles.badgeAccent
            : styles.badgeNeutral;
  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function AdminListCard({
  title,
  subtitle,
  meta,
  initials,
  badges,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  initials?: string;
  badges?: { label: string; tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'accent' }[];
  onPress?: () => void;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <Pressable
      style={({ pressed }) => [styles.listCard, pressed && onPress && styles.listCardPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.listCardAccent} />
      {initials ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials.slice(0, 2).toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={styles.listCardBody}>
        <Text style={styles.listCardTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.listCardSub} numberOfLines={2}>{subtitle}</Text> : null}
        {badges && badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <AdminBadge key={b.label} label={b.label} tone={b.tone} />
            ))}
          </View>
        ) : null}
        {meta ? <Text style={styles.listCardMeta} numberOfLines={2}>{meta}</Text> : null}
      </View>
      {onPress ? (
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={14} color={colors.accentPink} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function AdminSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon ? <Ionicons name={icon} size={14} color={colors.accentPink} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function AdminDetailRow({ label, value }: { label: string; value: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

export function AdminSectionTitle({ title }: { title: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return <Text style={styles.contentSectionTitle}>{title}</Text>;
}

export function AdminNote({ children }: { children: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return <Text style={styles.note}>{children}</Text>;
}

export function AdminLoading() {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.center}>
      <View style={styles.loadingCard}>
        <ActivityIndicator color={colors.accentPink} size="large" />
        <Text style={styles.loadingText}>Loading platform data…</Text>
      </View>
    </View>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.center}>
      <View style={styles.errorCard}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.accentPink} />
        <Text style={styles.errorTitle}>Couldn&apos;t load data</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AdminEmpty({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  const styles = useResponsiveStyles(BASE_STYLES);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function adminInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export function bookingStatusTone(status: string): 'neutral' | 'success' | 'warn' | 'danger' | 'accent' {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'confirmed' || s === 'paid') return 'success';
  if (s === 'cancelled' || s === 'canceled' || s === 'refunded') return 'danger';
  if (s === 'pending' || s === 'pending_payment') return 'warn';
  return 'neutral';
}

const BASE_STYLES = {
  shell: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  chrome: { zIndex: 2 },
  body: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  headerSide: { width: 88, alignItems: 'flex-start' as const },
  headerActions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: 8 },
  headerCenter: { flex: 1, alignItems: 'center' as const },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBtnActive: {
    backgroundColor: colors.accentPinkMuted,
    borderColor: colors.accentPinkBorder,
  },
  iconBtnPressed: { opacity: 0.82 },
  tabBarWrap: {
    zIndex: 2,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  tabBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8 },
  tabPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabPillActive: {
    backgroundColor: colors.accentPinkMuted,
    borderColor: colors.accentPinkBorder,
  },
  tabPillText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' as const },
  tabPillTextActive: { color: colors.accentPink },
  searchWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  heroStat: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 6,
  },
  heroStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroStatValue: { color: colors.text, fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  heroStatLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' as const },
  statTile: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  statTileMoney: { borderColor: 'rgba(245, 185, 66, 0.25)', backgroundColor: 'rgba(245, 185, 66, 0.06)' },
  statTileSuccess: { borderColor: 'rgba(47, 107, 79, 0.35)', backgroundColor: 'rgba(47, 107, 79, 0.08)' },
  statTileWarn: { borderColor: colors.accentPinkBorder, backgroundColor: colors.accentPinkMuted },
  statTileValue: { color: colors.text, fontSize: 17, fontWeight: '800' as const },
  statTileLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3, fontWeight: '600' as const },
  revenueBanner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
    padding: 18,
    marginBottom: 4,
    overflow: 'hidden' as const,
  },
  revenueBannerGlow: {
    position: 'absolute' as const,
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentPinkGlow,
    opacity: 0.35,
  },
  revenueBannerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  revenueBannerValue: { color: colors.text, fontSize: 32, fontWeight: '800' as const, marginTop: 4, letterSpacing: -1 },
  revenueBannerNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeNeutral: { backgroundColor: colors.card, borderColor: colors.cardBorder },
  badgeSuccess: { backgroundColor: 'rgba(47, 107, 79, 0.15)', borderColor: 'rgba(47, 107, 79, 0.35)' },
  badgeWarn: { backgroundColor: 'rgba(232, 135, 42, 0.12)', borderColor: 'rgba(232, 135, 42, 0.35)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' },
  badgeAccent: { backgroundColor: colors.accentPinkMuted, borderColor: colors.accentPinkBorder },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: '700' as const },
  badgeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 8 },
  listCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: 'rgba(20, 20, 20, 0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    overflow: 'hidden' as const,
  },
  listCardPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  listCardAccent: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accentPink,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
    marginLeft: 4,
  },
  avatarText: { color: colors.accentPink, fontSize: 14, fontWeight: '800' as const },
  listCardBody: { flex: 1, paddingRight: 4 },
  listCardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' as const },
  listCardSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  listCardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.accentPinkMuted,
  },
  section: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  detailLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '600' as const, flex: 1.2, textAlign: 'right' as const },
  contentSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800' as const,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24 },
  loadingCard: {
    alignItems: 'center' as const,
    gap: 14,
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  errorCard: {
    alignItems: 'center' as const,
    gap: 8,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxWidth: 300,
  },
  errorTitle: { color: colors.text, fontSize: 16, fontWeight: '800' as const, marginTop: 4 },
  errorMessage: { color: colors.textMuted, fontSize: 13, textAlign: 'center' as const, lineHeight: 19 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.accentPinkMuted,
    borderWidth: 1,
    borderColor: colors.accentPinkBorder,
  },
  retryText: { color: colors.accentPink, fontWeight: '700' as const, fontSize: 14 },
  empty: { alignItems: 'center' as const, paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' as const },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' as const, lineHeight: 19 },
};
