import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { router } from 'expo-router';

import { PrivacyCenterView } from '@/features/privacy/views/privacy-center-view';
import { RegistrationFormView } from '@/features/registration/views/registration-form-view';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { getAccessToken, invalidateAccessToken, removeAccessToken } from '@/services/sessionService';
import type { UserRole } from '@/features/authorization/models/user-role';
import {
  arcoProfile, cancellationRequest, consentReceipt, privacyNotice, privacyPreferences, reauthenticationChallenge,
  reauthenticationProof, ARCO_DATE, ARCO_USER_ID,
} from '../fixtures/arco';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/privacy/models/arco-config', () => ({ isArcoBackendEnabled: () => true }));
jest.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://arco.example.test' }));
jest.mock('@/services/sessionService', () => ({ getAccessToken: jest.fn(), invalidateAccessToken: jest.fn(), removeAccessToken: jest.fn(), saveAccessToken: jest.fn() }));
jest.mock('@/features/authentication/data/google-auth-gateway', () => ({ openGoogleAuthSession: jest.fn() }));

let fetchMock: jest.SpiedFunction<typeof fetch>;
let profile = arcoProfile();
let preferences = privacyPreferences();
let receipts: ReturnType<typeof consentReceipt>[];
let reauthMethod: 'normal' | 'otp' | 'totp' | 'google';
let lostResponse: boolean;
let receivedCancellation: ReturnType<typeof cancellationRequest> | null;
const faults = new Map<string, { status: number; code: string }>();
const signOut = jest.fn<Promise<void>, []>();
function response(body: unknown, status = 200, etag?: string) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...(etag ? { etag } : {}) } });
}
function context(role: UserRole = 'cliente'): AuthContextValue {
  return { status: 'authenticated', user: { id: ARCO_USER_ID, email: profile.email, rol: role }, role,
    signOut, signIn: jest.fn(), confirmOtp: jest.fn(), signInWithGoogle: jest.fn() };
}
function session(ui: ReactElement, role: UserRole = 'cliente') {
  return <AuthContext.Provider value={context(role)}>{ui}</AuthContext.Provider>;
}
function calls(path: string, method = 'POST') {
  return fetchMock.mock.calls.filter(([url, init]) => url === 'https://arco.example.test' + path && init?.method === method);
}
beforeEach(() => {
  jest.clearAllMocks(); faults.clear();
  profile = arcoProfile(); preferences = privacyPreferences(); receipts = [];
  reauthMethod = 'normal'; lostResponse = false; receivedCancellation = null;
  signOut.mockReset().mockResolvedValue(undefined);
  jest.mocked(getAccessToken).mockReset().mockResolvedValue('private-session-jwt');
  jest.mocked(removeAccessToken).mockReset().mockResolvedValue(undefined);
  // This suite supplies a fixed AuthContext. Forward its mocked session boundary;
  // session-security.test.tsx covers the real provider/invalidation/secure storage.
  jest.mocked(invalidateAccessToken).mockReset().mockImplementation(async () => {
    await removeAccessToken(); await signOut(); return true;
  });
  fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url).replace('https://arco.example.test', '');
    const method = init?.method ?? 'GET', fault = faults.get(method + ' ' + path);
    if (fault) return response({ code: fault.code, error: 'Operación rechazada' }, fault.status);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (path === '/api/privacy/notice') return response(privacyNotice());
    if (path === '/api/user/profile') {
      if (method === 'PATCH') profile = { ...profile, ...body, version: 'c'.repeat(64) };
      return response({ ...profile, password: 'hidden-password', totpSecret: 'hidden-secret' }, 200, '"' + profile.version + '"');
    }
    if (path === '/api/user/privacy-consents') {
      if (method === 'POST') { receipts = [consentReceipt()]; return response(consentReceipt(), 201); }
      return response({ consents: receipts });
    }
    if (path === '/api/user/privacy-preferences') {
      if (method === 'PATCH') preferences = { version: preferences.version + 1, preferences: preferences.preferences.map((item) =>
        body.preferences[0].purpose === item.purpose ? { ...item, optOut: body.preferences[0].optOut, updatedAt: ARCO_DATE } : item) };
      return response(preferences);
    }
    if (path === '/api/auth/reauthenticate') {
      if (reauthMethod === 'google') return response({ code: 'REAUTHENTICATION_METHOD_UNAVAILABLE' }, 409);
      return reauthMethod === 'normal' ? response(reauthenticationProof()) : response(reauthenticationChallenge(reauthMethod), 202);
    }
    if (path === '/api/auth/reauthenticate/verify') return response(reauthenticationProof());
    if (path === '/api/user/account-cancellation-requests') {
      receivedCancellation ??= cancellationRequest();
      if (lostResponse) { lostResponse = false; throw new TypeError('Simulated response loss'); }
      return response(receivedCancellation, 202);
    }
    if (path.startsWith('/api/user/account-cancellation-requests/')) return response(cancellationRequest());
    if (path === '/api/auth/register') return response({ message: 'Verifica tu correo', privacyConsent: consentReceipt() }, 201);
    throw new Error('Unexpected mocked URL; real networking is forbidden.');
  });
});
afterEach(() => jest.restoreAllMocks());
async function ready(role: UserRole = 'cliente') {
  profile.rol = role;
  const view = await render(session(<PrivacyCenterView />, role));
  await screen.findByText(profile.email);
  return view;
}
async function verifyPassword() {
  await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'private-password');
  await userEvent.setup().press(screen.getByRole('button', { name: 'Verificar identidad' }));
}

