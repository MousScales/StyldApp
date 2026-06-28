import { ImageSourcePropType } from 'react-native';
import { BrandPaletteKey } from '../theme/brandPalettes';

export type ProfileTileKey =
  | 'payments'
  | 'styles'
  | 'schedule'
  | 'reviews'
  | 'certifications'
  | 'products';

const SALON_TILES: Record<ProfileTileKey, ImageSourcePropType> = {
  payments: require('../../assets/profile-tiles/profile-tile-salon-payments.png'),
  styles: require('../../assets/profile-tiles/profile-tile-salon-styles.png'),
  schedule: require('../../assets/profile-tiles/profile-tile-salon-schedule.png'),
  reviews: require('../../assets/profile-tiles/profile-tile-salon-reviews.png'),
  certifications: require('../../assets/profile-tiles/profile-tile-salon-certifications.png'),
  products: require('../../assets/profile-tiles/profile-tile-salon-products.png'),
};

const BARBER_TILES: Record<ProfileTileKey, ImageSourcePropType> = {
  payments: require('../../assets/profile-tiles/profile-tile-barber-payments.png'),
  styles: require('../../assets/profile-tiles/profile-tile-barber-styles.png'),
  schedule: require('../../assets/profile-tiles/profile-tile-barber-schedule.png'),
  reviews: require('../../assets/profile-tiles/profile-tile-barber-reviews.png'),
  certifications: require('../../assets/profile-tiles/profile-tile-barber-certifications.png'),
  products: require('../../assets/profile-tiles/profile-tile-barber-products.png'),
};

const MAKEUP_TILES: Record<ProfileTileKey, ImageSourcePropType> = {
  payments: require('../../assets/profile-tiles/profile-tile-makeup-payments.png'),
  styles: require('../../assets/profile-tiles/profile-tile-makeup-styles.png'),
  schedule: require('../../assets/profile-tiles/profile-tile-makeup-schedule.png'),
  reviews: require('../../assets/profile-tiles/profile-tile-makeup-reviews.png'),
  certifications: require('../../assets/profile-tiles/profile-tile-makeup-certifications.png'),
  products: require('../../assets/profile-tiles/profile-tile-makeup-products.png'),
};

const NAIL_TILES: Record<ProfileTileKey, ImageSourcePropType> = {
  payments: require('../../assets/profile-tiles/profile-tile-nail-payments.png'),
  styles: require('../../assets/profile-tiles/profile-tile-nail-styles.png'),
  schedule: require('../../assets/profile-tiles/profile-tile-nail-schedule.png'),
  reviews: require('../../assets/profile-tiles/profile-tile-nail-reviews.png'),
  certifications: require('../../assets/profile-tiles/profile-tile-nail-certifications.png'),
  products: require('../../assets/profile-tiles/profile-tile-nail-products.png'),
};

const LASH_TILES: Record<ProfileTileKey, ImageSourcePropType> = {
  payments: require('../../assets/profile-tiles/profile-tile-lash-payments.png'),
  styles: require('../../assets/profile-tiles/profile-tile-lash-styles.png'),
  schedule: require('../../assets/profile-tiles/profile-tile-lash-schedule.png'),
  reviews: require('../../assets/profile-tiles/profile-tile-lash-reviews.png'),
  certifications: require('../../assets/profile-tiles/profile-tile-lash-certifications.png'),
  products: require('../../assets/profile-tiles/profile-tile-lash-products.png'),
};

const TILES_BY_BRAND: Record<BrandPaletteKey, Record<ProfileTileKey, ImageSourcePropType>> = {
  salon: SALON_TILES,
  barber: BARBER_TILES,
  makeup: MAKEUP_TILES,
  nail: NAIL_TILES,
  lash: LASH_TILES,
};

export function getProfileTileImage(brandKey: BrandPaletteKey, tile: ProfileTileKey) {
  return TILES_BY_BRAND[brandKey][tile];
}
