import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { VerifyResetCodeForm } from '@/features/password-recovery/components/verify-reset-code-form';

export default function VerifyResetCodeScreen() {
  return (
    <AuthFormScreen
      description="Escribe el código de seis dígitos que enviamos a tu correo."
      fallbackHref="/forgot-password"
      title="Verifica el código">
      <VerifyResetCodeForm />
    </AuthFormScreen>
  );
}
