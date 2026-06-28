import { File } from 'expo-file-system';
import { STYLE_COVER_BUCKET } from '../data/serviceCatalog';
import { supabase } from './supabase';

export type SiteMediaKind = 'image' | 'video';

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
  webm: 'video/webm',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function normalizeMimeType(
  mimeType: string | null | undefined,
  fileUri: string,
  mediaKind: SiteMediaKind = 'image',
): string {
  if (mimeType?.startsWith('image/') || mimeType?.startsWith('video/')) {
    return mimeType;
  }

  const ext = fileUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (ext && MIME_BY_EXTENSION[ext]) {
    return MIME_BY_EXTENSION[ext];
  }

  return mediaKind === 'video' ? 'video/mp4' : 'image/jpeg';
}

function normalizeExtension(mimeType: string, fileUri: string, mediaKind: SiteMediaKind): string {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;

  const fromUri = fileUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;

  return mediaKind === 'video' ? 'mp4' : 'jpg';
}

async function readMediaBytes(fileUri: string): Promise<Uint8Array> {
  try {
    const response = await fetch(fileUri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        return new Uint8Array(buffer);
      }
    }
  } catch {
    // Fall back to expo-file-system below.
  }

  try {
    const file = new File(fileUri);
    if (!file.exists) {
      throw new Error('Could not read selected file.');
    }

    const bytes = await file.bytes();
    if (!bytes.byteLength) {
      throw new Error('Selected file is empty.');
    }

    return bytes;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not read selected file.');
  }
}

async function uploadMediaAtPath(
  storagePathPrefix: string,
  fileUri: string,
  mimeType?: string | null,
  mediaKind: SiteMediaKind = 'image',
): Promise<string> {
  const contentType = normalizeMimeType(mimeType, fileUri, mediaKind);
  const extension = normalizeExtension(contentType, fileUri, mediaKind);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const storagePath = `${storagePathPrefix}/${fileName}`;
  const bytes = await readMediaBytes(fileUri);

  const { error } = await supabase.storage.from(STYLE_COVER_BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType,
  });

  if (error) {
    const hint =
      error.message.toLowerCase().includes('size') || error.message.toLowerCase().includes('large')
        ? ' Try a shorter clip or lower quality video.'
        : '';
    throw new Error(`${error.message}${hint}`);
  }

  return storagePath;
}

async function uploadImageAtPath(
  storagePathPrefix: string,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadMediaAtPath(storagePathPrefix, fileUri, mimeType, 'image');
}

export async function uploadUserSiteImage(
  userId: string,
  fileUri: string,
  folder: string,
  mimeType?: string | null,
  mediaKind: SiteMediaKind = 'image',
): Promise<string> {
  return uploadMediaAtPath(`${userId}/${folder}`, fileUri, mimeType, mediaKind);
}

export async function uploadStyleCoverImage(
  userId: string,
  styleId: string,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadImageAtPath(`${userId}/${styleId}`, fileUri, mimeType);
}
