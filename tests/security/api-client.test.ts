import { apiRequest, shouldInvalidateSession } from '../../src/services/apiClient';
import { getAccessToken, invalidateAccessToken } from '../../src/services/sessionService';
import { ApiError } from '../../src/types/auth';

jest.mock('../../src/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.test' }));
jest.mock('../../src/services/sessionService', () => ({ getAccessToken: jest.fn(), invalidateAccessToken: jest.fn() }));

function response(data: unknown, status = 200, contentType = 'application/json') {
  return new Response(contentType === 'application/json' ? JSON.stringify(data) : String(data), { status, headers: { 'content-type': contentType } });
}

let network: jest.SpiedFunction<typeof fetch>;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAccessToken).mockReset().mockResolvedValue('synthetic-session');
  jest.mocked(invalidateAccessToken).mockReset().mockResolvedValue(true);
  network = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ ok: true }));
});
afterEach(() => jest.restoreAllMocks());

it.each([true, false])('blocks an external origin before any credential access, auth=%s', async auth => {
  await expect(apiRequest('https://outside.example.test/collect', { auth, body: { password: 'synthetic' } })).rejects.toThrow('configured origin');
  expect(getAccessToken).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
});

it('sends one Bearer only to the configured HTTPS origin and retains response metadata', async () => {
  const metadata = jest.fn();
  network.mockResolvedValueOnce(new Response('{"saved":true}', { status: 201, headers: { 'content-type': 'application/json', etag: '"version"' } }));
  expect(await apiRequest('/api/profile', { method: 'PATCH', body: { name: 'Synthetic' }, headers: { 'If-Match': '"old"', Authorization: 'injected' }, onResponse: metadata })).toEqual({ saved: true });
  const [url, init] = network.mock.calls[0];
  expect(url).toBe('https://api.example.test/api/profile');
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-session');
  expect(new Headers(init?.headers).get('if-match')).toBe('"old"');
  expect(init?.body).toBe('{"name":"Synthetic"}');
  expect(init?.redirect).toBe('error');
  expect(metadata).toHaveBeenCalledWith({ status: 201, headers: expect.any(Headers) });
});

it('keeps login/OTP public even if a caller supplies Authorization', async () => {
  await apiRequest('/api/auth/login', { auth: false, headers: { authorization: 'must-not-leak' } });
  expect(new Headers(network.mock.calls[0][1]?.headers).has('authorization')).toBe(false);
  expect(getAccessToken).not.toHaveBeenCalled();
});

