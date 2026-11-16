import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface LogoutButtonProps {
  isSigningOut: boolean;
  onPress: () => void;
}

/** "CERRAR SESIÓN" del menú "Más": el mismo botón para cliente, entrenador y administrador. */
export function LogoutButton({ isSigningOut, onPress }: LogoutButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
      disabled={isSigningOut}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}>
      {/* Mientras sale, el spinner reemplaza al ícono y el texto se queda (nombre accesible estable). */}
      {isSigningOut ? (
        <ActivityIndicator color={AppColors.brand.primary} size="small" />
      ) : (
        <SymbolView
          name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
          size={18}
          tintColor={AppColors.brand.primary}
        />
      )}
      <Text style={styles.text}>CERRAR SESIÓN</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: AppColors.surface.softSelected,
    borderRadius: 16,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
  },
  text: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
  },
  pressed: { opacity: 0.75 },
});
