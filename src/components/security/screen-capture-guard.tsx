import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

function NativeScreenCaptureGuard({ guardKey }: { guardKey: string }) {
  usePreventScreenCapture(guardKey);
  return null;
}

/**
 * Bloquea capturas y grabaciones de pantalla mientras está montado (en Android también
 * oculta la vista previa del selector de apps). Se usa en pantallas con datos que no deben
 * copiarse, como el pase de acceso. En web no hay API para hacerlo.
 */
export function ScreenCaptureGuard({ guardKey }: { guardKey: string }) {
  return Platform.OS === 'web' ? null : <NativeScreenCaptureGuard guardKey={guardKey} />;
}
