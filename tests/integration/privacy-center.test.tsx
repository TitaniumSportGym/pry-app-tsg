import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import ClientPersonalDataScreen from '@/app/(app)/account/personal-data';
import AdminPersonalDataScreen from '@/app/admin/(tabs)/account/personal-data';
import TrainerPersonalDataScreen from '@/app/trainer/account/personal-data';
import { AccountView } from '@/features/account/views/account-view';
import type { UserRole } from '@/features/authorization/models/user-role';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { getAccessToken, removeAccessToken } from '@/services/sessionService';
import type { UserProfileResponse } from '@/types/auth';

import { trainerProfile } from '../fixtures/privacy';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.test' }));
jest.mock('@/services/sessionService', () => ({ getAccessToken: jest.fn(), removeAccessToken: jest.fn() }));
jest.mock('@/features/authentication/data/google-auth-gateway', () => ({ openGoogleAuthSession: jest.fn() }));

let fetchMock: jest.SpiedFunction<typeof fetch>;
let account: UserProfileResponse;
let savedProfile = trainerProfile();
const signOut = jest.fn<Promise<void>, []>();

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function context(role: UserRole | null = 'cliente'): AuthContextValue {
  return {
    status: role ? 'authenticated' : 'unauthenticated', role,
    user: role ? { id: account.id, email: account.email, rol: role } : null,
    signOut, signIn: jest.fn(), confirmOtp: jest.fn(), signInWithGoogle: jest.fn(),
  };
}

function withSession(ui: ReactElement, value = context()) {
  return <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>;
}

function writes() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET');
}

