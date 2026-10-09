import { useLocalSearchParams } from 'expo-router';

import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { AccountVerificationForm } from '@/features/registration/components/account-verification-form';

export default function VerifyAccountScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <AuthFormScreen
      description="Escribe el código que enviamos para activar tu cuenta."
      fallbackHref="/register"
      title="Verifica tu correo">
      <AccountVerificationForm email={email} />
    </AuthFormScreen>
  );
}
