import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import ClientPersonalDataScreen from '../../src/app/(app)/account/personal-data';
import { RegistrationFormView } from '../../src/features/registration/views/registration-form-view';
import { getCurrentUser, registerMobile } from '../../src/services/authService';

import { renderAcceptance, sessionUser } from './support';

describe('Aceptación — consentimiento y derechos ARCO', () => {
  it('CA-PRIV-01: no puedo registrarme sin una elección explícita y la aceptación no implica fines opcionales', async () => {
    jest.mocked(registerMobile).mockResolvedValue({ message: 'Verifica tu correo' });
    await renderAcceptance(<RegistrationFormView />);
    await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), sessionUser.email);
    const passwords = screen.getAllByPlaceholderText('••••••••');
    await fireEvent.changeText(passwords[0], 'Titanium1!');
    await fireEvent.changeText(passwords[1], 'Titanium1!');
    const user = userEvent.setup();

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerMobile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Debes aceptar el Aviso de Privacidad/);
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerMobile).toHaveBeenCalledWith(sessionUser.email, 'Titanium1!');
    expect(screen.getByText(/no incluye promociones ni otros usos opcionales/)).toBeOnTheScreen();
    expect(screen.getByText(/no se emite un comprobante/)).toBeOnTheScreen();
  });

  it('CA-PRIV-02: consulto mis datos y conozco qué trámites no están disponibles en la app', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ ...sessionUser, provider: 'local', authMethod: 'otp' });
    await renderAcceptance(<ClientPersonalDataScreen />, 'cliente');

    expect(await screen.findByText(sessionUser.email)).toBeOnTheScreen();
    expect(screen.getByText('Acceso a tus datos')).toBeOnTheScreen();
    expect(screen.getByText('Rectificación')).toBeOnTheScreen();
    expect(screen.getByText('Cancelación de cuenta')).toBeOnTheScreen();
    expect(screen.getByText('Oposición a usos opcionales')).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar cuenta' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Consultar aviso y canal ARCO' })).toBeEnabled();
  });

  it('CA-PRIV-03: un visitante no puede consultar datos personales', async () => {
    await renderAcceptance(<ClientPersonalDataScreen />);

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(screen.queryByText(sessionUser.email)).toBeNull();
  });
});
