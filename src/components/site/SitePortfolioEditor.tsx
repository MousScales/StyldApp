import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MAX_PORTFOLIO_ITEMS } from '../../data/siteTheme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { pickSiteMediaFromLibrary } from '../../lib/pickSiteImage';
import { colors } from '../../theme';

type PortfolioMediaPreview = {
  url: string;
  mediaType: 'image' | 'video';
};

type SitePortfolioEditorProps = {
  items: PortfolioMediaPreview[];
  busy?: boolean;
  onAddMedia: (uri: string, mimeType?: string | null, mediaType?: 'image' | 'video') => Promise<void>;
  onRemoveMedia: (index: number) => void;
};

export default function SitePortfolioEditor({
  items,
  busy,
  onAddMedia,
  onRemoveMedia,
}: SitePortfolioEditorProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [picking, setPicking] = useState(false);
  const canAddMore = items.length < MAX_PORTFOLIO_ITEMS;
  const isBusy = busy || picking;

  const pickMedia = async () => {
    if (!canAddMore) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PORTFOLIO_ITEMS} photos or videos.`);
      return;
    }

    const picked = await pickSiteMediaFromLibrary(
      'Allow photo library access to upload your previous work.',
    );
    if (!picked) return;

    setPicking(true);
    try {
      await onAddMedia(picked.uri, picked.mimeType, picked.mediaType);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload media.');
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={`${item.url}-${index}`} style={styles.tile}>
            {item.mediaType === 'video' ? (
              <View style={styles.videoTile}>
                <Ionicons name="videocam" size={28} color={colors.textMuted} />
              </View>
            ) : (
              <Image source={{ uri: item.url }} style={styles.tileImage} resizeMode="cover" />
            )}
            <Pressable
              style={styles.removeBtn}
              onPress={() => onRemoveMedia(index)}
              accessibilityLabel="Remove media"
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {canAddMore ? (
          <Pressable style={styles.addTile} onPress={pickMedia} disabled={isBusy}>
            {isBusy ? (
              <ActivityIndicator color={colors.accentPink} />
            ) : (
              <>
                <Ionicons name="add" size={24} color={colors.accentPink} />
                <Text style={styles.addLabel}>Add photo or video</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.helper}>
        {items.length}/{MAX_PORTFOLIO_ITEMS} items · JPG, PNG, MP4, MOV
      </Text>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.navbar,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navbar,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: colors.card,
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  helper: {
    fontSize: 12,
    color: colors.textMuted,
  },
};
