import { AuthFormScreen } from '@/components/auth/auth-form-screen';
import { RequestResetForm } from '@/features/password-recovery/components/request-reset-form';

export default function ForgotPasswordScreen() {
  return (
    <AuthFormScreen
      description="Ingresa tu correo y te enviaremos un código para recuperar el acceso."
      fallbackHref="/login"
      title="Recuperar contraseña">
      <RequestResetForm />
    </AuthFormScreen>
  );
}
