import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { requestPasswordReset } from '@/features/password-recovery/api/password-recovery-api';
import { usePasswordRecovery } from '@/features/password-recovery/password-recovery-context';
import { getPasswordRecoveryError } from '@/features/password-recovery/password-recovery-errors';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function RequestResetForm() {
  const { beginRecovery } = usePasswordRecovery();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFieldError('Ingresa tu correo electrónico.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFieldError('Ingresa un correo electrónico válido.');
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(normalizedEmail);
      beginRecovery(normalizedEmail);
      router.push('/verify-reset-code');
    } catch (error) {
      setFormError(
        getPasswordRecoveryError(
          error,
          'No fue posible procesar la solicitud. Revisa tu conexión e inténtalo de nuevo.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={fieldError}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
        placeholder="correo@ejemplo.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFieldError(undefined);
          setFormError(null);
        }}
        onSubmitEditing={() => void handleSubmit()}
      />

      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}

      <AppButton loading={isSubmitting} title="Enviar código" onPress={() => void handleSubmit()} />

      <Text style={styles.privacyText}>
        Por seguridad, recibirás la misma confirmación aunque el correo no esté registrado.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: AppSpacing.three,
  },
  formError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  privacyText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
