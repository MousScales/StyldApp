import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BrandCopy, getBrandCopy } from '../data/brandCopy';
import { brandKeyForBusinessType, BusinessType } from '../data/onboarding';
import { applyBrandPalette, colors as themeColors, getBrandColors, type AppColors } from '../theme';
import { BrandPaletteKey } from '../theme/brandPalettes';
import { useOnboarding } from './OnboardingContext';

type BrandContextValue = {
  businessType: BusinessType | '';
  isBarber: boolean;
  brandKey: BrandPaletteKey;
  colors: AppColors;
  copy: BrandCopy;
  /** Live preview during onboarding before save. */
  setPreviewBusinessType: (type: BusinessType | '') => void;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { state } = useOnboarding();
  const [previewBusinessType, setPreviewBusinessType] = useState<BusinessType | ''>('');

  const businessType = previewBusinessType || state.survey?.businessType || '';
  const isBarber = businessType === 'barber';
  const brandKey = brandKeyForBusinessType(businessType);
  const brandColors = useMemo(() => getBrandColors(brandKey), [brandKey]);

  useLayoutEffect(() => {
    applyBrandPalette(brandKey);
  }, [brandKey]);

  const copy = useMemo(() => getBrandCopy(businessType), [businessType]);

  const value = useMemo<BrandContextValue>(
    () => ({
      businessType,
      isBarber,
      brandKey,
      colors: brandColors,
      copy,
      setPreviewBusinessType,
    }),
    [businessType, isBarber, brandKey, brandColors, copy],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
}

/** Safe outside BrandProvider — returns salon defaults. */
export function useBrandOptional(): BrandContextValue {
  const context = useContext(BrandContext);
  const fallback = useMemo(
    () => ({
      businessType: '' as BusinessType | '',
      isBarber: false,
      brandKey: 'salon' as BrandPaletteKey,
      colors: themeColors,
      copy: getBrandCopy(''),
      setPreviewBusinessType: (_type: BusinessType | '') => {},
    }),
    [],
  );
  return context ?? fallback;
}

export function useSetPreviewBusinessType() {
  const setPreview = useContext(BrandContext)?.setPreviewBusinessType;
  return useCallback(
    (type: BusinessType | '') => {
      setPreview?.(type);
    },
    [setPreview],
  );
}
