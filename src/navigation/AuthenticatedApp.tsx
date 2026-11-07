import { StripeProvider } from '@stripe/stripe-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { PushNotificationsProvider } from '../context/PushNotificationsContext';
import { BrandProvider } from '../context/BrandContext';
import { ServiceCatalogProvider } from '../context/ServiceCatalogContext';
import { AppAccessProvider, useAppAccess } from '../context/AppAccessContext';
import { OnboardingProvider, useOnboarding } from '../context/OnboardingContext';
import { SiteContentProvider } from '../context/SiteContentContext';
import { SiteDataProvider } from '../context/SiteDataContext';
import { useBookingSessionAutomation } from '../hooks/useBookingSessionAutomation';
import { SiteThemeProvider } from '../context/SiteThemeContext';
import { usePurchases } from '../context/PurchasesContext';
import TabNavigator from './TabNavigator';
import SiteNavigator from './SiteNavigator';
import AdminNavigator from './AdminNavigator';
import StripeTerminalAppProvider from '../components/StripeTerminalAppProvider';
import TabletSceneWrapper from '../components/layout/TabletSceneWrapper';
// import TapToPayCoordinator from '../components/tapToPay/TapToPayCoordinator';
import { TAP_TO_PAY_NATIVE_ENABLED } from '../lib/tapToPayConfig';
import { useAuth } from '../context/AuthContext';
import { useSubscriptionSiteSync } from '../hooks/useSubscriptionSiteSync';
import AccountOnboardingFlow from '../screens/onboarding/AccountOnboardingFlow';
import PaywallScreen from '../screens/PaywallScreen';
import { colors } from '../theme';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function StripeAppShell({ children }: { children: React.ReactNode }) {
  if (!STRIPE_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.styld">
      {children}
    </StripeProvider>
  );
}

function AccessLoading() {
  const styles = useResponsiveStyles(BASE_STYLES);

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accentPink} />
    </View>
  );
}

function AppGate() {
  const { clearNewSignUp, isPlatformAdmin } = useAuth();
  const { phase } = useAppAccess();
  const { sitePublish, refresh: refreshOnboarding, publishSite } = useOnboarding();
  const { refresh: refreshPurchases, waitForEntitlement } = usePurchases();

  useSubscriptionSiteSync();

  if (isPlatformAdmin) {
    return <AdminNavigator />;
  }

  if (phase === 'loading') {
    return <AccessLoading />;
  }

  if (phase === 'account_onboarding') {
    return (
      <TabletSceneWrapper>
        <AccountOnboardingFlow onComplete={clearNewSignUp} />
      </TabletSceneWrapper>
    );
  }

  if (phase === 'build_site') {
    return (
      <TabletSceneWrapper wide>
        <SiteNavigator />
      </TabletSceneWrapper>
    );
  }

  if (phase === 'paywall') {
    return (
      <TabletSceneWrapper>
        <PaywallScreen
          mandatory
          navigation={
            {
              goBack: () => {},
              navigate: () => {},
            } as never
          }
          route={{ key: 'mandatory-paywall', name: 'Paywall', params: undefined } as never}
          onSubscribed={async () => {
            await refreshPurchases();
            const entitled = await waitForEntitlement();
            if (!entitled) return;
            if (sitePublish.subdomain) {
              try {
                await publishSite(sitePublish.subdomain);
              } catch (err) {
                console.warn('[Paywall] Republish after subscribe failed:', err);
              }
            }
            await refreshOnboarding();
          }}
        />
      </TabletSceneWrapper>
    );
  }

  return (
    <>
      <TabNavigator />
      {/*
      {TAP_TO_PAY_NATIVE_ENABLED ? <TapToPayCoordinator /> : null}
      Tap to Pay disabled — checkout uses Cash + Payment link for now.
      */}
    </>
  );
}

function BookingSessionAutomation() {
  useBookingSessionAutomation();
  return null;
}

export default function AuthenticatedApp() {
  return (
    <SiteDataProvider>
      <BookingSessionAutomation />
      <PushNotificationsProvider>
        <SiteContentProvider>
          <SiteThemeProvider>
            <OnboardingProvider>
              <BrandProvider>
                <AppAccessProvider>
                  <ServiceCatalogProvider>
                    <StripeAppShell>
                      {TAP_TO_PAY_NATIVE_ENABLED ? (
                        <StripeTerminalAppProvider>
                          <AppGate />
                        </StripeTerminalAppProvider>
                      ) : (
                        <View style={{ flex: 1 }}>
                          <AppGate />
                        </View>
                      )}
                    </StripeAppShell>
                  </ServiceCatalogProvider>
                </AppAccessProvider>
              </BrandProvider>
            </OnboardingProvider>
          </SiteThemeProvider>
        </SiteContentProvider>
      </PushNotificationsProvider>
    </SiteDataProvider>
  );
}

const BASE_STYLES = {
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
};
