import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Límites del backend (los mismos que muestra la web). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_EXTENSIONS: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const IMAGE_EXTENSIONS: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

/** Archivo listo para FormData en React Native ({ uri, name, type }). */
export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  /** Bytes, si el sistema los informa. */
  size: number | null;
  /** Milisegundos, solo videos. */
  durationMs: number | null;
}

export type PickResult =
  | { status: 'picked'; file: PickedFile }
  | { status: 'cancelled' }
  | { status: 'invalid'; message: string };

export function formatMegabytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function extensionOf(name: string) {
  return name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Convierte el resultado del selector y valida tipo y tamaño antes de subir nada, para no
 * gastar datos en un archivo que el backend va a rechazar.
 */
export function toPickResult(result: ImagePicker.ImagePickerResult, kind: 'image' | 'video'): PickResult {
  if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };
  const asset = result.assets[0];
  const fallbackName = kind === 'image' ? 'imagen.jpg' : 'video.mp4';
  const name = asset.fileName?.trim() || asset.uri.split('/').pop() || fallbackName;
  const ext = extensionOf(name);
  const type = asset.mimeType || (kind === 'image' ? IMAGE_EXTENSIONS[ext] : VIDEO_EXTENSIONS[ext]) || '';
  const size = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : null;

  if (kind === 'image') {
    if (type && !type.startsWith('image/')) return { status: 'invalid', message: 'Elige una imagen (JPG o PNG).' };
    if (size !== null && size > MAX_IMAGE_BYTES) {
      return { status: 'invalid', message: `La imagen pesa ${formatMegabytes(size)}. El máximo es 5 MB.` };
    }
  } else {
    if (!VIDEO_TYPES.includes(type)) return { status: 'invalid', message: 'Elige un video MP4, WEBM o MOV.' };
    if (size !== null && size > MAX_VIDEO_BYTES) {
      return {
        status: 'invalid',
        message: `El video pesa ${formatMegabytes(size)}. El máximo es 100 MB: recórtalo en tu galería o usa un enlace de YouTube.`,
      };
    }
  }

  return {
    status: 'picked',
    file: {
      uri: asset.uri,
      name,
      type: type || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      size,
      durationMs: typeof asset.duration === 'number' ? asset.duration : null,
    },
  };
}

/** Solo galería (sin cámara): en Android 13+ el selector del sistema no pide permisos. */
export async function pickImage(aspect: [number, number] = [16, 9]): Promise<PickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  return toPickResult(result, 'image');
}

export async function pickVideo(): Promise<PickResult> {
  // Solo iOS necesita acceso a la fototeca para leer el video original. En Android el
  // selector del sistema funciona sin READ_MEDIA_*, permisos que la app bloquea a propósito.
  if (Platform.OS === 'ios') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges !== 'limited') {
      return { status: 'invalid', message: 'Permite el acceso a tus fotos y videos para elegir un video.' };
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
  return toPickResult(result, 'video');
}

/** Valor para FormData; React Native acepta { uri, name, type } como archivo. */
export function toFormDataFile(file: PickedFile) {
  return { uri: file.uri, name: file.name, type: file.type } as unknown as Blob;
}
