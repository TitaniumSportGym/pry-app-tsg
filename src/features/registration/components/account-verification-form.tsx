import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { getRegistrationErrorMessage } from '@/features/registration/registration-errors';
import { resendVerificationOtp, verifyAccountOtp } from '@/services/authService';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';
import { ApiError } from '@/types/auth';

interface AccountVerificationFormProps {
  email?: string;
}

export function AccountVerificationForm({ email }: AccountVerificationFormProps) {
  const normalizedEmail = email?.trim().toLowerCase();
  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify() {
    if (!normalizedEmail) {
      setFormError('No encontramos el correo que se debe verificar. Vuelve al registro.');
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
      await verifyAccountOtp(normalizedEmail, otp);
      router.replace({ pathname: '/login', params: { accountVerified: '1' } });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
        setFieldError('El código es inválido o ya expiró.');
      } else {
        setFormError(
          getRegistrationErrorMessage(
            error,
            'No fue posible verificar el correo. Revisa tu conexión e inténtalo de nuevo.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!normalizedEmail) {
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setStatusMessage(null);
    setIsResending(true);

    try {
      const response = await resendVerificationOtp(normalizedEmail);
      setOtp('');
      setStatusMessage(response.message || 'Enviamos un nuevo código a tu correo.');
    } catch (error) {
      setFormError(
        getRegistrationErrorMessage(
          error,
          'No fue posible reenviar el código. Espera un momento e inténtalo de nuevo.',
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.emailArea}>
        <Text style={styles.emailLabel}>Código enviado a</Text>
        <Text numberOfLines={2} style={styles.email}>
          {normalizedEmail ?? 'correo no disponible'}
        </Text>
      </View>

      <AppInput
        autoComplete="one-time-code"
        error={fieldError}
        keyboardType="number-pad"
        label="Código de verificación"
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
        disabled={!normalizedEmail || isResending}
        loading={isSubmitting}
        title="Verificar correo"
        onPress={() => void handleVerify()}
      />

      <AppButton
        disabled={!normalizedEmail || isSubmitting}
        loading={isResending}
        title="Reenviar código"
        variant="outline"
        onPress={() => void handleResend()}
      />

      <Text style={styles.helpText}>
        Revisa también la carpeta de correo no deseado. El código puede tardar unos minutos.
      </Text>
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
  helpText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