it('does not send a logout request with credentials from a newer session', async () => {
  await expect(apiRequest('/api/auth/logout', { method: 'POST', expectedAccessToken: 'previous-session' })).rejects.toMatchObject({ status: 409, code: 'SESSION_CHANGED' });
  expect(network).not.toHaveBeenCalled();
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it('does not reach the network without a token, but invalidates stale authenticated UI', async () => {
  jest.mocked(getAccessToken).mockResolvedValue(null);
  await expect(apiRequest('/api/profile')).rejects.toMatchObject({ status: 401, data: { code: 'NO_TOKEN' }, sessionInvalidationHandled: true });
  expect(invalidateAccessToken).toHaveBeenCalledWith(null);
  expect(network).not.toHaveBeenCalled();
});

it.each([401, 403])('invalidates a rejected credential (HTTP %s) and preserves the HTTP error if cleanup fails', async status => {
  network.mockResolvedValueOnce(response({ error: 'Token inválido' }, status));
  jest.mocked(invalidateAccessToken).mockRejectedValueOnce(new Error('storage failure'));
  await expect(apiRequest('/api/profile')).rejects.toMatchObject({ status, sessionInvalidationHandled: true });
  expect(invalidateAccessToken).toHaveBeenCalledWith('synthetic-session');
});

it.each([
  [403, { code: 'MEMBERSHIP_REQUIRED', error: 'unauthorized' }],
  [403, { error: 'No tienes permisos para acceder a este recurso' }],
  [403, { code: 'AUTHORIZATION_DENIED' }],
  [404, { error: 'Not found' }], [500, { error: 'Internal error' }],
])('does not expire a session for %s / %j', async (status, body) => {
  network.mockResolvedValueOnce(response(body, status));
  await expect(apiRequest('/api/profile')).rejects.toBeInstanceOf(ApiError);
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it('does not invalidate the existing session on rejected public login credentials', async () => {
  network.mockResolvedValueOnce(response({ error: 'Bad password' }, 401));
  await expect(apiRequest('/api/auth/login', { auth: false })).rejects.toMatchObject({ status: 401, sessionInvalidationHandled: false });
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it('preserves a network failure without clearing the session or logging credentials', async () => {
  const logs = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
  const error = new TypeError('Network request failed');
  network.mockRejectedValueOnce(error);
  await expect(apiRequest('/api/profile')).rejects.toBe(error);
  expect(invalidateAccessToken).not.toHaveBeenCalled();
  for (const log of logs) expect(log).not.toHaveBeenCalled();
});

it('rejects an unexpected final redirect URL without claiming that native fetch prevented the redirect', async () => {
  const redirected = response({ ok: true });
  Object.defineProperty(redirected, 'url', { value: 'https://external.example.test/final' });
  network.mockResolvedValueOnce(redirected);
  await expect(apiRequest('/api/profile')).rejects.toThrow('configured origin');
});

it('supports FormData, raw string bodies, empty responses and invalid JSON', async () => {
  const form = new FormData();
  form.append('name', 'synthetic');
  await apiRequest('/api/form', { method: 'POST', body: form });
  expect(network.mock.calls[0][1]?.body).toBe(form);
  expect(new Headers(network.mock.calls[0][1]?.headers).has('content-type')).toBe(false);
  network.mockResolvedValueOnce(new Response(null, { status: 204 }));
  expect(await apiRequest('/api/form', { method: 'DELETE' })).toBeNull();
  network.mockResolvedValueOnce(new Response('plain text', { headers: { 'content-type': 'application/json' } }));
  expect(await apiRequest('/api/raw', { method: 'POST', body: 'raw' })).toBe('plain text');
  expect(network.mock.lastCall![1]?.body).toBe('raw');
});

it.each([
  [401, {}, true], [403, { error: 'jwt expired' }, true], [403, { error: 'Token revocado o inválido' }, true],
  [403, { error: 'Sesión expirada' }, true], [403, { error: 'No tienes permisos' }, false],
  [403, { code: 'MEMBERSHIP_REQUIRED' }, false], [200, {}, false],
  // Los rechazos del acceso QR hablan del token del pase, no del de sesión.
  [403, { code: 'SELF_SCAN_FORBIDDEN', error: 'Token QR inválido para esta cuenta' }, false],
  [403, { code: 'QR_OWNER_INVALID', error: 'Token inválido' }, false],
])('classifies backend auth semantics %s / %j', (status, body, expected) => {
  expect(shouldInvalidateSession(status, body)).toBe(expected);
});

it('exposes Retry-After in seconds on a rate-limited response without ending the session', async () => {
  network.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'ACCESS_RATE_LIMITED', error: 'Demasiadas solicitudes' }), {
    status: 429, headers: { 'content-type': 'application/json', 'retry-after': '42' },
  }));
  await expect(apiRequest('/api/access/qr', { method: 'POST', body: {} })).rejects.toMatchObject({
    status: 429, code: 'ACCESS_RATE_LIMITED', retryAfterSeconds: 42,
  });
  expect(invalidateAccessToken).not.toHaveBeenCalled();
});

it.each([['Wed, 21 Oct 2026 07:28:00 GMT', undefined], ['-5', undefined], ['99999', 3600], [null, undefined]])(
  'ignores or caps an unusable Retry-After %j', async (header, expected) => {
    network.mockResolvedValueOnce(new Response('{}', {
      status: 429, headers: { 'content-type': 'application/json', ...(header ? { 'retry-after': header } : {}) },
    }));
    const error = await apiRequest('/api/access/qr').catch((caught: ApiError) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).retryAfterSeconds).toBe(expected);
  },
);
