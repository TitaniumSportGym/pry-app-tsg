import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AccountView } from '../../src/features/account/views/account-view';
import { LoginFormView } from '../../src/features/authentication/views/login-form-view';
import { login } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';
import { enterLogin, renderAcceptance, sessionUser } from './support';

describe('Aceptación simulada — inicio de sesión', () => {
  it('CA-LOGIN-01: dado un formulario vacío, al corregir los campos puedo acceder a mi cuenta', async () => {
    jest.mocked(login).mockResolvedValue({ accessToken: 'simulated-token', user: sessionUser });
    const view = await renderAcceptance(<LoginFormView />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa tu correo electrónico.')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeOnTheScreen();
    expect(login).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await enterLogin('  Usuario@Correo.com ');
    expect(screen.queryByText('Ingresa tu correo electrónico.')).toBeNull();
    expect(screen.queryByText('Ingresa tu contraseña.')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(login).toHaveBeenCalledWith(sessionUser.email, 'Password123!');
    expect(router.replace).toHaveBeenCalledWith('/');
    await view.rerender(<AccountView />);
    expect(await screen.findByText(sessionUser.email)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'MÁS' })).toBeOnTheScreen();
    expect(screen.getByText('Cliente')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Membresías Titanium' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'CERRAR SESIÓN' })).toBeEnabled();
    expect(screen.queryByRole('header', { name: 'Inicia sesión' })).toBeNull();
  });

  it('CA-LOGIN-02: dadas credenciales rechazadas, puedo corregir la contraseña sin reiniciar la app', async () => {
    jest.mocked(login)
      .mockRejectedValueOnce(new ApiError('Unauthorized', 401))
      .mockResolvedValueOnce({ accessToken: 'simulated-token', user: sessionUser });
    const view = await renderAcceptance(<LoginFormView />);
    const user = await enterLogin(sessionUser.email, 'Incorrecta1!');

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toHaveDisplayValue(sessionUser.email);
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();

    await user.clear(screen.getByPlaceholderText('••••••••'));
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password123!');
    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(login).toHaveBeenCalledTimes(2);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/');
    await view.rerender(<AccountView />);
    expect(await screen.findByText(sessionUser.email)).toBeOnTheScreen();
    expect(screen.getByText('Cliente')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'CERRAR SESIÓN' })).toBeEnabled();
    expect(screen.queryByRole('header', { name: 'Inicia sesión' })).toBeNull();
  });

  it('CA-LOGIN-03: dada una cuenta con doble factor, la contraseña sola no abre una sesión', async () => {
    jest.mocked(login).mockResolvedValue({ twoFactorRequired: true, method: 'otp' });
    const view = await renderAcceptance(<LoginFormView />);
    const user = await enterLogin();

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/verify-otp', params: { email: sessionUser.email },
    });
    expect(router.replace).not.toHaveBeenCalled();

    // Inspect the real session without completing the simulated OTP flow.
    await view.rerender(<AccountView />);
    expect(await screen.findByRole('header', { name: 'Inicia sesión' })).toBeOnTheScreen();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
    expect(screen.queryByRole('button', { name: 'CERRAR SESIÓN' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Membresías Titanium' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });
});
