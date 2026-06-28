import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MAX_CERTIFICATION_ITEMS } from '../../data/siteTheme';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { pickSiteImageFromLibrary } from '../../lib/pickSiteImage';
import { colors } from '../../theme';

type CertificationMediaPreview = {
  url: string;
  mediaType: 'image' | 'video';
  caption: string;
};

type SiteCertificationsEditorProps = {
  items: CertificationMediaPreview[];
  busy?: boolean;
  onAddMedia: (uri: string, mimeType?: string | null) => Promise<void>;
  onRemoveMedia: (index: number) => void;
  onUpdateCaption: (index: number, caption: string) => void;
};

export default function SiteCertificationsEditor({
  items,
  busy,
  onAddMedia,
  onRemoveMedia,
  onUpdateCaption,
}: SiteCertificationsEditorProps) {
  const styles = useResponsiveStyles(BASE_STYLES);
  const [picking, setPicking] = useState(false);
  const canAddMore = items.length < MAX_CERTIFICATION_ITEMS;
  const isBusy = busy || picking;

  const pickMedia = async () => {
    if (!canAddMore) {
      Alert.alert('Limit reached', `You can add up to ${MAX_CERTIFICATION_ITEMS} certification images.`);
      return;
    }

    const picked = await pickSiteImageFromLibrary(
      'Allow photo library access to upload your certifications.',
    );
    if (!picked) return;

    setPicking(true);
    try {
      await onAddMedia(picked.uri, picked.mimeType);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {items.map((item, index) => (
        <View key={`${item.url}-${index}`} style={styles.card}>
          <View style={styles.imageFrame}>
            <Image source={{ uri: item.url }} style={styles.previewImage} resizeMode="contain" />
            <Pressable
              style={styles.removeBtn}
              onPress={() => onRemoveMedia(index)}
              accessibilityLabel="Remove certification"
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
          <TextInput
            style={styles.captionInput}
            value={item.caption}
            onChangeText={(caption) => onUpdateCaption(index, caption)}
            placeholder="Subtitle — e.g. State cosmetology license, 2024"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>
      ))}

      {canAddMore ? (
        <Pressable style={styles.addCard} onPress={pickMedia} disabled={isBusy}>
          {isBusy ? (
            <ActivityIndicator color={colors.accentPink} />
          ) : (
            <>
              <Ionicons name="add" size={24} color={colors.accentPink} />
              <Text style={styles.addLabel}>Add certification</Text>
            </>
          )}
        </Pressable>
      ) : null}

      <Text style={styles.helper}>
        {items.length}/{MAX_CERTIFICATION_ITEMS} images · JPG or PNG · full image shown on site
      </Text>
    </View>
  );
}

const BASE_STYLES = {
  wrap: {
    gap: 16,
  },
  card: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 12,
  },
  imageFrame: {
    position: 'relative',
    minHeight: 160,
    maxHeight: 280,
    borderRadius: 12,
    backgroundColor: colors.navbar,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionInput: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 28,
    backgroundColor: colors.card,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  helper: {
    fontSize: 12,
    color: colors.textMuted,
  },
};
