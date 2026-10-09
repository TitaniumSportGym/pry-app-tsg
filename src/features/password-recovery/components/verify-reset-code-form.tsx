import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import {
  requestPasswordReset,
  verifyPasswordResetCode,
} from '@/features/password-recovery/api/password-recovery-api';
import { usePasswordRecovery } from '@/features/password-recovery/password-recovery-context';
import { getPasswordRecoveryError } from '@/features/password-recovery/password-recovery-errors';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';
import { ApiError } from '@/types/auth';

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyResetCodeForm() {
  const { email, confirmCode } = usePasswordRecovery();
  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify() {
    if (!email) {
      setFormError('Inicia nuevamente la recuperación para solicitar otro código.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setFieldError('Ingresa el código de 6 dígitos que recibiste por correo.');
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      await verifyPasswordResetCode(email, otp);
      confirmCode(otp);
      router.push('/reset-password');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
        setFieldError('El código es inválido o ya expiró.');
      } else {
        setFormError(
          getPasswordRecoveryError(
            error,
            'No fue posible verificar el código. Revisa tu conexión e inténtalo de nuevo.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) {
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setStatusMessage(null);
    setIsResending(true);

    try {
      await requestPasswordReset(email);
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatusMessage('Si el correo está registrado, enviamos un nuevo código.');
    } catch (error) {
      setFormError(
        getPasswordRecoveryError(
          error,
          'No fue posible reenviar el código. Espera un momento e inténtalo de nuevo.',
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return (
      <View style={styles.form}>
        <Text accessibilityRole="alert" style={styles.formError}>
          Faltan los datos de recuperación. Solicita un código nuevamente.
        </Text>
        <AppButton
          title="Solicitar código"
          onPress={() => router.replace('/forgot-password')}
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.emailArea}>
        <Text style={styles.emailLabel}>Código enviado a</Text>
        <Text numberOfLines={2} style={styles.email}>
          {email}
        </Text>
      </View>

      <AppInput
        autoComplete="one-time-code"
        error={fieldError}
        keyboardType="number-pad"
        label="Código de recuperación"
        leftIcon={{ ios: 'number', android: 'pin', web: 'pin' }}
        maxLength={6}
        placeholder="000000"
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={otp}
        onChangeText={(value) => {
          setOtp(value.replace(/\D/g, ''));
          setFieldError(undefined);
          setFormError(null);
          setStatusMessage(null);
        }}
        onSubmitEditing={() => void handleVerify()}
      />

      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}

      {statusMessage ? (
        <Text accessibilityRole="alert" style={styles.statusMessage}>
          {statusMessage}
        </Text>
      ) : null}

      <AppButton
        disabled={isResending}
        loading={isSubmitting}
        title="Verificar código"
        onPress={() => void handleVerify()}
      />

      <AppButton
        disabled={isSubmitting || cooldown > 0}
        loading={isResending}
        title={cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        variant="outline"
        onPress={() => void handleResend()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: AppSpacing.three,
  },
  emailArea: {
    gap: AppSpacing.one,
  },
  emailLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  email: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  formError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  statusMessage: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
