import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedSiteMediaType = 'image' | 'video';

export type PickedSiteImage = {
  uri: string;
  mimeType?: string | null;
  mediaType: PickedSiteMediaType;
};

function inferMediaType(asset: ImagePicker.ImagePickerAsset): PickedSiteMediaType {
  if (asset.type === 'video' || asset.type === 'pairedVideo') return 'video';
  if (asset.mimeType?.startsWith('video/')) return 'video';
  if (typeof asset.duration === 'number' && asset.duration > 0) return 'video';
  return 'image';
}

export async function pickSiteImageFromLibrary(
  permissionMessage: string,
): Promise<PickedSiteImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', permissionMessage);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    mediaType: 'image',
  };
}

export async function pickSiteMediaFromLibrary(
  permissionMessage: string,
): Promise<PickedSiteImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', permissionMessage);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: false,
    quality: 0.85,
    ...(Platform.OS === 'ios'
      ? { videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality }
      : {}),
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    mediaType: inferMediaType(asset),
  };
}
