import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { AccountVerificationFormView } from "@/features/registration/views/account-verification-form-view";

interface VerifyAccountViewProps {
  email?: string;
}

export function VerifyAccountView({ email }: VerifyAccountViewProps) {
  return (
    <AuthFormScreen
      description="Escribe el código que enviamos para activar tu cuenta."
      fallbackHref="/register"
      title="Verifica tu correo"
    >
      <AccountVerificationFormView email={email} />
    </AuthFormScreen>
  );
}
