import { SymbolView } from 'expo-symbols';
import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { useAuth } from '@/hooks/use-auth';
import { AppColors } from '@/theme/tokens';

export function LogoutButton() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AppButton
      leftIcon={
        <SymbolView
          name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
          size={19}
          tintColor={AppColors.neutral.text}
        />
      }
      loading={isSigningOut}
      title="Cerrar sesión"
      variant="outline"
      onPress={() => void handleSignOut()}
    />
  );
}
