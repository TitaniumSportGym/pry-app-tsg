/**
 * Pase de acceso del cliente (POST /api/access/qr).
 * El token es opaco, dura 60 segundos y es de un solo uso: solo vive en memoria
 * mientras la pantalla está abierta; nunca se guarda, se registra ni se muestra como texto.
 */
export interface AccessPass {
  token: string;
  expiresAt: Date;
  subscription: { status: string; endsAt: string | null } | null;
}

/** base64url; el backend emite 43 caracteres, se acepta un margen por si cambia el tamaño. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidAccessToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

export function parseDateOnly(value: unknown): string | null {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value) ? value : null;
}

/** Devuelve null si la respuesta no trae un token utilizable o una caducidad válida. */
export function parseAccessPass(raw: unknown): AccessPass | null {
  if (!isRecord(raw) || !isValidAccessToken(raw.token)) return null;

  const expiresAt = typeof raw.expiresAt === 'string' ? new Date(raw.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return null;

  const subscription = isRecord(raw.subscription)
    ? {
        status: typeof raw.subscription.status === 'string' ? raw.subscription.status : 'active',
        endsAt: parseDateOnly(raw.subscription.endsAt),
      }
    : null;

  return { token: raw.token, expiresAt, subscription };
}

/** Vigencia del pase que emite el backend. */
export const ACCESS_PASS_TTL_MS = 60_000;

/**
 * Caducidad en el reloj del teléfono. Si el reloj está desfasado respecto al servidor,
 * expiresAt parecería vencido (o lejano); entonces se cuenta la vigencia desde que llegó.
 */
export function getLocalExpiry(expiresAt: Date, receivedAt: number) {
  const remaining = expiresAt.getTime() - receivedAt;
  return remaining > 0 && remaining <= ACCESS_PASS_TTL_MS
    ? expiresAt
    : new Date(receivedAt + ACCESS_PASS_TTL_MS);
}

/** Segundos completos que le quedan al pase; nunca negativo. */
export function getSecondsLeft(expiresAt: Date, now: number) {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now) / 1000));
}

/** 0:24 */
export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
