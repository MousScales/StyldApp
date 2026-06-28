import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPaywallNotifs } from '../data/brandCopy';
import { getPaywallContent } from '../data/paywallContent';
import { getPlanPricing, type Plan } from '../lib/paywallPackages';
import {
  ENTITLEMENT_CONFIRM_TIMEOUT_MS,
  PaywallTimeoutError,
  PURCHASE_FLOW_TIMEOUT_MS,
  withTimeout,
} from '../lib/paywallFlow';
import type { CustomerInfo } from 'react-native-purchases';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { usePurchases } from '../context/PurchasesContext';
import { ProfileStackParamList } from '../navigation/ProfileNavigator';
import { colors, fonts } from '../theme';
import { makeScaleFns } from '../theme/layout';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Paywall'> & {
  mandatory?: boolean;
  onSubscribed?: () => void | Promise<void>;
};

const HERO_IMAGE = require('../../assets/paywall-top.png');
const BRAND_ICON = require('../../assets/icon.png');

const NOTIF_VISIBLE_MS = 2800;
const NOTIF_ANIM_MS = 300;

function CyclingAppleNotifications() {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { businessType, businessTypeOther } = useBrand();
  const fakeNotifs = getPaywallNotifs(businessType);

  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const indexRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cycle = () => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: NOTIF_ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: NOTIF_ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.97,
          duration: NOTIF_ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!mounted) return;
        const next = (indexRef.current + 1) % fakeNotifs.length;
        indexRef.current = next;
        setIndex(next);
        translateY.setValue(14);
        scale.setValue(0.96);
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: NOTIF_ANIM_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: NOTIF_ANIM_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: NOTIF_ANIM_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!mounted) return;
          timeoutId = setTimeout(cycle, NOTIF_VISIBLE_MS);
        });
      });
    };

    timeoutId = setTimeout(cycle, NOTIF_VISIBLE_MS);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [opacity, scale, translateY, fakeNotifs.length]);

  const notif = fakeNotifs[index];

  return (
    <View style={styles.notifWrap}>
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <BlurView intensity={72} tint="light" style={styles.notifCard}>
          <Image source={BRAND_ICON} style={styles.notifIcon} resizeMode="cover" />
          <View style={styles.notifBody}>
            <View style={styles.notifTopRow}>
              <Text style={styles.notifApp}>STYLD</Text>
              <Text style={styles.notifTime}>{notif.time}</Text>
            </View>
            <Text style={styles.notifTitle}>{notif.title}</Text>
            <Text style={styles.notifMsg} numberOfLines={2}>
              {notif.msg}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

function PaywallBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        {[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((x) => (
          <Rect
            key={x}
            x={`${x * 100}%`}
            y="0"
            width="1"
            height="100%"
            fill="rgba(255,255,255,0.035)"
          />
        ))}
      </Svg>
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <RadialGradient id="paywallGlow" cx="50%" cy="38%" r="60%">
            <Stop offset="0" stopColor={colors.accentPink} stopOpacity="0.2" />
            <Stop offset="1" stopColor={colors.accentPink} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="70%" fill="url(#paywallGlow)" />
      </Svg>
    </View>
  );
}

