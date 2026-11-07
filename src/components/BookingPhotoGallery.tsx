import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { LAYOUT_BASE, makeScaleFns } from '../theme/layout';
import { colors } from '../theme';

type PhotoItem = { uri: string; label: string };

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
};

function ZoomableImage({ uri, width, height }: ZoomableImageProps) {
  return (
    <ScrollView
      style={{ width, height }}
      contentContainerStyle={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      centerContent
      bouncesZoom
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <Image
        source={{ uri }}
        style={{ width, height }}
        resizeMode="contain"
      />
    </ScrollView>
  );
}

type Props = {
  photoHairPath?: string;
  photoRefPath?: string;
  /** Folder prefix in booking-photos — usually data.id from the booking payload */
  storageBookingId?: string;
};

function labelForPath(path: string): string {
  const name = path.split('/').pop() ?? path;
  if (name.startsWith('current-hair') || name.startsWith('hair')) return 'Hair photo';
  if (name.startsWith('reference') || name.startsWith('ref')) return 'Reference';
  return 'Photo';
}

function storageFolderFromPaths(
  photoHairPath?: string,
  photoRefPath?: string,
  storageBookingId?: string,
): string | null {
  const path = photoHairPath?.trim() || photoRefPath?.trim();
  if (path?.includes('/')) {
    return path.replace(/\/[^/]+$/, '');
  }
  return storageBookingId?.trim() || null;
}

export default function BookingPhotoGallery({
  photoHairPath,
  photoRefPath,
  storageBookingId,
}: Props) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const { width, height } = useWindowDimensions();
  const photoSize = useMemo(
    () => makeScaleFns(width, LAYOUT_BASE.height).rw(LAYOUT_BASE.width / 2 - 28),
    [width],
  );
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activePhoto = activeIndex !== null ? photos[activeIndex] ?? null : null;
  const lightboxImageWidth = width - (photos.length > 1 ? 112 : 32);
  const lightboxImageHeight = height * 0.68;

  function showPrevPhoto() {
    setActiveIndex((current) => {
      if (current === null || photos.length <= 1) return current;
      return (current - 1 + photos.length) % photos.length;
    });
  }

  function showNextPhoto() {
    setActiveIndex((current) => {
      if (current === null || photos.length <= 1) return current;
      return (current + 1) % photos.length;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function signedUrl(path: string): Promise<string | null> {
      const { data, error } = await supabase.storage
        .from('booking-photos')
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    async function loadFromPaths(): Promise<PhotoItem[]> {
      const entries: { path: string; label: string }[] = [];
      if (photoHairPath?.trim()) {
        entries.push({ path: photoHairPath.trim(), label: 'Hair photo' });
      }
      if (photoRefPath?.trim()) {
        entries.push({ path: photoRefPath.trim(), label: 'Reference' });
      }

      const loaded = await Promise.all(
        entries.map(async (entry) => {
          const uri = await signedUrl(entry.path);
          return uri ? { uri, label: entry.label } : null;
        }),
      );
      return loaded.filter((item): item is PhotoItem => item !== null);
    }

    async function loadFromFolder(folderId: string): Promise<PhotoItem[]> {
      const { data: files, error } = await supabase.storage
        .from('booking-photos')
        .list(folderId);

      if (error || !files?.length) return [];

      const loaded = await Promise.all(
        files.map(async (file) => {
          const path = `${folderId}/${file.name}`;
          const uri = await signedUrl(path);
          return uri ? { uri, label: labelForPath(file.name) } : null;
        }),
      );
      return loaded.filter((item): item is PhotoItem => item !== null);
    }

    async function loadFromEdge(): Promise<PhotoItem[]> {
      if (!storageBookingId?.trim()) return [];
      const { data, error } = await supabase.functions.invoke('booking-photos-signed', {
        body: {
          bookingId: storageBookingId.trim(),
          photoHairPath: photoHairPath?.trim() || undefined,
          photoRefPath: photoRefPath?.trim() || undefined,
        },
      });
      if (error || !data?.photos?.length) return [];
      return (data.photos as PhotoItem[]).filter((p) => p?.uri);
    }

    async function load() {
      try {
        // Edge function uses service role — works even when storage RLS for authenticated is missing.
        let items = await loadFromEdge();
        if (!items.length) {
          items = await loadFromPaths();
        }
        const storageFolder = storageFolderFromPaths(
          photoHairPath,
          photoRefPath,
          storageBookingId,
        );
        if (!items.length && storageFolder) {
          items = await loadFromFolder(storageFolder);
        }
        if (!cancelled) {
          setPhotos(items);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [photoHairPath, photoRefPath, storageBookingId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  if (!photos.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        <Text style={styles.emptyText}>No photos uploaded</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <Pressable
            key={`${photo.label}-${index}`}
            style={[styles.item, { width: photoSize }]}
            onPress={() => setActiveIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`View ${photo.label} full screen`}
          >
            <Image
              source={{ uri: photo.uri }}
              style={[styles.image, { width: photoSize, height: photoSize }]}
              resizeMode="cover"
            />
            <View style={styles.label}>
              <Text style={styles.labelText}>{photo.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={activePhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveIndex(null)}
      >
        <View style={styles.lightbox}>
          <Pressable
            style={styles.lightboxBackdrop}
            onPress={() => setActiveIndex(null)}
            accessibilityLabel="Close photo"
          />
          <SafeAreaView style={styles.lightboxSafe} edges={['top', 'bottom']}>
            <View style={styles.lightboxHeader}>
              <Text style={styles.lightboxTitle}>{activePhoto?.label ?? ''}</Text>
            </View>

            <View style={styles.lightboxStage}>
              {photos.length > 1 ? (
                <Pressable
                  style={styles.lightboxNav}
                  onPress={showPrevPhoto}
                  hitSlop={12}
                  accessibilityLabel="Previous photo"
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </Pressable>
              ) : null}

              {activePhoto ? (
                <View style={styles.lightboxImageWrap}>
                  <ZoomableImage
                    key={activePhoto.uri}
                    uri={activePhoto.uri}
                    width={lightboxImageWidth}
                    height={lightboxImageHeight}
                  />
                </View>
              ) : null}

              {photos.length > 1 ? (
                <Pressable
                  style={styles.lightboxNav}
                  onPress={showNextPhoto}
                  hitSlop={12}
                  accessibilityLabel="Next photo"
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.lightboxFooter}>
              {photos.length > 1 && activeIndex !== null ? (
                <Text style={styles.lightboxCounter}>
                  {activeIndex + 1} of {photos.length}
                </Text>
              ) : (
                <View style={styles.lightboxCounterSpacer} />
              )}
              <Pressable
                style={styles.lightboxClose}
                onPress={() => setActiveIndex(null)}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const BASE_STYLES = {
  loading: { paddingVertical: 24, alignItems: 'center' },
  empty: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.progressTrack,
  },
  image: {},
  label: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  labelText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  lightboxSafe: {
    flex: 1,
  },
  lightboxHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  lightboxTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  lightboxFooter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 14,
  },
  lightboxClose: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  lightboxStage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  lightboxNav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  lightboxImageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lightboxCounter: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13,
    fontWeight: '500',
  },
  lightboxCounterSpacer: {
    height: 18,
  },
};
