import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, SiteContent } from '../data/siteContent';
import { loadSiteSetting, saveSiteSetting } from '../lib/siteRecords';
import { useAuth } from './AuthContext';

type SiteContentContextValue = {
  content: SiteContent;
  isLoading: boolean;
  isSaving: boolean;
  hasPendingChanges: boolean;
  error: string | null;
  updateContent: (patch: Partial<SiteContent>) => void;
  saveContentNow: (next: SiteContent) => Promise<void>;
  flushPendingSave: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SiteContentContext = createContext<SiteContentContextValue | undefined>(undefined);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const pendingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setContent(DEFAULT_SITE_CONTENT);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await loadSiteSetting(
        user.id,
        'site_content',
        normalizeSiteContent,
        DEFAULT_SITE_CONTENT,
      );
      setContent(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load site content.');
      setContent(DEFAULT_SITE_CONTENT);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: SiteContent) => {
      if (!user?.id) return;

      setIsSaving(true);
      setError(null);

      try {
        await saveSiteSetting(user.id, 'site_content', next);
        pendingRef.current = false;
        setHasPendingChanges(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save site content.');
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id],
  );

  const updateContent = useCallback(
    (patch: Partial<SiteContent>) => {
      setContent((current) => {
        const next = { ...current, ...patch };
        if (patch.socialLinks) {
          next.instagramHandle = next.socialLinks.instagram;
        } else if (patch.instagramHandle !== undefined) {
          next.socialLinks = {
            ...next.socialLinks,
            instagram: patch.instagramHandle.replace(/^@+/, '').trim(),
          };
        }
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

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const saveContentNow = useCallback(
    async (next: SiteContent) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      contentRef.current = next;
      setContent(next);
      await persist(next);
    },
    [persist],
  );

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!pendingRef.current || !user?.id) return;
    await persist(contentRef.current);
  }, [persist, user?.id]);

  const value = useMemo(
    () => ({
      content,
      isLoading,
      isSaving,
      hasPendingChanges,
      error,
      updateContent,
      saveContentNow,
      flushPendingSave,
      refresh,
    }),
    [
      content,
      isLoading,
      isSaving,
      hasPendingChanges,
      error,
      updateContent,
      saveContentNow,
      flushPendingSave,
      refresh,
    ],
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error('useSiteContent must be used within SiteContentProvider');
  }
  return context;
}
