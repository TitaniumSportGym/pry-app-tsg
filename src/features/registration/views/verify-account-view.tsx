import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { AccountVerificationFormView } from "@/features/registration/views/account-verification-form-view";

interface VerifyAccountViewProps {
  email?: string;
}

export function VerifyAccountView({ email }: VerifyAccountViewProps) {
  return (
    <AuthFormScreen
      compact
      description="Escribe el código que enviamos para activar tu cuenta."
      fallbackHref="/register"
      title="VERIFICA TU CORREO"
    >
      <AccountVerificationFormView email={email} />
    </AuthFormScreen>
  );
}
