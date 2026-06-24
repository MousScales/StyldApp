import { Ionicons } from '@expo/vector-icons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HeroImageFocus } from '../../lib/heroImageFocus';
import { pickSiteImageFromLibrary } from '../../lib/pickSiteImage';
import SiteImageCropFrame from './SiteImageCropFrame';
import { colors } from '../../theme';

type HeroImagePickerProps = {
  imageUrl?: string | null;
  localUri?: string | null;
  busy?: boolean;
  placeholder?: string;
  onPick: (uri: string) => Promise<void>;
  onRemove?: () => void;
  large?: boolean;
  repositionable?: boolean;
  /** width / height shown on the live site */
  aspectRatio?: number;
  focus?: HeroImageFocus;
  onFocusChange?: (focus: HeroImageFocus) => void;
};

export default function HeroImagePicker({
  imageUrl,
  localUri,
  busy,
  placeholder = 'Choose photo',
  onPick,
  onRemove,
  large,
  repositionable = false,
  aspectRatio,
  focus,
  onFocusChange,
}: HeroImagePickerProps) {
  const styles = useResponsiveStyles(BASE_STYLES);

  const [picking, setPicking] = useState(false);
  const displayUri = localUri ?? imageUrl;
  const frameAspect = aspectRatio ?? (large ? 4 / 5 : 1);
  const canReposition = Boolean(repositionable && displayUri && focus && onFocusChange);

  const pickImage = async () => {
    const picked = await pickSiteImageFromLibrary(
      'Allow photo library access to upload your hero image.',
    );
    if (!picked) return;

    setPicking(true);
    try {
      await onPick(picked.uri);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setPicking(false);
    }
  };

  const isBusy = busy || picking;

  if (canReposition) {
    return (
      <View>
        <SiteImageCropFrame
          imageUri={displayUri!}
          aspectRatio={frameAspect}
          focus={focus!}
          onFocusChange={onFocusChange!}
          borderRadius={large ? 18 : 14}
          disabled={isBusy}
        />
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={pickImage} disabled={isBusy}>
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.accentPink} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color={colors.accentPink} />
                <Text style={styles.actionBtnText}>Change photo</Text>
              </>
            )}
          </Pressable>
          {onRemove ? (
            <Pressable style={styles.actionBtn} onPress={onRemove} disabled={isBusy}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        style={[styles.button, large && styles.buttonLarge, { aspectRatio: large ? 4 / 5 : undefined }]}
        onPress={pickImage}
        disabled={isBusy}
      >
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={[styles.image, large && styles.imageLarge]} />
        ) : (
          <View style={[styles.placeholder, large && styles.placeholderLarge]}>
            <Ionicons name="image-outline" size={large ? 32 : 24} color={colors.textMuted} />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}
        <View style={styles.overlay}>
          {isBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.overlayText}>{displayUri ? 'Change photo' : 'Add photo'}</Text>
            </>
          )}
        </View>
      </Pressable>
      {displayUri && onRemove ? (
        <Pressable style={styles.removeBtn} onPress={onRemove} disabled={isBusy}>
          <Text style={styles.removeText}>Remove photo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const BASE_STYLES = {
  button: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  buttonLarge: {
    borderRadius: 18,
  },
  image: {
    width: '100%',
    height: 140,
  },
  imageLarge: {
    height: 200,
  },
  placeholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
  },
  placeholderLarge: {
    height: 200,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionBtnText: {
    color: colors.accentPink,
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
};
