import type { BarcodeType } from 'expo-camera';

/** El pase de acceso del socio siempre es un código QR; ignorar otros formatos evita lecturas falsas. */
export const ACCESS_BARCODE_TYPES: BarcodeType[] = ['qr'];

/** El token del pase mide 43 caracteres; un QR mucho más largo no es un pase y no se envía. */
const MAX_SCANNED_CODE_LENGTH = 256;

/**
 * Limpia el contenido leído por la cámara.
 * Devuelve null cuando no hay nada útil (lectura vacía o solo espacios) o cuando
 * es demasiado largo para ser un pase. El backend decide si el código es válido.
 */
export function normalizeScannedCode(data: string | null | undefined): string | null {
  const code = data?.trim() ?? '';
  return code.length > 0 && code.length <= MAX_SCANNED_CODE_LENGTH ? code : null;
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
