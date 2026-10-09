import { useLocalSearchParams } from "expo-router";

import { VerifyAccountView } from "@/features/registration/views/verify-account-view";

export default function VerifyAccountScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <VerifyAccountView email={email} />;
}