beforeEach(() => {
  jest.clearAllMocks();
  account = { id: 'user-1', email: 'persona@example.com', rol: 'cliente', provider: 'local', authMethod: 'otp' };
  savedProfile = trainerProfile();
  signOut.mockReset().mockResolvedValue(undefined);
  jest.mocked(getAccessToken).mockReset().mockResolvedValue('private-access-token');
  jest.mocked(removeAccessToken).mockReset().mockResolvedValue(undefined);
  fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (url === 'https://api.example.test/api/user/profile') return response({ ...account, password: 'hidden-password', accessToken: 'hidden-token' });
    if (url === 'https://api.example.test/api/trainer/profile') {
      if (init?.method === 'PUT') savedProfile = { ...savedProfile, ...JSON.parse(String(init.body)) };
      return response({ profile: savedProfile });
    }
    throw new Error(`Unexpected test request: ${url}`);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('privacidad con ViewModel y apiClient reales', () => {
  it.each([
    ['cliente', ClientPersonalDataScreen, '/account/personal-data', '/account/privacy'],
    ['entrenador', TrainerPersonalDataScreen, '/trainer/account/personal-data', '/trainer/account/privacy'],
    ['administrador', AdminPersonalDataScreen, '/admin/account/personal-data', '/admin/account/privacy'],
  ] as const)('abre Mi perfil y consulta datos autenticados para %s', async (role, Screen, route, notice) => {
    account.rol = role;
    const value = context(role);
    const view = await render(withSession(<AccountView />, value));
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(router.push).toHaveBeenCalledWith(route);
    await view.rerender(withSession(<Screen />, value));
    expect(await screen.findByText(account.email)).toBeOnTheScreen();
    expect(screen.getByText('user-1')).toBeOnTheScreen();
    expect(screen.queryByText('hidden-password')).toBeNull();
    expect(screen.queryByText('hidden-token')).toBeNull();
    expect(screen.queryByText('private-access-token')).toBeNull();
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer private-access-token');
    }
    expect(writes()).toHaveLength(0);
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar cuenta' })).toBeNull();
    expect(screen.getByText(/La app aún no tramita la eliminación/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Consultar aviso y canal ARCO' }));
    expect(router.push).toHaveBeenCalledWith(notice);
    if (role !== 'entrenador') expect(screen.queryByRole('button', { name: 'Editar nombre y teléfono' })).toBeNull();
  });

  it('no consulta datos durante la carga de sesión ni para visitantes', async () => {
    const guest = context(null);
    const view = await render(withSession(<ClientPersonalDataScreen />, { ...guest, status: 'loading' }));
    expect(screen.getByText('Verificando sesión…')).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
    await view.rerender(withSession(<ClientPersonalDataScreen />, guest));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no realiza una consulta de red si falta el JWT', async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    await render(withSession(<ClientPersonalDataScreen />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Tu sesión expiró\./);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, { error: 'Unauthorized' }, true],
    [403, { error: 'Token inválido' }, true],
    [403, { error: 'Acceso prohibido' }, false],
  ])('respeta la invalidación de sesión del apiClient (%s, %j)', async (status, body, invalidate) => {
    fetchMock.mockResolvedValueOnce(response(body, status));
    await render(withSession(<ClientPersonalDataScreen />));
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.queryByText(account.email)).toBeNull();
    expect(signOut).toHaveBeenCalledTimes(invalidate ? 1 : 0);
    expect(removeAccessToken).toHaveBeenCalledTimes(invalidate ? 1 : 0);
  });

  it('muestra un error de conexión sin detalles técnicos y permite reintentar', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Private stack trace'));
    await render(withSession(<ClientPersonalDataScreen />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No fue posible conectar con el servidor\./);
    expect(screen.queryByText('Private stack trace')).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(account.email)).toBeOnTheScreen();
  });

  it('rechaza datos de otra identidad', async () => {
    fetchMock.mockResolvedValueOnce(response({ ...account, id: 'other-user', email: 'other@example.com' }));
    await render(withSession(<ClientPersonalDataScreen />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ocurrió un problema al cargar la información\./);
    expect(screen.queryByText('other@example.com')).toBeNull();
    expect(writes()).toHaveLength(0);
  });

  it('descarta los datos y las respuestas tardías cuando se cierra la sesión', async () => {
    let finish!: (result: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = await render(withSession(<ClientPersonalDataScreen />));
    expect(screen.getByText('Consultando tus datos…')).toBeOnTheScreen();
    await view.rerender(withSession(<ClientPersonalDataScreen />, context(null)));
    await act(() => finish(response(account)));
    expect(screen.queryByText(account.email)).toBeNull();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
  });

  it('remonta los datos al cambiar de usuario sin mostrar el perfil anterior', async () => {
    const view = await render(withSession(<ClientPersonalDataScreen />));
    expect(await screen.findByText('persona@example.com')).toBeOnTheScreen();
    account = { ...account, id: 'user-2', email: 'segunda@example.com' };
    await view.rerender(withSession(<ClientPersonalDataScreen />, context()));
    expect(await screen.findByText('segunda@example.com')).toBeOnTheScreen();
    expect(screen.queryByText('persona@example.com')).toBeNull();
  });

  it('rectifica los campos permitidos y conserva los demás datos del entrenador', async () => {
    account.rol = 'entrenador';
    await render(withSession(<TrainerPersonalDataScreen />, context('entrenador')));
    await screen.findByText(savedProfile.fullName);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), ' Nombre corregido ');
    await fireEvent.changeText(screen.getByLabelText('Teléfono'), '');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Nombre corregido')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(/El servidor confirmó la actualización/);
    const calls = writes();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('https://api.example.test/api/trainer/profile');
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
      fullName: 'Nombre corregido', phone: '', specialty: 'Fuerza',
      certifications: 'Certificación vigente', experienceYears: 5,
      bio: 'Entrenamiento personalizado', focus: 'Técnica y constancia',
    });
  });

  it('valida la edición y permite descartarla sin enviar cambios', async () => {
    account.rol = 'entrenador';
    await render(withSession(<TrainerPersonalDataScreen />, context('entrenador')));
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Borrador');
    await fireEvent.changeText(screen.getByLabelText('Teléfono'), 'abc');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Ingresa un teléfono válido de hasta 30 caracteres o deja el campo vacío.')).toBeOnTheScreen();
    expect(writes()).toHaveLength(0);
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Otro nombre');
    await user.press(screen.getByRole('button', { name: 'Cancelar edición' }));
    await user.press(screen.getByRole('button', { name: 'Editar nombre y teléfono' }));
    expect(screen.getByLabelText('Nombre completo')).toHaveDisplayValue('Ana Entrenadora');
    expect(writes()).toHaveLength(0);
  });

  it('no confirma un guardado mientras el PUT sigue pendiente y bloquea envíos duplicados', async () => {
    account.rol = 'entrenador';
    await render(withSession(<TrainerPersonalDataScreen />, context('entrenador')));
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Nuevo nombre');
    const implementation = fetchMock.getMockImplementation()!;
    let finish!: (result: Response) => void;
    fetchMock.mockImplementation((url, init) => init?.method === 'PUT'
      ? new Promise((resolve) => { finish = resolve; }) : implementation(url, init));
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.queryByText(/El servidor confirmó/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar edición' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(writes()).toHaveLength(1);
    savedProfile = trainerProfile({ fullName: 'Nuevo nombre' });
    await act(() => finish(response({ profile: savedProfile })));
    expect(await screen.findByText('Nuevo nombre')).toBeOnTheScreen();
  });

  it.each([500, 401])('conserva el fallo de guardado sin aparentar éxito (%s)', async (status) => {
    account.rol = 'entrenador';
    await render(withSession(<TrainerPersonalDataScreen />, context('entrenador')));
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Editar nombre y teléfono' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Cambio');
    const implementation = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, init) => init?.method === 'PUT'
      ? Promise.resolve(response({ error: 'Private database error' }, status)) : implementation(url, init));
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.queryByText(/El servidor confirmó/)).toBeNull();
    expect(screen.queryByText('Private database error')).toBeNull();
    expect(screen.getByLabelText('Nombre completo')).toHaveDisplayValue('Cambio');
    expect(signOut).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  });

  it('no envía el PUT si se cierra la sesión durante la consulta previa al guardado', async () => {
    account.rol = 'entrenador';
    const view = await render(withSession(<TrainerPersonalDataScreen />, context('entrenador')));
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Editar nombre y teléfono' }));
    let finish!: (result: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await view.rerender(withSession(<TrainerPersonalDataScreen />, context(null)));
    await act(() => finish(response({ profile: savedProfile })));
    expect(writes()).toHaveLength(0);
    expect(screen.queryByText(/El servidor confirmó/)).toBeNull();
  });
});
