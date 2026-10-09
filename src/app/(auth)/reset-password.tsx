import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { ResetPasswordForm } from '@/features/password-recovery/components/reset-password-form';

export default function ResetPasswordScreen() {
  return (
    <AuthFormScreen
      description="Crea una contraseña nueva y segura para volver a ingresar."
      fallbackHref="/forgot-password"
      title="Nueva contraseña">
      <ResetPasswordForm />
    </AuthFormScreen>
  );
}
