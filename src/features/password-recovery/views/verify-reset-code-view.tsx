import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { VerifyResetCodeFormView } from "@/features/password-recovery/views/verify-reset-code-form-view";

export function VerifyResetCodeView() {
  return (
    <AuthFormScreen
      description="Escribe el código de seis dígitos que enviamos a tu correo."
      fallbackHref="/forgot-password"
      title="Verifica el código"
    >
      <VerifyResetCodeFormView />
    </AuthFormScreen>
  );
}
