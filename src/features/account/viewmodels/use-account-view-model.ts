import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import {
  getAccountMenu,
  getRoleLabel,
  getRoleShortcut,
} from '@/features/account/models/account-menu';
import { getInitials, getMemberId } from '@/features/home/models/home';
import { useAuth } from '@/hooks/use-auth';

export function useAccountViewModel() {
  const { status, user, role, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const memberId = getMemberId(user?.email);

  async function logout() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/');
    } finally {
      setIsSigningOut(false);
    }
  }

  return {
    // A session without a known role never reaches this screen; treat it as a guest.
    isAuthenticated: status === 'authenticated' && role !== null,
    isClient: role === 'cliente',
    profile: role
      ? {
          title: memberId ?? 'Mi cuenta',
          email: user?.email ?? '',
          initials: getInitials(memberId),
          roleLabel: getRoleLabel(role),
        }
      : null,
    shortcut: role ? getRoleShortcut(role) : null,
    sections: role ? getAccountMenu(role) : [],
    appVersion: Constants.expoConfig?.version ?? null,
    isSigningOut,
    open(route: Href) {
      router.push(route);
    },
    openLogin() {
      router.push('/login');
    },
    openRegister() {
      router.push('/register');
    },
    confirmLogout() {
      // React Native Web has no native dialog with buttons.
      if (Platform.OS === 'web') {
        void logout();
        return;
      }

      Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar tu sesión en este dispositivo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void logout() },
      ]);
    },
  };
}
