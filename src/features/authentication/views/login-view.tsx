import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { GoogleSignInView } from '@/features/authentication/views/google-sign-in-view';
import { LoginFormView } from '@/features/authentication/views/login-form-view';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface LoginViewProps {
  accountVerified?: string;
  passwordReset?: string;
}

export function LoginView({ accountVerified, passwordReset }: LoginViewProps) {
  const successMessage =
    passwordReset === '1'
      ? 'Contraseña actualizada. Ya puedes iniciar sesión.'
      : accountVerified === '1'
        ? 'Cuenta activada. Ya puedes iniciar sesión.'
        : null;

  return (
    <AuthFormScreen
      description="Entra a tu cuenta y continúa construyendo tu progreso."
      fallbackHref="/"
      title="INICIAR SESIÓN">
      {successMessage ? (
        <View accessibilityRole="alert" style={styles.successNotice}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={20}
            tintColor={AppColors.feedback.success}
          />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}
      <LoginFormView />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o continúa con</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleSignInView />
      <View style={styles.registerRow}>
        <Text style={styles.registerPrompt}>¿No tienes cuenta?</Text>
        <Link href="/register" style={styles.registerLink}>Regístrate</Link>
      </View>
      <Link href="/forgot-password" style={styles.forgotPassword}>
        Olvidé mi contraseña
      </Link>
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create({
  successNotice: {
    width: '100%',
    minHeight: 48,
    marginBottom: AppSpacing.three,
    borderWidth: 1,
    borderColor: AppColors.feedback.success,
    borderRadius: 7,
    backgroundColor: AppColors.feedback.successSoft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingHorizontal: 12,
    paddingVertical: AppSpacing.two,
  },
  successText: {
    flex: 1,
    color: AppColors.feedback.success,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  divider: {
    width: '100%',
    marginVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dividerLine: { height: 1, flex: 1, backgroundColor: AppColors.border.default },
  dividerText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  registerRow: {
    marginTop: AppSpacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.one,
  },
  registerPrompt: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  registerLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  forgotPassword: {
    marginTop: AppSpacing.three,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