describe('ARCO conectado a contratos reales con HTTP simulado', () => {
  it.each(['cliente', 'entrenador', 'administrador'] as const)('acceso y PATCH propio con ETag para %s', async (role) => {
    await ready(role);
    expect(screen.queryByText('hidden-password')).toBeNull();
    expect(screen.queryByText('hidden-secret')).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Nombre rectificado');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    const [, init] = calls('/api/user/profile', 'PATCH')[0];
    expect(new Headers(init?.headers).get('If-Match')).toBe('"' + 'b'.repeat(64) + '"');
    expect(JSON.parse(String(init?.body))).toEqual({ fullName: 'Nombre rectificado', phone: null });
    expect(await screen.findByText('Nombre rectificado')).toBeOnTheScreen();
    expect(calls('/api/trainer/profile', 'PUT')).toHaveLength(0);
    for (const [url, request] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/arco\.example\.test\//);
      expect(new Headers(request?.headers).get('Authorization')).toBe(String(url).endsWith('/privacy/notice') ? null : 'Bearer private-session-jwt');
    }
  });
  it('consulta y registra consentimiento sin aceptar automáticamente una cuenta histórica', async () => {
    await ready(); const user = userEvent.setup();
    expect(await screen.findByText('No hay una aceptación registrada para esta cuenta.')).toBeOnTheScreen();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await user.press(checkbox); await user.press(screen.getByRole('button', { name: 'Registrar aceptación' }));
    expect(await screen.findByText('Comprobante: ' + consentReceipt().receiptId)).toBeOnTheScreen();
    expect(JSON.parse(String(calls('/api/user/privacy-consents')[0][1]?.body))).toEqual({
      noticeId: 'privacy-notice', version: privacyNotice().version, accepted: true,
    });
  });
  it('switch Opt-Out conserva estado desconocido y solo cambia después de respuesta válida', async () => {
    await ready();
    expect(screen.getAllByText('Sin elección registrada')).toHaveLength(2);
    await fireEvent(screen.getByRole('switch', { name: 'No recibir promociones' }), 'valueChange', true);
    expect(await screen.findByText('Oposición registrada')).toBeOnTheScreen();
    expect(screen.getAllByText('Sin elección registrada')).toHaveLength(1);
    expect(JSON.parse(String(calls('/api/user/privacy-preferences', 'PATCH')[0][1]?.body))).toEqual({
      version: 1, preferences: [{ purpose: 'promotional_communications', optOut: true }],
    });
  });
  it('409 de preferencias recarga y 412 de perfil no anuncia escritura satisfactoria', async () => {
    await ready();
    faults.set('PATCH /api/user/privacy-preferences', { status: 409, code: 'PREFERENCES_VERSION_CHANGED' });
    await fireEvent(screen.getByRole('switch', { name: 'No recibir promociones' }), 'valueChange', true);
    expect(await screen.findByRole('alert')).toHaveTextContent(/otro dispositivo/);
    expect(screen.getAllByText('Sin elección registrada')).toHaveLength(2);
    const user = userEvent.setup(); await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    faults.set('PATCH /api/user/profile', { status: 412, code: 'PROFILE_VERSION_CHANGED' });
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/revis[a-z]* y vuelve a editar/);
    expect(screen.queryByText(/servidor confirmó la actualización/)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });
  it('flujo OTP envía contraseña y código fresco; 202 no es prueba de cancelación', async () => {
    const logs = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
    reauthMethod = 'otp'; await ready(); await verifyPassword();
    expect(await screen.findByLabelText('Código de verificación ARCO')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Solicitar cancelación' })).toBeNull();
    expect(calls('/api/user/account-cancellation-requests')).toHaveLength(0);
    await fireEvent.changeText(screen.getByLabelText('Código de verificación ARCO'), '012345');
    const user = userEvent.setup(); await user.press(screen.getByRole('button', { name: 'Confirmar código' }));
    await fireEvent.changeText(screen.getByLabelText('Confirmación de cancelación'), 'SOLICITAR CANCELACIÓN');
    await user.press(screen.getByRole('button', { name: 'Solicitar cancelación' }));
    expect(await screen.findByText('Estado: pendiente de revisión.')).toBeOnTheScreen();
    expect(JSON.parse(String(calls('/api/auth/reauthenticate')[0][1]?.body))).toEqual({
      purpose: 'account-cancellation', method: 'password', password: 'private-password',
    });
    expect(JSON.parse(String(calls('/api/auth/reauthenticate/verify')[0][1]?.body))).toEqual({
      challengeId: reauthenticationChallenge().challengeId, code: '012345',
    });
    const [, init] = calls('/api/user/account-cancellation-requests')[0];
    expect(new Headers(init?.headers).get('Idempotency-Key')).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.parse(String(init?.body))).toEqual({
      confirmation: 'SOLICITAR CANCELACIÓN', reauthenticationToken: 'P'.repeat(43),
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.queryByText('private-password')).toBeNull(); expect(screen.queryByText('P'.repeat(43))).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Consultar solicitud' }));
    expect(calls('/api/user/account-cancellation-requests/' + cancellationRequest().requestId, 'GET')).toHaveLength(1);
    // Full HTTP-simulated path carries password/JWT/OTP/proof, but none is logged.
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
  it('reintento tras respuesta perdida usa idéntica clave y cuerpo, incluso si el servidor recibió la solicitud', async () => {
    await ready(); await verifyPassword();
    await fireEvent.changeText(screen.getByLabelText('Confirmación de cancelación'), 'SOLICITAR CANCELACIÓN');
    lostResponse = true;
    const user = userEvent.setup(); await user.press(screen.getByRole('button', { name: 'Solicitar cancelación' }));
    expect(receivedCancellation?.status).toBe('pending_review');
    expect(screen.queryByText('Estado: pendiente de revisión.')).toBeNull();
    await user.press(await screen.findByRole('button', { name: 'Reintentar misma solicitud' }));
    const attempts = calls('/api/user/account-cancellation-requests');
    expect(attempts).toHaveLength(2);
    expect(attempts[0][1]?.body).toBe(attempts[1][1]?.body);
    expect(new Headers(attempts[0][1]?.headers).get('Idempotency-Key')).toBe(new Headers(attempts[1][1]?.headers).get('Idempotency-Key'));
    expect(await screen.findByText('Estado: pendiente de revisión.')).toBeOnTheScreen();
  });
  it('Google sin prueba disponible muestra canal manual y no cierra sesión', async () => {
    reauthMethod = 'google'; await ready(); await verifyPassword();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Google/);
    expect(screen.getByRole('button', { name: 'Consultar aviso y canal ARCO' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Solicitar cancelación' })).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });
  it('401 invalida credenciales y sin JWT ninguna operación privada alcanza fetch', async () => {
    faults.set('GET /api/user/profile', { status: 401, code: 'UNAUTHORIZED' });
    const view = await render(session(<PrivacyCenterView />));
    await screen.findByText(/Tu sesión expiró/); expect(removeAccessToken).toHaveBeenCalled();
    await view.unmount(); fetchMock.mockClear(); jest.mocked(getAccessToken).mockResolvedValue(null);
    await render(session(<PrivacyCenterView />));
    await screen.findAllByText(/Tu sesión expiró/);
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/api/privacy/notice'))).toBe(true);
  });
  it('el registro público envía aviso versionado y navega solo con recibo confirmado', async () => {
    await render(<RegistrationFormView />);
    await screen.findByText('Versión del aviso: ' + privacyNotice().version);
    await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), 'persona@example.test');
    for (const input of screen.getAllByPlaceholderText('••••••••')) await fireEvent.changeText(input, 'Titanium1!');
    const user = userEvent.setup(); await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    const [, init] = calls('/api/auth/register')[0];
    expect(new Headers(init?.headers).get('Authorization')).toBeNull();
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'persona@example.test', password: 'Titanium1!', client: 'mobile',
      privacyConsent: { noticeId: 'privacy-notice', version: privacyNotice().version, accepted: true },
    });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/verify-account', params: { email: 'persona@example.test' } });
  });
  it('un 200 o un recibo ausente en registro no confirma evidencia ni navega', async () => {
    await render(<RegistrationFormView />);
    await screen.findByText('Versión del aviso: ' + privacyNotice().version);
    await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), 'persona@example.test');
    for (const input of screen.getAllByPlaceholderText('••••••••')) await fireEvent.changeText(input, 'Titanium1!');
    const user = userEvent.setup(); await user.press(screen.getByRole('checkbox'));
    fetchMock.mockResolvedValueOnce(response({ message: 'Created', privacyConsent: consentReceipt() }, 200));
    await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(router.push).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(/respuesta válida/);
  });

  it.each([
    [403, 'REAUTHENTICATION_FAILED', /No se pudo verificar tu identidad/],
    [422, 'INVALID_INPUT', /Revisa los datos/],
  ] as const)('HTTP %s durante reautenticación conserva sesión y borra contraseña sin registrarla', async (status, code, message) => {
    const logs = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
    await ready();
    faults.set('POST /api/auth/reauthenticate', { status, code });
    await verifyPassword();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Contraseña actual')).toHaveDisplayValue('');
    expect(screen.queryByRole('button', { name: 'Solicitar cancelación' })).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    for (const log of logs) {
      expect(log).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-password|private-session-jwt|012345/);
    }
  });

  it('409 de aviso descarta aceptación previa y vuelve a consultar sin inventar un recibo', async () => {
    await ready();
    faults.set('POST /api/user/privacy-consents', { status: 409, code: 'NOTICE_VERSION_CHANGED' });
    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Registrar aceptación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/aviso cambió/);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(calls('/api/privacy/notice', 'GET')).toHaveLength(2);
    expect(screen.queryByText('Comprobante: ' + consentReceipt().receiptId)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('422 de rectificación conserva el borrador, sin afirmar éxito ni reflejar datos privados del error', async () => {
    await ready();
    faults.set('PATCH /api/user/profile', { status: 422, code: 'INVALID_INPUT' });
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Nombre de prueba');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Revisa los datos/);
    expect(screen.getByLabelText('Nombre completo')).toHaveDisplayValue('Nombre de prueba');
    expect(screen.queryByText(/servidor confirmó la actualización/)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });
});