export default function PaywallScreen({ navigation, mandatory = false, onSubscribed }: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { businessType, businessTypeOther } = useBrand();
  const layout = useMemo(() => makeScaleFns(width, height), [width, height]);
  const heroHeight = Math.round(Math.min(height * 0.28, layout.rh(220))) + insets.top;
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    isReady,
    isSubscriptionReady,
    refresh,
    isConfigured,
    waitForEntitlement,
    forceCheckSubscriptionStatus,
  } = usePurchases();
  const content = useMemo(
    () => getPaywallContent(businessType, businessTypeOther),
    [businessType, businessTypeOther],
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);

  const pricing = useMemo(
    () => getPlanPricing(currentOffering?.availablePackages ?? []),
    [currentOffering],
  );

  const packagesReady = isReady && isSubscriptionReady;
  const selectedPkg = selectedPlan === 'monthly' ? pricing.monthlyPkg : pricing.yearlyPkg;
  const canPurchase = packagesReady && isConfigured && Boolean(selectedPkg) && !busy;
  const showPackagesUnavailable = packagesReady && isConfigured && !pricing.hasLivePackages;

  function showFlowError(title: string, err: unknown) {
    const message =
      err instanceof PaywallTimeoutError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
    Alert.alert(title, message);
  }

  async function confirmEntitlement(seedInfo?: CustomerInfo | null): Promise<boolean> {
    try {
      return await withTimeout(
        waitForEntitlement(6, seedInfo),
        ENTITLEMENT_CONFIRM_TIMEOUT_MS,
        'We could not confirm your subscription in time. If you were charged, wait a moment and tap Restore.',
      );
    } catch (err) {
      showFlowError('Subscription pending', err);
      return false;
    }
  }

  async function finishSubscriptionFlow(seedInfo?: CustomerInfo | null) {
    const entitled = await confirmEntitlement(seedInfo);
    if (!entitled) return;

    if (mandatory && onSubscribed) {
      try {
        await onSubscribed();
      } catch (err) {
        console.warn('[Paywall] onSubscribed failed:', err);
        Alert.alert(
          'Subscription active',
          'Your subscription is active, but setup could not finish. Reopen the app or tap Restore.',
        );
      }
      return;
    }

    navigation.goBack();
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const entitled = await forceCheckSubscriptionStatus();
        if (cancelled || !entitled) return;
        if (onSubscribed) {
          await onSubscribed();
        } else if (!mandatory) {
          navigation.goBack();
        }
      })();
      void refresh();
      return () => {
        cancelled = true;
      };
    }, [forceCheckSubscriptionStatus, onSubscribed, mandatory, navigation, refresh]),
  );

  async function handlePurchase() {
    const pkg = selectedPkg;
    if (!pkg) {
      Alert.alert('Packages unavailable', content.packagesUnavailable);
      return;
    }

    let shouldContinue = false;
    let customerInfo: CustomerInfo | null = null;

    setBusy(true);
    try {
      const result = await withTimeout(
        purchasePackage(pkg, user?.id),
        PURCHASE_FLOW_TIMEOUT_MS,
        'Purchase timed out. Check your connection and try again, or tap Restore if you were charged.',
      );
      if (result.error) {
        Alert.alert('Purchase failed', result.error);
        return;
      }
      if (!result.entitled && !result.customerInfo) {
        return;
      }
      shouldContinue = true;
      customerInfo = result.customerInfo;
    } catch (err) {
      showFlowError('Purchase failed', err);
    } finally {
      setBusy(false);
    }

    if (shouldContinue) {
      await finishSubscriptionFlow(customerInfo);
    }
  }

  async function handleRestore() {
    let shouldContinue = false;
    let customerInfo: CustomerInfo | null = null;

    setBusy(true);
    try {
      const result = await withTimeout(
        restorePurchases(user?.id),
        PURCHASE_FLOW_TIMEOUT_MS,
        'Restore timed out. Check your connection and try again.',
      );
      if (result.error) {
        Alert.alert('Restore failed', result.error);
        return;
      }

      const entitled =
        result.entitled ||
        (await withTimeout(
          waitForEntitlement(20, result.customerInfo),
          ENTITLEMENT_CONFIRM_TIMEOUT_MS,
          'We could not confirm your subscription in time. Try again in a moment.',
        ));

      if (!entitled) {
        Alert.alert(
          'No subscription found',
          'We could not find an active Styld subscription on this account.',
        );
        return;
      }

      shouldContinue = true;
      customerInfo = result.customerInfo;
    } catch (err) {
      showFlowError('Restore failed', err);
    } finally {
      setBusy(false);
    }

    if (!shouldContinue) return;

    if (mandatory) {
      await finishSubscriptionFlow(customerInfo);
      return;
    }

    Alert.alert('Restored', 'Your purchases have been restored.');
    navigation.goBack();
  }

  const featurePairs = [
    content.features.slice(0, 2),
    content.features.slice(2, 4),
  ];

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <PaywallBackground />

      <View style={styles.page}>
        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <ExpoImage
            source={HERO_IMAGE}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%" pointerEvents="none">
            <Defs>
              <LinearGradient id="heroBottomFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.background} stopOpacity="0" />
                <Stop offset="0.7" stopColor={colors.background} stopOpacity="0" />
                <Stop offset="1" stopColor={colors.background} stopOpacity="0.95" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroBottomFade)" />
          </Svg>
          <View style={[styles.heroBrandLockup, { top: insets.top + 10 }]}>
            <Image source={BRAND_ICON} style={styles.brandIcon} resizeMode="cover" />
            <Text style={styles.brandName}>Styld</Text>
          </View>
          {!mandatory ? (
            <Pressable
              style={[styles.closeBtn, { top: insets.top + 8 }]}
              onPress={() => navigation.goBack()}
              hitSlop={12}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.copyBlock}>
            <Text style={styles.headline} numberOfLines={2}>
              {content.headline.replace(' DMs', '')}
              <Text style={styles.headlineAccent}> DMs</Text>
            </Text>
            <Text style={styles.subheadline} numberOfLines={2}>
              {content.subheadline}
            </Text>

            <View style={styles.features}>
              {featurePairs.map((pair, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.featureRow}>
                  {pair.map((feature) => (
                    <View key={feature} style={styles.featureCell}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.accentPink} />
                      <Text style={styles.featureText} numberOfLines={1}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <CyclingAppleNotifications />

          <View style={styles.bottomBlock}>
            <View style={styles.plansStack}>
              <Pressable
                style={[styles.monthlyCard, selectedPlan === 'monthly' && styles.monthlyCardSelected]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <View style={styles.planCopy}>
                  <Text style={styles.planTitle}>{content.monthlyLabel}</Text>
                  <Text style={styles.planPriceMuted}>{pricing.monthlyPriceLabel}</Text>
                </View>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioOn]}>
                  {selectedPlan === 'monthly' ? (
                    <Ionicons name="checkmark" size={14} color={colors.accentPink} />
                  ) : null}
                </View>
              </Pressable>

              <View style={styles.yearlyWrap}>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>
                    {pricing.savingsPercent > 0 ? `${pricing.savingsPercent}% OFF` : '50% OFF'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.yearlyCard, selectedPlan === 'yearly' && styles.yearlyCardSelected]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <View style={styles.planCopy}>
                    <Text style={styles.planTitle}>{content.yearlyLabel}</Text>
                    <Text style={styles.planPriceAccent} numberOfLines={1}>
                      {pricing.yearlyPriceLabel} {pricing.yearlyPerMonthLabel}
                    </Text>
                    <Text style={styles.planPromoText}>{content.yearlyPromo}</Text>
                  </View>
                  <View style={[styles.radio, selectedPlan === 'yearly' && styles.radioOnFilled]}>
                    {selectedPlan === 'yearly' ? (
                      <Ionicons name="checkmark" size={14} color="#0a0a0a" />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            </View>

            {showPackagesUnavailable ? (
              <Text style={styles.packagesWarning}>{content.packagesUnavailable}</Text>
            ) : null}

            <Pressable
              style={[styles.ctaBtn, (!canPurchase || busy) && styles.ctaBtnDisabled]}
              onPress={() => void handlePurchase()}
              disabled={!canPurchase}
            >
              {busy || !packagesReady ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text style={styles.ctaText}>{content.ctaText}</Text>
              )}
            </Pressable>

            <Text style={styles.footer}>
              {content.footerText}
            </Text>

            <View style={styles.legalRow}>
              <Pressable onPress={() => void Linking.openURL(content.termsOfUseUrl)}>
                <Text style={styles.legalLink}>Terms of Use</Text>
              </Pressable>
              <Pressable onPress={() => void Linking.openURL(content.privacyPolicyUrl)}>
                <Text style={styles.legalLink}>Privacy</Text>
              </Pressable>
              <Pressable onPress={() => void handleRestore()} disabled={busy}>
                <Text style={styles.legalLink}>Restore</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const BASE_STYLES = {
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
  },
  heroWrap: {
    width: '100%',
    backgroundColor: colors.card,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroBrandLockup: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(20,20,20,0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  copyBlock: {
    flexShrink: 1,
  },
  notifWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 72,
    maxHeight: 96,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginTop: 1,
  },
  notifBody: {
    flex: 1,
    gap: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  notifApp: {
    color: 'rgba(0,0,0,0.45)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  notifTime: {
    color: 'rgba(0,0,0,0.35)',
    fontSize: 11,
    fontWeight: '500',
  },
  notifTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  notifMsg: {
    color: 'rgba(0,0,0,0.65)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: fonts.number,
  },
  headline: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 26,
    marginBottom: 4,
    fontFamily: fonts.number,
  },
  headlineAccent: {
    color: colors.accentPink,
  },
  subheadline: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 10,
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featureCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    opacity: 0.9,
  },
  bottomBlock: {
    flexShrink: 0,
  },
  plansStack: {
    gap: 14,
    marginBottom: 10,
  },
  monthlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 64,
  },
  monthlyCardSelected: {
    borderColor: colors.accentPinkBorder,
    backgroundColor: colors.accentPinkMuted,
  },
  yearlyWrap: {
    position: 'relative',
    paddingTop: 10,
  },
  yearlyCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 64,
    overflow: 'visible',
  },
  yearlyCardSelected: {
    borderColor: colors.accentPink,
    backgroundColor: colors.subtleTintBg,
    shadowColor: colors.accentPink,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -2,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    backgroundColor: colors.accentPink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  planCopy: { flex: 1 },
  planTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  planPriceMuted: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  planPriceAccent: {
    color: colors.accentPink,
    fontSize: 14,
    fontWeight: '600',
  },
  planPromoText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 4,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  radioOn: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPinkMuted,
  },
  radioOnFilled: {
    borderColor: colors.accentPink,
    backgroundColor: colors.accentPink,
  },
  ctaBtn: {
    backgroundColor: colors.accentPink,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.accentPink,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaBtnDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  packagesWarning: {
    color: '#f5a623',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legalLink: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
};
