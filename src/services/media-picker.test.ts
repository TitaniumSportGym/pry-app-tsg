import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { formatMegabytes, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, pickImage, pickVideo, toFormDataFile, toPickResult } from './media-picker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

type Asset = Partial<ImagePicker.ImagePickerAsset>;
const picked = (asset: Asset) => ({ canceled: false, assets: [{ uri: 'file:///x', width: 1, height: 1, ...asset }] }) as ImagePicker.ImagePickerResult;

describe('Selector de archivos', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('reconoce la cancelación', () => {
    expect(toPickResult({ canceled: true, assets: null }, 'image')).toEqual({ status: 'cancelled' });
  });

  it('acepta imágenes y deduce el tipo por la extensión', () => {
    expect(toPickResult(picked({ uri: 'file:///cache/foto.PNG', fileSize: 1000 }), 'image')).toEqual({
      status: 'picked',
      file: { uri: 'file:///cache/foto.PNG', name: 'foto.PNG', type: 'image/png', size: 1000, durationMs: null },
    });
  });

  it('rechaza imágenes pesadas o que no son imagen', () => {
    expect(toPickResult(picked({ fileName: 'a.jpg', fileSize: MAX_IMAGE_BYTES + 1 }), 'image')).toEqual({
      status: 'invalid',
      message: 'La imagen pesa 5.0 MB. El máximo es 5 MB.',
    });
    expect(toPickResult(picked({ fileName: 'a.mp4', mimeType: 'video/mp4' }), 'image').status).toBe('invalid');
  });

  it('valida formato y tamaño de los videos', () => {
    expect(toPickResult(picked({ fileName: 'clip.mov', fileSize: 2048, duration: 30_000 }), 'video')).toEqual({
      status: 'picked',
      file: { uri: 'file:///x', name: 'clip.mov', type: 'video/quicktime', size: 2048, durationMs: 30_000 },
    });
    expect(toPickResult(picked({ fileName: 'clip.avi' }), 'video')).toEqual({ status: 'invalid', message: 'Elige un video MP4, WEBM o MOV.' });
    const heavy = toPickResult(picked({ mimeType: 'video/mp4', fileSize: MAX_VIDEO_BYTES * 2 }), 'video');
    expect(heavy).toEqual({ status: 'invalid', message: expect.stringContaining('200 MB') });
  });

  it('formatea megabytes y prepara el archivo para FormData', () => {
    expect(formatMegabytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatMegabytes(42 * 1024 * 1024)).toBe('42 MB');
    expect(toFormDataFile({ uri: 'u', name: 'n', type: 't', size: null, durationMs: null })).toEqual({ uri: 'u', name: 'n', type: 't' });
  });

  it('abre la galería para imágenes sin pedir permisos', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
    await expect(pickImage([1, 1])).resolves.toEqual({ status: 'cancelled' });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], aspect: [1, 1] }));
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('solo pide permiso de fototeca en iOS para videos', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
    Platform.OS = 'android';
    await pickVideo();
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();

    Platform.OS = 'ios';
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: false, accessPrivileges: 'none' } as never);
    await expect(pickVideo()).resolves.toEqual({ status: 'invalid', message: expect.stringContaining('Permite el acceso') });
  });
});
