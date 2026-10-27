import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AccountView } from '../../src/features/account/views/account-view';
import { LoginFormView } from '../../src/features/authentication/views/login-form-view';
import { login, logout } from '../../src/services/authService';
import { enterLogin, renderAcceptance, sessionUser } from './support';

describe('Aceptación simulada — navegación y sesión por rol', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['CA-ROL-01', 'cliente', '/'],
    ['CA-ROL-02', 'entrenador', '/trainer'],
    ['CA-ROL-03', 'administrador', '/admin'],
  ])('%s: como %s accedo a %s, veo mis opciones y puedo cerrar la sesión', async (_id, role, home) => {
    // Only the native dialog is simulated; selecting its real callback must
    // still go through the viewmodel, AuthProvider and logout service.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(login).mockResolvedValue({
      accessToken: 'simulated-token', user: { ...sessionUser, rol: role },
    });
    const view = await renderAcceptance(<LoginFormView />);
    const user = await enterLogin();

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(home);
    expect(logout).not.toHaveBeenCalled();

    await view.rerender(<AccountView />);
    expect(await screen.findByText(sessionUser.email)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Inicia sesión' })).toBeNull();
    if (role === 'cliente') {
      expect(screen.getByText('Cliente')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Mi membresía' }));
      expect(router.push).toHaveBeenLastCalledWith('/memberships');
      await user.press(screen.getByRole('button', { name: 'Membresías Titanium' }));
      expect(router.push).toHaveBeenLastCalledWith('/memberships');
      expect(screen.queryByRole('button', { name: 'Membresías del gimnasio' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Usuarios' })).toBeNull();
    } else if (role === 'entrenador') {
      expect(screen.getByText('Entrenador')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Membresías del gimnasio' }));
      expect(router.push).toHaveBeenCalledWith('/trainer/account/memberships');
      await user.press(screen.getByRole('button', { name: 'Mis clientes' }));
      expect(router.push).toHaveBeenLastCalledWith('/trainer/clients');
      expect(screen.queryByRole('button', { name: 'Mi membresía' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Membresías Titanium' })).toBeNull();
    } else {
      expect(screen.getByText('Administrador')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Usuarios' }));
      expect(router.push).toHaveBeenLastCalledWith('/admin/users');
      await user.press(screen.getByRole('button', { name: 'Pagos' }));
      expect(router.push).toHaveBeenLastCalledWith('/admin/payments');
      expect(screen.queryByRole('button', { name: 'Mi membresía' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Membresías del gimnasio' })).toBeNull();
    }

    await user.press(screen.getByRole('button', { name: 'CERRAR SESIÓN' }));
    expect(alertSpy).toHaveBeenCalledWith(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar tu sesión en este dispositivo?',
      expect.any(Array),
    );
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByText(sessionUser.email)).toBeOnTheScreen();
    expect(router.replace).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.lastCall![2]!;
    expect(buttons.find(button => button.text === 'Cancelar')?.style).toBe('cancel');
    const confirm = buttons.find(button => button.text === 'Cerrar sesión');
    expect(confirm?.style).toBe('destructive');
    expect(typeof confirm?.onPress).toBe('function');
    await act(async () => { confirm!.onPress!(); });

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenLastCalledWith('/');
    expect(await screen.findByRole('header', { name: 'Inicia sesión' })).toBeOnTheScreen();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
    for (const name of ['Mi membresía', 'Membresías Titanium', 'Membresías del gimnasio', 'Usuarios', 'CERRAR SESIÓN']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(router.push).toHaveBeenLastCalledWith('/login');
  });

  it('CA-ROL-04: dado un rol desconocido, recibo una explicación y la cuenta sigue como visitante', async () => {
    jest.mocked(login).mockResolvedValue({
      accessToken: 'simulated-token', user: { ...sessionUser, rol: 'superusuario' },
    });
    const view = await renderAcceptance(<LoginFormView />);
    const user = await enterLogin();

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta no tiene acceso a la aplicación móvil.',
    );
    expect(logout).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();

    await view.rerender(<AccountView />);
    expect(await screen.findByRole('header', { name: 'Inicia sesión' })).toBeOnTheScreen();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
    expect(screen.queryByRole('button', { name: 'CERRAR SESIÓN' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mi membresía' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Membresías del gimnasio' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });
});
