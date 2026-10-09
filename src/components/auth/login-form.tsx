import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { useAuth } from '@/hooks/use-auth';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';
import { ApiError } from '@/types/auth';

interface FieldErrors {
  email?: string;
  password?: string;
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }

    return error.message;
  }

  return 'No fue posible iniciar sesión. Revisa tu conexión e inténtalo de nuevo.';
}

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      nextErrors.password = 'Ingresa tu contraseña.';
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await signIn(normalizedEmail, password);

      if (response.twoFactorRequired) {
        router.push({ pathname: '/verify-otp', params: { email: normalizedEmail } });
      }
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
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
      />

      <AppInput
        autoCapitalize="none"
        autoComplete="current-password"
        error={fieldErrors.password}
        label="Contraseña"
        leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }}
        placeholder="••••••••"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
        }}
        onSubmitEditing={() => void handleSubmit()}
      />

      <Link href="/forgot-password" style={styles.forgotPassword}>
        Olvidé mi contraseña
      </Link>

      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}

      <AppButton loading={isSubmitting} title="Iniciar sesión" onPress={() => void handleSubmit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: AppSpacing.three,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  formError: {
    marginTop: -4,
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
