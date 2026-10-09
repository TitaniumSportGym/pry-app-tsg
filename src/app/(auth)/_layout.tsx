import { Stack } from 'expo-router';

import { PasswordRecoveryProvider } from '@/features/password-recovery/password-recovery-context';

export default function AuthLayout() {
  return (
    <PasswordRecoveryProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PasswordRecoveryProvider>
  );
}
