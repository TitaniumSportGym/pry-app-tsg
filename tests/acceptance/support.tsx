import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { PropsWithChildren, ReactElement } from 'react';

import { AuthProvider } from '../../src/providers/auth-provider';
import { CartProvider } from '../../src/providers/cart-provider';
import { restoreSession } from '../../src/services/authService';

export const sessionUser = { id: '1', email: 'usuario@correo.com', rol: 'cliente' };

function AcceptanceProviders({ children }: PropsWithChildren) {
  return <AuthProvider><CartProvider>{children}</CartProvider></AuthProvider>;
}

export async function renderAcceptance(ui: ReactElement, role?: string) {
  if (role) {
    jest.mocked(restoreSession).mockResolvedValue({
      authenticated: true,
      user: { ...sessionUser, rol: role },
    });
  }

  // rerender changes views explicitly and preserves the real session and cart.
  // It does not run an Expo Router navigator.
  return render(ui, { wrapper: AcceptanceProviders });
}

export async function enterLogin(
  email = sessionUser.email,
  password = 'Password123!',
) {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('correo@ejemplo.com'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), password);
  return user;
}

export function requestedParams() {
  const destination = jest.mocked(router.push).mock.lastCall?.[0];
  if (!destination || typeof destination !== 'object' || !destination.params) {
    throw new Error('La acción del usuario no solicitó una ruta con parámetros.');
  }
  return destination.params;
}

export function requestedDetailId() {
  return requestedParams().id;
}
