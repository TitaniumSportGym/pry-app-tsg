import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/components/auth/login-form';
import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export default function LoginScreen() {
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
            <LoginForm />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            <AppButton
              disabled
              leftIcon={
                <Image
                  accessibilityLabel="Google"
                  contentFit="contain"
                  source={require('@/assets/images/tabIcons/googleIcon.png')}
                  style={styles.googleIcon}
                />
              }
              title="Google"
              variant="outline"
            />

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>¿No tienes cuenta?</Text>
              <Text accessibilityState={{ disabled: true }} style={styles.registerLink}>
                Regístrate
              </Text>
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
  googleIcon: {
    width: 18,
    height: 18,
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
