import { ImageSourcePropType } from 'react-native';
import { BusinessType } from '../data/onboarding';

const PAYWALL_HERO_IMAGES: Record<BusinessType, ImageSourcePropType> = {
  hair_salon: require('../../assets/paywall-top-hair-salon.png'),
  barber: require('../../assets/paywall-top-barber.png'),
  makeup_artist: require('../../assets/paywall-top-makeup.png'),
  nail_tech: require('../../assets/paywall-top-nails.png'),
  lash_tech: require('../../assets/paywall-top-lash.png'),
  other: require('../../assets/paywall-top-other.png'),
};

const DEFAULT_PAYWALL_HERO = require('../../assets/paywall-top-hair-salon.png');

/** Paywall header photo matched to the pro's business type from onboarding. */
export function getPaywallHeroImage(businessType: BusinessType | ''): ImageSourcePropType {
  if (!businessType) return DEFAULT_PAYWALL_HERO;
  return PAYWALL_HERO_IMAGES[businessType] ?? DEFAULT_PAYWALL_HERO;
}
