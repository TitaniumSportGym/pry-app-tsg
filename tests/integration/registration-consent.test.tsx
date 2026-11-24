import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import RegistrationPrivacyNoticeScreen from '@/app/(auth)/privacy-notice';
import { RegistrationFormView } from '@/features/registration/views/registration-form-view';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { getCurrentUser, registerMobile } from '@/services/authService';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/services/authService', () => ({ registerMobile: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('@/features/authentication/data/google-auth-gateway', () => ({ openGoogleAuthSession: jest.fn() }));

async function fillRegistration() {
  await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), ' Persona@Correo.COM ');
  const passwords = screen.getAllByPlaceholderText('••••••••');
  await fireEvent.changeText(passwords[0], 'Titanium1!');
  await fireEvent.changeText(passwords[1], 'Titanium1!');
}

const guest: AuthContextValue = {
  status: 'unauthenticated', user: null, role: null,
  signIn: jest.fn(), confirmOtp: jest.fn(), signInWithGoogle: jest.fn(), signOut: jest.fn(),
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(registerMobile).mockResolvedValue({ message: 'Verifica tu correo' });
});

describe('registro con aceptación explícita', () => {
  it('empieza desmarcado y bloquea tanto el botón como el envío del teclado sin aceptación', async () => {
    await render(<RegistrationFormView />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await fillRegistration();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Crear cuenta' }));
    await fireEvent(screen.getAllByPlaceholderText('••••••••')[1], 'submitEditing');
    expect(screen.getByRole('alert')).toHaveTextContent(/Debes aceptar el Aviso de Privacidad/);
    expect(registerMobile).not.toHaveBeenCalled();
  });

  it('permite aceptar, retirar la elección y enviarla solo para este registro', async () => {
    await render(<RegistrationFormView />);
    await fillRegistration();
    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerMobile).not.toHaveBeenCalled();
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerMobile).toHaveBeenCalledWith('persona@correo.com', 'Titanium1!');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/verify-account', params: { email: 'persona@correo.com' } });
    expect(screen.getByText(/no se emite un comprobante de consentimiento/)).toBeOnTheScreen();
  });

  it('abre el aviso público sin aceptar automáticamente ni enviar el formulario', async () => {
    await render(<RegistrationFormView />);
    await userEvent.setup().press(screen.getByRole('link', { name: 'Consultar Aviso de Privacidad' }));
    expect(router.push).toHaveBeenCalledWith('/privacy-notice');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(registerMobile).not.toHaveBeenCalled();
  });

  it.each([true, false])('consulta el aviso sin sesión y regresa al registro (historial=%s)', async (canGoBack) => {
    jest.mocked(router.canGoBack).mockReturnValue(canGoBack);
    await render(<AuthContext.Provider value={guest}><RegistrationPrivacyNoticeScreen /></AuthContext.Provider>);
    expect(screen.getByText('Qué datos usamos')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mis datos y derechos ARCO' })).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Regresar' }));
    if (canGoBack) expect(router.back).toHaveBeenCalledTimes(1);
    else expect(router.replace).toHaveBeenCalledWith('/register');
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(registerMobile).not.toHaveBeenCalled();
  });

  it('muestra un fallo de registro sin un mensaje de consentimiento guardado', async () => {
    jest.mocked(registerMobile).mockRejectedValueOnce(new Error('Offline'));
    await render(<RegistrationFormView />);
    await fillRegistration();
    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/No fue posible crear la cuenta\./);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/consentimiento guardado/i)).toBeNull();
  });
});
