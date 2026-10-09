import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { ResetPasswordFormView } from "@/features/password-recovery/views/reset-password-form-view";

export function ResetPasswordView() {
  return (
    <AuthFormScreen
      compact
      description="Crea una contraseña nueva y segura para volver a ingresar."
      fallbackHref="/forgot-password"
      title="NUEVA CONTRASEÑA"
    >
      <ResetPasswordFormView />
    </AuthFormScreen>
  );
}
