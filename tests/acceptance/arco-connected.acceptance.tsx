import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import ClientPersonalDataScreen from '../../src/app/(app)/account/personal-data';
import * as api from '../../src/features/privacy/api/arco-api';
import { RegistrationFormView } from '../../src/features/registration/views/registration-form-view';
import { registerMobile } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';
import { arcoProfile, cancellationRequest, consentReceipt, privacyNotice, privacyPreferences, reauthenticationChallenge, reauthenticationProof, ARCO_DATE } from '../fixtures/arco';
import { renderAcceptance, sessionUser } from './support';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('../../src/features/privacy/models/arco-config', () => ({ isArcoBackendEnabled: () => true }));
jest.mock('../../src/features/privacy/api/arco-api', () => ({
  acceptPrivacyNotice: jest.fn(), getArcoProfile: jest.fn(), getCancellationRequest: jest.fn(), getPrivacyConsents: jest.fn(),
  getPrivacyNotice: jest.fn(), getPrivacyPreferences: jest.fn(), patchPrivacyPreference: jest.fn(), rectifyPersonalData: jest.fn(),
  startCancellationReauthentication: jest.fn(), submitCancellation: jest.fn(), verifyCancellationReauthentication: jest.fn(),
  listCancellationRequests: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(api.getArcoProfile).mockResolvedValue({ ...arcoProfile(), id: sessionUser.id, email: sessionUser.email, etag: '"' + arcoProfile().version + '"' });
  jest.mocked(api.getPrivacyNotice).mockResolvedValue(privacyNotice());
  jest.mocked(api.getPrivacyConsents).mockResolvedValue([]);
  jest.mocked(api.getPrivacyPreferences).mockResolvedValue(privacyPreferences());
  jest.mocked(api.acceptPrivacyNotice).mockResolvedValue(consentReceipt());
  jest.mocked(api.submitCancellation).mockResolvedValue(cancellationRequest());
  jest.mocked(api.listCancellationRequests).mockResolvedValue([]);
});
async function openCenter() {
  await renderAcceptance(<ClientPersonalDataScreen />, 'cliente');
  await screen.findByText(sessionUser.email);
}
describe('Aceptación — ARCO conectado con contratos simulados', () => {
  it('CA-ARCO-01: acepto una versión concreta y el registro necesita un recibo del servidor', async () => {
    jest.mocked(registerMobile).mockResolvedValue({ message: 'Verifica tu correo', privacyConsent: consentReceipt() });
    await renderAcceptance(<RegistrationFormView />);
    await screen.findByText('Versión del aviso: ' + privacyNotice().version);
    await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), sessionUser.email);
    for (const input of screen.getAllByPlaceholderText('••••••••')) await fireEvent.changeText(input, 'Titanium1!');
    const user = userEvent.setup();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.press(screen.getByRole('checkbox')); await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(registerMobile).toHaveBeenCalledWith(sessionUser.email, 'Titanium1!', {
      noticeId: 'privacy-notice', version: privacyNotice().version, accepted: true,
    });
  });
  it('CA-ARCO-02: puedo rectificar mi nombre de cliente sin cambiar mi correo o rol', async () => {
    await openCenter();
    jest.mocked(api.rectifyPersonalData).mockResolvedValue({ ...arcoProfile(), id: sessionUser.id, fullName: 'Nombre corregido', etag: '"' + 'c'.repeat(64) + '"' });
    const user = userEvent.setup(); await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Nombre corregido');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Nombre corregido')).toBeOnTheScreen();
    expect(screen.getByText(sessionUser.email)).toBeOnTheScreen();
    expect(api.rectifyPersonalData).toHaveBeenCalledWith(sessionUser.id, { fullName: 'Nombre corregido', phone: '' }, '"' + 'b'.repeat(64) + '"');
  });
  it('CA-ARCO-03: sin elección no se inventa un opt-in; mi oposición se confirma tras guardar', async () => {
    await openCenter();
    expect(screen.getAllByText('Sin elección registrada')).toHaveLength(2);
    const saved = privacyPreferences(); saved.version = 2;
    saved.preferences[0] = { purpose: 'promotional_communications', optOut: true, updatedAt: ARCO_DATE };
    jest.mocked(api.patchPrivacyPreference).mockResolvedValueOnce(saved);
    await fireEvent(screen.getByRole('switch', { name: 'No recibir promociones' }), 'valueChange', true);
    expect(await screen.findByText('Oposición registrada')).toBeOnTheScreen();
    expect(screen.getAllByText('Sin elección registrada')).toHaveLength(1);
  });
  it('CA-ARCO-04: contraseña, reto nuevo y confirmación generan un folio pendiente, sin eliminar cuenta', async () => {
    jest.mocked(api.startCancellationReauthentication).mockResolvedValueOnce({ kind: 'challenge', challenge: reauthenticationChallenge() });
    jest.mocked(api.verifyCancellationReauthentication).mockResolvedValueOnce(reauthenticationProof());
    await openCenter();
    const user = userEvent.setup();
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'private-password');
    await user.press(screen.getByRole('button', { name: 'Verificar identidad' }));
    expect(screen.queryByRole('button', { name: 'Solicitar cancelación' })).toBeNull();
    await fireEvent.changeText(await screen.findByLabelText('Código de verificación ARCO'), '012345');
    await user.press(screen.getByRole('button', { name: 'Confirmar código' }));
    await fireEvent.changeText(screen.getByLabelText('Confirmación de cancelación'), 'SOLICITAR CANCELACIÓN');
    await user.press(screen.getByRole('button', { name: 'Solicitar cancelación' }));
    expect(await screen.findByText('Estado: pendiente de revisión.')).toBeOnTheScreen();
    expect(screen.getByText('Folio: ' + cancellationRequest().requestId)).toBeOnTheScreen();
    expect(screen.getByText(sessionUser.email)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Eliminar cuenta' })).toBeNull();
  });
  it('CA-ARCO-05: Google no soportado mantiene disponible el canal ARCO manual', async () => {
    jest.mocked(api.startCancellationReauthentication).mockRejectedValueOnce(new ApiError('Unsupported', 409, undefined, 'REAUTHENTICATION_METHOD_UNAVAILABLE'));
    await openCenter();
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'private-password');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Verificar identidad' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Google/);
    expect(screen.getByRole('button', { name: 'Consultar aviso y canal ARCO' })).toBeEnabled();
    expect(api.submitCancellation).not.toHaveBeenCalled();
  });
});
