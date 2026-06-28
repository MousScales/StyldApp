import { getBrandCopy } from './brandCopy';
import { BusinessType } from './onboarding';

const PAYWALL_BASE = {
  features: [
    'Online booking website',
    'Client management CRM',
    'Automated reminders',
    'Appointment scheduling',
  ],
  ctaText: 'Subscribe & Continue',
  footerText: 'Subscription required. Cancel anytime in Apple ID settings.',
  monthlyLabel: 'Monthly',
  monthlyPrice: '$49.99/mo',
  yearlyLabel: 'Yearly',
  yearlyPrice: '$299.99/yr',
  yearlyPerMonth: '($24.99/mo)',
  yearlyPromo: 'Best value — save vs monthly',
  packagesUnavailable:
    'Subscription plans are temporarily unavailable. Check your connection and try again, or contact support if this continues.',
  termsOfUseUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  privacyPolicyUrl: 'https://styldd.com/privacy',
} as const;

export function getPaywallContent(businessType: BusinessType | '', businessTypeOther?: string) {
  const copy = getBrandCopy(businessType, businessTypeOther);
  return {
    ...PAYWALL_BASE,
    headline: copy.paywallHeadline,
    subheadline: copy.paywallSubheadline,
  };
}

/** @deprecated use getPaywallContent() */
export const PAYWALL_CONTENT = getPaywallContent('');