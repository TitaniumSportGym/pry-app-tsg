import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { PasswordRequirements } from '@/features/registration/components/password-requirements';
import { isPasswordValid } from '@/features/registration/password-policy';
import { getRegistrationErrorMessage } from '@/features/registration/registration-errors';
import { registerMobile } from '@/services/authService';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegistrationForm() {
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};

    if (!normalizedEmail) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'Ingresa una contraseña.';
    } else if (!isPasswordValid(password)) {
      nextErrors.password = 'La contraseña todavía no cumple todos los requisitos.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma tu contraseña.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await registerMobile(normalizedEmail, password);
      router.push({ pathname: '/verify-account', params: { email: normalizedEmail } });
    } catch (error) {
      setFormError(
        getRegistrationErrorMessage(
          error,
          'No fue posible crear la cuenta. Revisa tu conexión e inténtalo de nuevo.',
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
        error={fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
        placeholder="correo@ejemplo.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFieldErrors((current) => ({ ...current, email: undefined }));
        }}
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      <AppInput
        ref={passwordInput}
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={fieldErrors.password}
        label="Contraseña"
        leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }}
        placeholder="••••••••"
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
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
        }}
        onSubmitEditing={() => void handleSubmit()}
      />

      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}

      <AppButton loading={isSubmitting} title="Crear cuenta" onPress={() => void handleSubmit()} />
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
