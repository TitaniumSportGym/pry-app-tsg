import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppColors } from '@/theme/tokens';

export const DUMBBELL_ICON: SymbolViewProps['name'] = {
  ios: 'dumbbell.fill',
  android: 'fitness_center',
  web: 'fitness_center',
};

/** Contenido decorativo del QR bloqueado: no es un pase y no abre nada. */
const PLACEHOLDER_VALUE = 'TITANIUM SPORT GYM';

interface AccessQrCodeProps {
  /** Token del pase; null mientras carga o cuando el código está desactivado. */
  value: string | null;
  size: number;
  /** Bloqueado: QR gris con candado (membresía no vigente o código vencido). */
  locked?: boolean;
  loading?: boolean;
}

/**
 * QR del pase con el logo del gimnasio al centro. Usa corrección de errores alta (H)
 * para que el logo no impida la lectura. El token nunca se expone como texto ni a
 * los lectores de pantalla.
 */
export function AccessQrCode({ value, size, locked = false, loading = false }: AccessQrCodeProps) {
  const logoSize = Math.round(size * 0.2);
  const lockSize = Math.min(64, Math.round(size * 0.32));
  const showCode = value !== null && !locked;

  return (
    <View
      accessible
      accessibilityLabel={
        showCode ? 'Código QR de acceso. Muéstralo en recepción.' : 'Código QR no disponible'
      }
      accessibilityRole="image"
      style={[styles.box, { width: size, height: size }]}>
      {loading ? (
        <ActivityIndicator color={AppColors.brand.primary} size="large" />
      ) : (
        <>
          <View style={locked || !showCode ? styles.faded : null}>
            <QRCode
              backgroundColor={AppColors.surface.default}
              color={AppColors.neutral.black}
              ecl="H"
              quietZone={0}
              size={size}
              value={showCode ? value : PLACEHOLDER_VALUE}
            />
          </View>
          {showCode ? (
            <View
              style={[
                styles.logo,
                { width: logoSize, height: logoSize, borderRadius: logoSize * 0.28 },
              ]}>
              <SymbolView
                name={DUMBBELL_ICON}
                size={Math.round(logoSize * 0.55)}
                tintColor={AppColors.neutral.white}
              />
            </View>
          ) : (
            <View
              style={[styles.lock, { width: lockSize, height: lockSize, borderRadius: lockSize / 2 }]}>
              <SymbolView
                name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                size={Math.round(lockSize * 0.44)}
                tintColor={AppColors.neutral.white}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.1 },
  logo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AppColors.surface.default,
    backgroundColor: AppColors.brand.primary,
  },
  lock: {
    position: 'absolute',
    backgroundColor: AppColors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
