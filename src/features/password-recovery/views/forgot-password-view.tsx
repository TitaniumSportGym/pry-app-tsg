import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { RequestResetFormView } from "@/features/password-recovery/views/request-reset-form-view";

export function ForgotPasswordView() {
  return (
    <AuthFormScreen
      compact
      description="Ingresa tu correo y te enviaremos un código para recuperar el acceso."
      fallbackHref="/login"
      title="RECUPERA TU CUENTA"
    >
      <RequestResetFormView />
    </AuthFormScreen>
  );
}
