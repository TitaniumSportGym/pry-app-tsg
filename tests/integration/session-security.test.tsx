import { act, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { Text } from 'react-native';

import RootLayout from '../../src/app/_layout';
import { repositoryCache } from '../../src/core/repository/repository-cache';
import { useAuth } from '../../src/hooks/use-auth';
import { AuthProvider } from '../../src/providers/auth-provider';
import { apiRequest } from '../../src/services/apiClient';
import { getCurrentUser, login, logout, restoreSession, verifyOtp } from '../../src/services/authService';
import { getAccessToken, saveAccessToken } from '../../src/services/sessionService';

jest.mock('../../src/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.test' }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@expo-google-fonts/bebas-neue', () => ({ BebasNeue_400Regular: 1 }));
jest.mock('@expo-google-fonts/manrope', () => ({}));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: async () => undefined }));
jest.mock('../../src/components/splash/app-splash-screen', () => ({ AppSplashScreen: () => null }));
jest.mock('../../src/features/authentication/data/google-auth-gateway', () => ({ openGoogleAuthSession: jest.fn() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const profile = { id: 'synthetic-user', email: 'synthetic@example.test', rol: 'administrador' };
let network: jest.SpiedFunction<typeof fetch>;
let failure: { status: number; body: unknown } | undefined;
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
beforeEach(async () => {
  jest.clearAllMocks();
  failure = undefined;
  let stored: string | null = null;
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async () => stored);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (_key, value) => { stored = value; });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async () => { stored = null; });
  await saveAccessToken('synthetic-token');
  network = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).endsWith('/api/user/profile')) return json(profile);
    return failure ? json(failure.body, failure.status) : json({ ok: true });
  });
});
afterEach(() => jest.restoreAllMocks());

function Identity() {
  const auth = useAuth();
  return <Text>{auth.status === 'authenticated' ? `${auth.role}:${auth.user?.email}` : auth.status}</Text>;
}

it.each([401, 403])('an authenticated HTTP %s closes the real provider and cache without an extra logout request', async status => {
  await render(<AuthProvider><Identity /></AuthProvider>);
  await screen.findByText('administrador:synthetic@example.test');
  await repositoryCache.read('admin:private', async () => ['private'], { ttlMs: 10000 });
  failure = { status, body: { error: 'Token inválido' } };
  let rejected: PromiseSettledResult<unknown>[] = [];
  await act(async () => { rejected = await Promise.allSettled([apiRequest('/api/admin/orders'), apiRequest('/api/admin/payments')]); });
  expect(rejected.every(result => result.status === 'rejected')).toBe(true);
  expect(await screen.findByText('unauthenticated')).toBeOnTheScreen();
  expect(await getAccessToken()).toBeNull();
  expect(repositoryCache.peek('admin:private')).toBeUndefined();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  expect(network.mock.calls.some(([url]) => String(url).endsWith('/logout'))).toBe(false);
});

it.each([{ error: 'No tienes permisos' }, { code: 'MEMBERSHIP_REQUIRED' }])('keeps the real session on a business 403: %j', async body => {
  await render(<AuthProvider><Identity /></AuthProvider>);
  await screen.findByText('administrador:synthetic@example.test');
  failure = { status: 403, body };
  await act(async () => { await expect(apiRequest('/api/private')).rejects.toMatchObject({ status: 403 }); });
  expect(screen.getByText('administrador:synthetic@example.test')).toBeOnTheScreen();
  expect(await getAccessToken()).toBe('synthetic-token');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});

it('removes the real protected admin route after session invalidation', async () => {
  await renderRouter({
    _layout: RootLayout,
    '(app)/index': () => <Text>Public destination</Text>,
    '(auth)/login': () => <Text>Login destination</Text>,
    'admin/index': () => <Text>Protected administration</Text>,
    'trainer/index': () => <Text>Trainer destination</Text>,
  }, { initialUrl: '/admin' });
  expect(await screen.findByText('Protected administration')).toBeOnTheScreen();
  failure = { status: 401, body: { error: 'Sesión expirada' } };
  await act(async () => { await expect(apiRequest('/api/admin/orders')).rejects.toMatchObject({ status: 401 }); });
  await waitFor(() => expect(screen.queryByText('Protected administration')).toBeNull());
  expect(await screen.findByText('Public destination')).toBeOnTheScreen();
});

