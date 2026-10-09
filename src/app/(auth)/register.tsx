import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { RegistrationForm } from '@/features/registration/components/registration-form';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export default function RegisterScreen() {
  return (
    <AuthFormScreen
      description="Usa tu correo y crea una contraseña segura para comenzar."
      fallbackHref="/login"
      title="Crear cuenta">
      <RegistrationForm />

      <View style={styles.loginRow}>
        <Text style={styles.loginPrompt}>¿Ya tienes cuenta?</Text>
        <Link href="/login" style={styles.loginLink}>
          Inicia sesión
        </Link>
      </View>
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create({
  loginRow: {
    marginTop: AppSpacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.one,
  },
  loginPrompt: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  loginLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
});
