import { useLocalSearchParams } from "expo-router";

import { LoginView } from "@/features/authentication/views/login-view";

export default function LoginScreen() {
  const params = useLocalSearchParams<{
    accountVerified?: string;
    passwordReset?: string;
  }>();
  return (
    <LoginView
      accountVerified={params.accountVerified}
      passwordReset={params.passwordReset}
    />
  );
}
