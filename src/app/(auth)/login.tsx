import { Link, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/components/auth/login-form';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { accountVerified, passwordReset } = useLocalSearchParams<{
    accountVerified?: string;
    passwordReset?: string;
  }>();
  const successMessage =
    passwordReset === '1'
      ? 'Contraseña actualizada. Ya puedes iniciar sesión.'
      : accountVerified === '1'
        ? 'Cuenta activada. Ya puedes iniciar sesión.'
        : null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>Iniciar sesión</Text>
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
            <LoginForm />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton />

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>¿No tienes cuenta?</Text>
              <Link href="/register" style={styles.registerLink}>
                Regístrate
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.surface.soft,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: AppSpacing.four,
    paddingTop: 56,
    paddingBottom: AppSpacing.five,
  },
  content: {
    width: '100%',
    maxWidth: 420,
  },
  title: {
    marginBottom: AppSpacing.four,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 24,
    lineHeight: 30,
  },
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
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: AppColors.border.default,
  },
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
});
