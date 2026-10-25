import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AccountView } from '../../src/features/account/views/account-view';
import { LoginFormView } from '../../src/features/authentication/views/login-form-view';
import { login, logout } from '../../src/services/authService';
import { enterLogin, renderAcceptance, sessionUser } from './support';

describe('Aceptación simulada — navegación y sesión por rol', () => {
  it.each([
    ['CA-ROL-01', 'cliente', '/'],
    ['CA-ROL-02', 'entrenador', '/trainer'],
    ['CA-ROL-03', 'administrador', '/admin'],
  ])('%s: como %s accedo a %s, veo mis opciones y puedo cerrar la sesión', async (_id, role, home) => {
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
    if (role === 'entrenador') {
      await user.press(screen.getByRole('link', { name: 'Membresías' }));
      expect(router.push).toHaveBeenCalledWith('/trainer/account/memberships');
    } else {
      expect(screen.queryByRole('link', { name: 'Membresías' })).toBeNull();
    }

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenLastCalledWith('/');
    expect(await screen.findByText('Aún no has iniciado sesión')).toBeOnTheScreen();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Membresías' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
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
    expect(await screen.findByText('Aún no has iniciado sesión')).toBeOnTheScreen();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Membresías' })).toBeNull();
  });
});