it('restores only a server-validated session and preserves credentials during a network outage', async () => {
  expect(await restoreSession()).toEqual({ authenticated: true, user: profile });
  network.mockRejectedValueOnce(new TypeError('offline'));
  await expect(restoreSession()).rejects.toThrow('offline');
  expect(await getAccessToken()).toBe('synthetic-token');
  network.mockResolvedValueOnce(json({ error: 'Token revocado' }, 401));
  expect(await restoreSession()).toEqual({ authenticated: false });
  expect(await getAccessToken()).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
});

it('does not let a late 401 erase a new login credential', async () => {
  let rejectOld!: (response: Response) => void;
  network.mockImplementationOnce(() => new Promise(resolve => { rejectOld = resolve; }));
  const previousRequest = apiRequest('/api/private');
  await waitFor(() => expect(network).toHaveBeenCalledTimes(1));
  await saveAccessToken('new-synthetic-token');
  rejectOld(json({ error: 'Token revocado' }, 401));
  await expect(previousRequest).rejects.toMatchObject({ status: 401, sessionInvalidationHandled: true });
  expect(await getAccessToken()).toBe('new-synthetic-token');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});

it('does not let an old profile restore protected UI after a concurrent invalidation', async () => {
  let completeProfile!: (response: Response) => void;
  network.mockImplementationOnce(() => new Promise(resolve => { completeProfile = resolve; }));
  await render(<AuthProvider><Identity /></AuthProvider>);
  failure = { status: 401, body: { error: 'Token revocado' } };
  await act(async () => { await expect(apiRequest('/api/private')).rejects.toMatchObject({ status: 401 }); });
  expect(await screen.findByText('unauthenticated')).toBeOnTheScreen();
  await act(async () => completeProfile(json(profile)));
  expect(screen.getByText('unauthenticated')).toBeOnTheScreen();
  expect(screen.queryByText('administrador:synthetic@example.test')).toBeNull();
});

it('stores a valid password login token after a successful public response', async () => {
  network.mockResolvedValueOnce(json({ accessToken: 'password-synthetic-token', user: profile }));
  expect(await login('synthetic@example.test', 'synthetic-password')).toMatchObject({ user: profile });
  expect(await getAccessToken()).toBe('password-synthetic-token');
});

it('does not restore a server profile with an unsupported role', async () => {
  network.mockResolvedValueOnce(json({ ...profile, rol: 'unsupported-role' }));
  await render(<AuthProvider><Identity /></AuthProvider>);
  expect(await screen.findByText('unauthenticated')).toBeOnTheScreen();
  expect(await getAccessToken()).toBeNull();
  expect(screen.queryByText(/unsupported-role:/)).toBeNull();
});

it('keeps protected UI closed on an offline startup without discarding the stored credential', async () => {
  network.mockRejectedValueOnce(new TypeError('offline during restore'));
  await render(<AuthProvider><Identity /></AuthProvider>);
  expect(await screen.findByText('unauthenticated')).toBeOnTheScreen();
  expect(await getAccessToken()).toBe('synthetic-token');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});

it('keeps password login, OTP, profile validation and logout on the same real HTTP/session stack', async () => {
  network.mockResolvedValueOnce(json({ twoFactorRequired: true, accessToken: 'not-yet-authorized' }));
  await login('synthetic@example.test', 'synthetic-password');
  expect(await getAccessToken()).toBe('synthetic-token');
  network.mockResolvedValueOnce(json({ accessToken: 'otp-synthetic-token', user: profile }));
  await verifyOtp('synthetic@example.test', '012345');
  expect(await getAccessToken()).toBe('otp-synthetic-token');
  expect(await getCurrentUser()).toEqual(profile);
  await logout();
  expect(await getAccessToken()).toBeNull();
  const loginCall = network.mock.calls.find(([url]) => String(url).endsWith('/login'))!;
  expect(new Headers(loginCall[1]?.headers).has('authorization')).toBe(false);
  const logoutCall = network.mock.calls.find(([url]) => String(url).endsWith('/logout'))!;
  expect(new Headers(logoutCall[1]?.headers).get('authorization')).toBe('Bearer otp-synthetic-token');
});

it('does not let a delayed logout response remove a newly signed-in session', async () => {
  let completeLogout!: (response: Response) => void;
  network.mockImplementationOnce(() => new Promise(resolve => { completeLogout = resolve; }));
  const pendingLogout = logout();
  await waitFor(() => expect(network).toHaveBeenCalledTimes(1));
  await saveAccessToken('new-login-during-logout');
  completeLogout(json({ error: 'Old token invalid' }, 401));
  await pendingLogout;
  expect(await getAccessToken()).toBe('new-login-during-logout');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});
