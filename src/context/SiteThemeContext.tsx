import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_SITE_THEME,
  HeroLayout,
  MAX_PORTFOLIO_ITEMS,
  MAX_CERTIFICATION_ITEMS,
  normalizeSiteTheme,
  PortfolioMediaType,
  SiteTheme,
} from '../data/siteTheme';
import { DEFAULT_HERO_IMAGE_FOCUS, DEFAULT_STACK_IMAGE_FOCUS } from '../lib/heroImageFocus';
import {
  uploadHeroImageFromUri,
  uploadLogoImageFromUri,
  uploadPortfolioMediaFromUri,
  uploadCertificationMediaFromUri,
  uploadStackImageFromUri,
} from '../lib/siteAdmin';
import { getStyleCoverImageUrl } from '../lib/siteServices';
import { loadSiteSetting, saveSiteSetting } from '../lib/siteRecords';
import { useAuth } from './AuthContext';
import { useLinkedSite } from '../hooks/useLinkedSite';

type PortfolioMediaPreview = {
  url: string;
  mediaType: PortfolioMediaType;
};

type CertificationMediaPreview = {
  url: string;
  mediaType: PortfolioMediaType;
  caption: string;
};

type SiteThemeContextValue = {
  theme: SiteTheme;
  isLoading: boolean;
  isSaving: boolean;
  hasPendingChanges: boolean;
  error: string | null;
  heroImageUrl: string | null;
  logoImageUrl: string | null;
  portfolioMediaUrls: PortfolioMediaPreview[];
  certificationMediaUrls: CertificationMediaPreview[];
  stackImageUrls: string[];
  uploadStackImage: (fileUri: string) => Promise<void>;
  removeStackImage: (slot: number) => void;
  updateTheme: (patch: Partial<SiteTheme>) => void;
  setHeroLayout: (layout: HeroLayout) => void;
  uploadHeroImage: (fileUri: string) => Promise<void>;
  uploadLogoImage: (fileUri: string) => Promise<void>;
  uploadPortfolioMedia: (fileUri: string, mimeType?: string | null, mediaType?: PortfolioMediaType) => Promise<void>;
  removePortfolioItem: (index: number) => void;
  uploadCertificationMedia: (fileUri: string, mimeType?: string | null) => Promise<void>;
  removeCertificationItem: (index: number) => void;
  updateCertificationCaption: (index: number, caption: string) => void;
  removeHeroImage: () => void;
  saveThemeNow: (override?: SiteTheme) => Promise<void>;
  flushPendingSave: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SiteThemeContext = createContext<SiteThemeContextValue | undefined>(undefined);

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const linkedSite = useLinkedSite();
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_SITE_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const pendingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setTheme(DEFAULT_SITE_THEME);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await loadSiteSetting(
        user.id,
        'site_theme',
        normalizeSiteTheme,
        DEFAULT_SITE_THEME,
      );
      setTheme(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load site design.');
      setTheme(DEFAULT_SITE_THEME);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: SiteTheme) => {
      if (!user?.id) return;

      setIsSaving(true);
      setError(null);

      try {
        await saveSiteSetting(user.id, 'site_theme', next);
        pendingRef.current = false;
        setHasPendingChanges(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save site design.');
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id],
  );

  const updateTheme = useCallback(
    (patch: Partial<SiteTheme>) => {
      setTheme((current) => {
        const next = { ...current, ...patch };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        pendingRef.current = true;
        setHasPendingChanges(true);
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null;
          void persist(next);
        }, 700);
        return next;
      });
    },
    [persist],
  );

  const setHeroLayout = useCallback(
    (layout: HeroLayout) => {
      updateTheme({ heroLayout: layout });
    },
    [updateTheme],
  );

  const uploadHeroImage = useCallback(
    async (fileUri: string) => {
      if (!linkedSite || !user?.id) {
        throw new Error('Sign in again to upload images.');
      }

      setIsSaving(true);
      setError(null);

      try {
        const storagePath = await uploadHeroImageFromUri(linkedSite, fileUri);
        const next = {
          ...theme,
          heroImagePath: storagePath,
          heroImageFocusX: DEFAULT_HERO_IMAGE_FOCUS.x,
          heroImageFocusY: DEFAULT_HERO_IMAGE_FOCUS.y,
        };
        setTheme(next);
        await saveSiteSetting(user.id, 'site_theme', next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not upload hero image.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [linkedSite, theme, user],
  );

  const uploadLogoImage = useCallback(
    async (fileUri: string) => {
      if (!linkedSite || !user?.id) {
        throw new Error('Sign in again to upload images.');
      }

      setIsSaving(true);
      setError(null);

      try {
        const storagePath = await uploadLogoImageFromUri(linkedSite, fileUri);
        const next = { ...theme, logoImagePath: storagePath };
        setTheme(next);
        await saveSiteSetting(user.id, 'site_theme', next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not upload logo.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [linkedSite, theme, user],
  );

  const removeHeroImage = useCallback(() => {
    updateTheme({ heroImagePath: null });
  }, [updateTheme]);

  const saveThemeNow = useCallback(async (override?: SiteTheme) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const next = override ?? themeRef.current;
    themeRef.current = next;
    setTheme(next);
    await persist(next);
  }, [persist]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!pendingRef.current || !user?.id) return;
    await persist(themeRef.current);
  }, [persist, user?.id]);

  const heroImageUrl = useMemo(() => {
    if (!theme.heroImagePath) return null;
    return getStyleCoverImageUrl(theme.heroImagePath, linkedSite);
  }, [linkedSite, theme.heroImagePath]);

  const logoImageUrl = useMemo(() => {
    if (!theme.logoImagePath) return null;
    return getStyleCoverImageUrl(theme.logoImagePath, linkedSite);
  }, [linkedSite, theme.logoImagePath]);

  const portfolioMediaUrls = useMemo(() => {
    return (theme.portfolioItems ?? [])
      .map((item) => {
        const url = getStyleCoverImageUrl(item.storagePath, linkedSite);
        if (!url) return null;
        return { url, mediaType: item.mediaType };
      })
      .filter((item): item is PortfolioMediaPreview => item !== null);
  }, [linkedSite, theme.portfolioItems]);

  const certificationMediaUrls = useMemo(() => {
    return (theme.certificationItems ?? [])
      .map((item) => {
        const url = getStyleCoverImageUrl(item.storagePath, linkedSite);
        if (!url) return null;
        return {
          url,
          mediaType: item.mediaType,
          caption: item.caption ?? '',
        };
      })
      .filter((item): item is CertificationMediaPreview => item !== null);
  }, [linkedSite, theme.certificationItems]);

  const uploadPortfolioMedia = useCallback(
    async (fileUri: string, mimeType?: string | null, mediaType: PortfolioMediaType = 'image') => {
      if (!linkedSite || !user?.id) throw new Error('Sign in again to upload media.');
      const currentItems = theme.portfolioItems ?? [];
      if (currentItems.length >= MAX_PORTFOLIO_ITEMS) {
        throw new Error(`You can add up to ${MAX_PORTFOLIO_ITEMS} photos or videos.`);
      }
      setIsSaving(true);
      setError(null);
      try {
        const uploaded = await uploadPortfolioMediaFromUri(linkedSite, fileUri, mimeType, mediaType);
        const next = {
          ...theme,
          portfolioItems: [...currentItems, uploaded],
        };
        setTheme(next);
        await saveSiteSetting(user.id, 'site_theme', next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not upload portfolio media.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [linkedSite, theme, user],
  );

  const removePortfolioItem = useCallback(
    (index: number) => {
      const items = (theme.portfolioItems ?? []).filter((_, i) => i !== index);
      updateTheme({ portfolioItems: items });
    },
    [theme.portfolioItems, updateTheme],
  );

  const uploadCertificationMedia = useCallback(
    async (fileUri: string, mimeType?: string | null) => {
      if (!linkedSite || !user?.id) throw new Error('Sign in again to upload media.');
      const currentItems = theme.certificationItems ?? [];
      if (currentItems.length >= MAX_CERTIFICATION_ITEMS) {
        throw new Error(`You can add up to ${MAX_CERTIFICATION_ITEMS} certification images.`);
      }
      setIsSaving(true);
      setError(null);
      try {
        const uploaded = await uploadCertificationMediaFromUri(linkedSite, fileUri, mimeType);
        const next = {
          ...theme,
          certificationItems: [...currentItems, { ...uploaded, caption: '' }],
        };
        setTheme(next);
        await saveSiteSetting(user.id, 'site_theme', next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not upload certification.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [linkedSite, theme, user],
  );

  const removeCertificationItem = useCallback(
    (index: number) => {
      const items = (theme.certificationItems ?? []).filter((_, i) => i !== index);
      updateTheme({ certificationItems: items });
    },
    [theme.certificationItems, updateTheme],
  );

  const updateCertificationCaption = useCallback(
    (index: number, caption: string) => {
      const items = (theme.certificationItems ?? []).map((item, i) =>
        i === index ? { ...item, caption } : item,
      );
      updateTheme({ certificationItems: items });
    },
    [theme.certificationItems, updateTheme],
  );

  const stackImageUrls = useMemo(() => {
    return (theme.heroStackImagePaths ?? []).map((p) => getStyleCoverImageUrl(p, linkedSite) ?? '').filter(Boolean);
  }, [linkedSite, theme.heroStackImagePaths]);

  const uploadStackImage = useCallback(
    async (fileUri: string) => {
      if (!linkedSite || !user?.id) throw new Error('Sign in again to upload images.');
      setIsSaving(true);
      setError(null);
      try {
        const currentPaths = theme.heroStackImagePaths ?? [];
        const currentFocus = theme.heroStackImageFocus ?? [];
        const slot = currentPaths.length;
        const storagePath = await uploadStackImageFromUri(linkedSite, slot, fileUri);
        const next = {
          ...theme,
          heroStackImagePaths: [...currentPaths, storagePath],
          heroStackImageFocus: [...currentFocus, { ...DEFAULT_STACK_IMAGE_FOCUS }],
        };
        setTheme(next);
        await saveSiteSetting(user.id, 'site_theme', next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not upload image.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [linkedSite, theme, user],
  );

  const removeStackImage = useCallback(
    (slot: number) => {
      const paths = (theme.heroStackImagePaths ?? []).filter((_, i) => i !== slot);
      const focus = (theme.heroStackImageFocus ?? []).filter((_, i) => i !== slot);
      updateTheme({ heroStackImagePaths: paths, heroStackImageFocus: focus });
    },
    [theme, updateTheme],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const value = useMemo(
    () => ({
      theme,
      isLoading,
      isSaving,
      hasPendingChanges,
      error,
      heroImageUrl,
      logoImageUrl,
      portfolioMediaUrls,
      certificationMediaUrls,
      stackImageUrls,
      uploadStackImage,
      removeStackImage,
      updateTheme,
      setHeroLayout,
      uploadHeroImage,
      uploadLogoImage,
      uploadPortfolioMedia,
      removePortfolioItem,
      uploadCertificationMedia,
      removeCertificationItem,
      updateCertificationCaption,
      removeHeroImage,
      saveThemeNow,
      flushPendingSave,
      refresh,
    }),
    [
      theme,
      isLoading,
      isSaving,
      hasPendingChanges,
      error,
      heroImageUrl,
      logoImageUrl,
      portfolioMediaUrls,
      certificationMediaUrls,
      stackImageUrls,
      uploadStackImage,
      removeStackImage,
      updateTheme,
      setHeroLayout,
      uploadHeroImage,
      uploadLogoImage,
      uploadPortfolioMedia,
      removePortfolioItem,
      uploadCertificationMedia,
      removeCertificationItem,
      updateCertificationCaption,
      removeHeroImage,
      saveThemeNow,
      flushPendingSave,
      refresh,
    ],
  );

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

const SITE_THEME_FALLBACK: SiteThemeContextValue = {
  theme: DEFAULT_SITE_THEME,
  isLoading: false,
  isSaving: false,
  hasPendingChanges: false,
  error: null,
  heroImageUrl: null,
  logoImageUrl: null,
  portfolioMediaUrls: [],
  certificationMediaUrls: [],
  stackImageUrls: [],
  updateTheme: () => {},
  setHeroLayout: () => {},
  uploadHeroImage: async () => {},
  uploadLogoImage: async () => {},
  uploadPortfolioMedia: async () => {},
  removePortfolioItem: () => {},
  uploadCertificationMedia: async () => {},
  removeCertificationItem: () => {},
  updateCertificationCaption: () => {},
  uploadStackImage: async () => {},
  removeStackImage: () => {},
  removeHeroImage: () => {},
  saveThemeNow: async () => {},
  flushPendingSave: async () => {},
  refresh: async () => {},
};

export function useSiteTheme() {
  return useContext(SiteThemeContext) ?? SITE_THEME_FALLBACK;
}
