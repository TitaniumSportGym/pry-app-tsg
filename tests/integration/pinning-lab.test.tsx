import { render, screen, userEvent } from '@testing-library/react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { checkLabHealth } from '../../src/features/pinning-lab/data/health-check';
import { PinningLabPanel } from '../../src/features/pinning-lab/views/pinning-lab-panel';
import { getAccessToken, invalidateAccessToken } from '../../src/services/sessionService';

jest.mock('../../src/config/env', () => ({ getApiBaseUrl: () => 'https://server-titanium.onrender.com' }));
jest.mock('../../src/services/sessionService', () => ({ getAccessToken: jest.fn(), invalidateAccessToken: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare', expoConfig: null },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

const originalPlatform = Platform.OS;
let network: jest.SpiedFunction<typeof fetch>;

function selectVariant(variant: 'valid' | 'invalid') {
  Constants.expoConfig = {
    name: 'Lab fixture', slug: 'lab-fixture',
    android: { package: `com.titaniumsportgym.app.lab.${variant}` },
    extra: { pinningLab: { variant: `pinning-lab-${variant}`, host: 'server-titanium.onrender.com' } },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Constants.expoConfig = null;
  Constants.executionEnvironment = 'bare' as ExecutionEnvironment;
  network = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  jest.restoreAllMocks();
});

it.each(['valid', 'invalid'] as const)('runs the %s lab check through the real API client without JWT, cookies or body', async variant => {
  selectVariant(variant);
  await render(<PinningLabPanel />);
  expect(network).not.toHaveBeenCalled();
  const events = userEvent.setup();
  await events.press(screen.getByRole('button', { name: 'Laboratorio TLS' }));
  await events.press(screen.getByRole('button', { name: 'Comprobar conexión' }));
  expect(await screen.findByText('Servidor disponible: HTTP 200. La conexión HTTPS se completó.')).toBeOnTheScreen();
  expect(network).toHaveBeenCalledTimes(1);
  const [url, init] = network.mock.calls[0];
  expect(url).toBe('https://server-titanium.onrender.com/health');
  expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error' });
  expect(init?.body).toBeUndefined();
  expect(init?.signal).toBeInstanceOf(AbortSignal);
  expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  expect(new Headers(init?.headers).get('Cache-Control')).toBe('no-cache, no-store');
  expect(getAccessToken).not.toHaveBeenCalled();
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it('shows a connection error without claiming that a generic failure proves pinning', async () => {
  selectVariant('invalid');
  network.mockRejectedValueOnce(new TypeError('Network request failed'));
  await render(<PinningLabPanel />);
  const events = userEvent.setup();
  await events.press(screen.getByRole('button', { name: 'Laboratorio TLS' }));
  await events.press(screen.getByRole('button', { name: 'Comprobar conexión' }));
  expect(await screen.findByText(/este mensaje no confirma pinning/)).toBeOnTheScreen();
  expect(screen.getByText(/adb logcat -s TitaniumPinningLab/)).toBeOnTheScreen();
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it('distinguishes HTTP failures and unexpected health content from a TLS rejection', async () => {
  network.mockResolvedValueOnce(new Response('{"error":"Unavailable"}', { status: 503, headers: { 'Content-Type': 'application/json' } }));
  await expect(checkLabHealth(new AbortController().signal)).resolves.toEqual({ kind: 'http-error', status: 503 });
  network.mockResolvedValueOnce(new Response('{"ok":false}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await expect(checkLabHealth(new AbortController().signal)).resolves.toEqual({ kind: 'unexpected-response' });
});

it.each(['development', 'preview', 'arco-debug', 'arco-release', 'production'])('has no lab controls or requests in the unchanged %s identity', async () => {
  Constants.expoConfig = { name: 'Titanium Sport Gym', slug: 'pry-app-tsg', android: { package: 'com.titaniumsportgym.app' } };
  await render(<PinningLabPanel />);
  expect(screen.queryByRole('button', { name: 'Laboratorio TLS' })).toBeNull();
  expect(network).not.toHaveBeenCalled();
});

it('hides lab controls for mismatched packages, Expo Go, iOS and web', async () => {
  selectVariant('valid');
  Constants.expoConfig!.android!.package = 'com.titaniumsportgym.app';
  const tree = await render(<PinningLabPanel />);
  expect(screen.queryByRole('button')).toBeNull();
  selectVariant('valid');
  Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
  await tree.rerender(<PinningLabPanel />);
  expect(screen.queryByRole('button')).toBeNull();
  Constants.executionEnvironment = 'bare' as ExecutionEnvironment;
  for (const platform of ['ios', 'web']) {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    await tree.rerender(<PinningLabPanel />);
    expect(screen.queryByRole('button')).toBeNull();
  }
  expect(network).not.toHaveBeenCalled();
});
