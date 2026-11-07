import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { getInitials } from '../../data/clients';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme';

const AVATAR_COLORS = ['#f0c4d8', '#f5b8ce', '#e8a8bf', '#f2c8d8', '#ebb5c8', '#f8cfe0'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Props = {
  name: string;
  photoHairPath?: string;
  storageBookingId?: string;
  size?: number;
  style?: ViewStyle;
};

async function resolveHairPhotoUri(
  photoHairPath?: string,
  storageBookingId?: string,
): Promise<string | null> {
  if (storageBookingId?.trim()) {
    const { data, error } = await supabase.functions.invoke('booking-photos-signed', {
      body: {
        bookingId: storageBookingId.trim(),
        photoHairPath: photoHairPath?.trim() || undefined,
      },
    });
    const photos = (data?.photos as { uri?: string; label?: string }[] | undefined) ?? [];
    const hair = photos.find((photo) => photo?.uri && /hair/i.test(photo.label ?? ''));
    if (!error && hair?.uri) return hair.uri;
  }

  if (photoHairPath?.trim()) {
    const { data, error } = await supabase.storage
      .from('booking-photos')
      .createSignedUrl(photoHairPath.trim(), 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return null;
}

export default function ClientAvatar({
  name,
  photoHairPath,
  storageBookingId,
  size = 42,
  style,
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(photoHairPath?.trim() || storageBookingId?.trim()));
  const radius = size / 2;
  const bg = avatarColor(name);

  useEffect(() => {
    let cancelled = false;

    if (!photoHairPath?.trim() && !storageBookingId?.trim()) {
      setUri(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void resolveHairPhotoUri(photoHairPath, storageBookingId).then((nextUri) => {
      if (cancelled) return;
      setUri(nextUri);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [photoHairPath, storageBookingId]);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#7a2040" />
      ) : uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.33) }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  initials: {
    fontWeight: '700',
    color: '#7a2040',
    letterSpacing: 0.4,
  },
});
