import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { resetPassword } from '@/features/password-recovery/api/password-recovery-api';
import { usePasswordRecovery } from '@/features/password-recovery/password-recovery-context';
import { getPasswordRecoveryError } from '@/features/password-recovery/password-recovery-errors';
import { PasswordRequirements } from '@/features/registration/components/password-requirements';
import { isPasswordValid } from '@/features/registration/password-policy';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

export function ResetPasswordForm() {
  const { email, otp, clearRecovery } = usePasswordRecovery();
  const confirmPasswordInput = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email || !otp) {
      setFormError('La sesión de recuperación ya no está disponible. Solicita otro código.');
      return;
    }

    const nextErrors: FieldErrors = {};

    if (!password) {
      nextErrors.password = 'Ingresa una contraseña nueva.';
    } else if (!isPasswordValid(password)) {
      nextErrors.password = 'La contraseña todavía no cumple todos los requisitos.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma la contraseña nueva.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ email, otp, newPassword: password });
      clearRecovery();
      router.replace({ pathname: '/login', params: { passwordReset: '1' } });
    } catch (error) {
      setFormError(
        getPasswordRecoveryError(
          error,
          'No fue posible cambiar la contraseña. Solicita un código nuevo e inténtalo otra vez.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!email || !otp) {
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
      <AppInput
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={fieldErrors.password}
        label="Nueva contraseña"
        leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }}
        placeholder="••••••••"
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
          setFormError(null);
        }}
        onSubmitEditing={() => confirmPasswordInput.current?.focus()}
      />

      <PasswordRequirements password={password} />

      <AppInput
        ref={confirmPasswordInput}
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={fieldErrors.confirmPassword}
        label="Confirmar contraseña"
        leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }}
        placeholder="••••••••"
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
          setFormError(null);
        }}
        onSubmitEditing={() => void handleSubmit()}
      />

      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}

      <AppButton
        loading={isSubmitting}
        title="Cambiar contraseña"
        onPress={() => void handleSubmit()}
      />
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
});
