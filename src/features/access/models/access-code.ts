import type { BarcodeType } from 'expo-camera';

/** El pase de acceso del socio siempre es un código QR; ignorar otros formatos evita lecturas falsas. */
export const ACCESS_BARCODE_TYPES: BarcodeType[] = ['qr'];

/**
 * Limpia el contenido leído por la cámara.
 * Devuelve null cuando no hay nada útil (lectura vacía o solo espacios).
 * La validación del código contra el backend queda pendiente.
 */
export function normalizeScannedCode(data: string | null | undefined): string | null {
  const code = data?.trim() ?? '';
  return code.length > 0 ? code : null;
}

export type CameraAccess = 'loading' | 'granted' | 'askable' | 'blocked';

/** Traduce la respuesta de permisos de la cámara al estado que muestra la pantalla. */
export function getCameraAccess(
  permission: { granted: boolean; canAskAgain: boolean } | null,
): CameraAccess {
  if (!permission) return 'loading';
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'askable' : 'blocked';
}
