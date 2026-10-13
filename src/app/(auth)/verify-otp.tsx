import { useLocalSearchParams } from "expo-router";

import { LoginOtpView } from "@/features/authentication/views/login-otp-view";

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <LoginOtpView email={email} />;
}
