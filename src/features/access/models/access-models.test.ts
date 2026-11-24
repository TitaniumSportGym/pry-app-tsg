import { ApiError } from '@/types/auth';

import { getPassProblem, getScanRejection } from './access-errors';
import { dateOnlyToLocal, formatAccessMoment, formatDateOnly } from './access-format';
import {
  ACCESS_PASS_TTL_MS,
  formatCountdown,
  getLocalExpiry,
  getSecondsLeft,
  isValidAccessToken,
} from './access-pass';

function apiError(status: number, code?: string, retryAfterSeconds?: number) {
  const error = new ApiError('mensaje del backend', status, undefined, code);
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

describe('pase de acceso', () => {
  it('acepta solo tokens base64url de tamaño razonable', () => {
    expect(isValidAccessToken('hG5Wa8zF1rD0vQ3uN9bK2sC7eL4mP6xT8yJ0aR5dVUw')).toBe(true);
    expect(isValidAccessToken('corto')).toBe(false);
    expect(isValidAccessToken('token con espacios y más texto')).toBe(false);
    expect(isValidAccessToken('a'.repeat(200))).toBe(false);
    expect(isValidAccessToken(42)).toBe(false);
  });

  it('cuenta los segundos restantes sin bajar de cero y los formatea', () => {
    const expiresAt = new Date(60_000);
    expect(getSecondsLeft(expiresAt, 36_000)).toBe(24);
    expect(getSecondsLeft(expiresAt, 59_001)).toBe(1);
    expect(getSecondsLeft(expiresAt, 90_000)).toBe(0);
    expect(formatCountdown(24)).toBe('0:24');
    expect(formatCountdown(60)).toBe('1:00');
  });

  it('usa la caducidad del servidor salvo que el reloj del teléfono esté desfasado', () => {
    const receivedAt = 1_000_000;
    const fine = new Date(receivedAt + 58_000);
    expect(getLocalExpiry(fine, receivedAt)).toBe(fine);
    // Reloj adelantado: el servidor diría que ya venció.
    expect(getLocalExpiry(new Date(receivedAt - 5_000), receivedAt)).toEqual(
      new Date(receivedAt + ACCESS_PASS_TTL_MS),
    );
    // Reloj atrasado: no se muestra más tiempo del que dura un pase.
    expect(getLocalExpiry(new Date(receivedAt + 10 * 60_000), receivedAt)).toEqual(
      new Date(receivedAt + ACCESS_PASS_TTL_MS),
    );
  });
});

describe('formatos de acceso', () => {
  it('muestra fechas sin hora en el día correcto sin importar la zona horaria', () => {
    expect(dateOnlyToLocal('2026-12-02').getDate()).toBe(2);
    expect(formatDateOnly('2026-12-02')).toBe('2 dic 2026');
  });

  it('describe el momento de una entrada respecto a hoy', () => {
    const now = new Date(2026, 10, 3, 18, 0);
    expect(formatAccessMoment(new Date(2026, 10, 3, 12, 34), now)).toBe('Hoy · 12:34 p.m.');
    expect(formatAccessMoment(new Date(2026, 10, 2, 7, 5), now)).toBe('Ayer · 7:05 a.m.');
    expect(formatAccessMoment(new Date(2026, 9, 30, 7, 5), now)).toBe('30 oct 2026 · 7:05 a.m.');
  });
});

describe('errores del pase (cliente)', () => {
  it.each([
    [apiError(403, 'MEMBERSHIP_REQUIRED'), { kind: 'membership' }],
    [apiError(401), { kind: 'session' }],
    [apiError(403), { kind: 'error' }],
    [apiError(503, 'ACCESS_SERVICE_UNAVAILABLE'), { kind: 'error' }],
    [new TypeError('Network request failed'), { kind: 'error' }],
  ])('clasifica %s', (error, expected) => {
    expect(getPassProblem(error)).toMatchObject(expected);
  });

  it('respeta Retry-After y usa una ventana completa si no viene', () => {
    expect(getPassProblem(apiError(429, 'ACCESS_RATE_LIMITED', 12))).toMatchObject({
      kind: 'rate-limited',
      retryAfterSeconds: 12,
    });
    expect(getPassProblem(apiError(429))).toMatchObject({ retryAfterSeconds: 60 });
  });
});

describe('rechazos del escaneo (administrador)', () => {
  it.each([
    ['QR_INVALID', 400, 'Código no válido'],
    ['QR_EXPIRED', 410, 'Código vencido'],
    ['QR_ALREADY_USED', 409, 'Código ya utilizado'],
    ['MEMBERSHIP_REQUIRED', 403, 'Membresía no vigente'],
    ['SELF_SCAN_FORBIDDEN', 403, 'Es tu propio código'],
    ['QR_OWNER_INVALID', 403, 'Cuenta no válida'],
  ])('%s → "%s"', (code, status, title) => {
    expect(getScanRejection(apiError(status, code))).toMatchObject({ kind: 'denied', title });
  });

  it('nunca concede ni niega sin respuesta: red, 5xx o respuesta inválida quedan sin confirmar', () => {
    expect(getScanRejection(new TypeError('Network request failed')).kind).toBe('unverified');
    expect(getScanRejection(apiError(503, 'ACCESS_SERVICE_UNAVAILABLE')).kind).toBe('unverified');
    expect(getScanRejection(apiError(502)).kind).toBe('unverified');
  });

  it('distingue la sesión vencida y el límite de escaneos', () => {
    expect(getScanRejection(apiError(401)).kind).toBe('session');
    expect(getScanRejection(apiError(429, 'ACCESS_RATE_LIMITED', 20))).toMatchObject({
      kind: 'denied',
      retryAfterSeconds: 20,
    });
  });
});
