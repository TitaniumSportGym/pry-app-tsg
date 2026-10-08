import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { useAuth } from '@/hooks/use-auth';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';
import { ApiError } from '@/types/auth';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { confirmOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVerify() {
    const normalizedOtp = otp.trim();

    if (!email || !normalizedOtp) {
      setError('Ingresa el código de verificación.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await confirmOtp(email, normalizedOtp);
    } catch (verificationError) {
      setError(
        verificationError instanceof ApiError
          ? verificationError.message
          : 'No fue posible verificar el código. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>Verificar código</Text>
          <Text style={styles.description}>Ingresa el código enviado a {email ?? 'tu correo'}.</Text>
          <AppInput
            autoComplete="one-time-code"
            error={error ?? undefined}
            keyboardType="number-pad"
            label="Código de verificación"
            leftIcon={{ ios: 'number', android: 'pin', web: 'pin' }}
            maxLength={8}
            placeholder="000000"
            textContentType="oneTimeCode"
            value={otp}
            onChangeText={(value) => {
              setOtp(value);
              setError(null);
            }}
            onSubmitEditing={() => void handleVerify()}
          />
          <AppButton loading={isSubmitting} title="Verificar" onPress={() => void handleVerify()} />
          <Text accessibilityRole="link" onPress={() => router.back()} style={styles.backLink}>
            Volver al inicio de sesión
          </Text>
        </View>
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
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.four,
    paddingVertical: AppSpacing.five,
  },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 24,
    lineHeight: 30,
  },
  description: {
    marginBottom: AppSpacing.two,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  backLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
