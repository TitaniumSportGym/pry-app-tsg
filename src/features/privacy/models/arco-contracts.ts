import { parseUserRole, type UserRole } from '@/features/authorization/models/user-role';
import { ApiError, type UserProfileResponse } from '@/types/auth';

export interface PrivacyNotice {
  noticeId: 'privacy-notice';
  version: string;
  contentSha256: string;
  documentUrl: string;
  requiredForRegistration: boolean;
}
export interface ConsentAcceptance {
  noticeId: 'privacy-notice';
  version: string;
  accepted: true;
}
export interface ConsentReceipt {
  receiptId: string;
  noticeId: 'privacy-notice';
  version: string;
  contentSha256: string;
  documentUrl: string;
  acceptedAt: string;
  revokedAt: string | null;
}
export interface PersonalSnapshot {
  id: string;
  fullName: string | null;
  phone: string | null;
  updatedAt: string | null;
  version: string;
  etag: string;
}
export type ArcoProfile = UserProfileResponse & PersonalSnapshot;
export const PURPOSES = ['promotional_communications', 'satisfaction_surveys'] as const;
export type OptionalPurpose = (typeof PURPOSES)[number];
export interface PrivacyPreference {
  purpose: OptionalPurpose;
  optOut: boolean | null;
  updatedAt: string | null;
}
export interface PrivacyPreferences { version: number; preferences: PrivacyPreference[] }
export interface ReauthenticationProof { reauthenticationToken: string; expiresAt: string }
export interface ReauthenticationChallenge {
  challengeId: string;
  method: 'otp' | 'totp';
  expiresAt: string;
  notBefore?: string;
}
export type ReauthenticationResult =
  | { kind: 'proof'; proof: ReauthenticationProof }
  | { kind: 'challenge'; challenge: ReauthenticationChallenge };
export interface RetentionCategory {
  category: string;
  policyStatus: 'pending_approval';
  reason: string | null;
  retainUntil: string | null;
}
export interface CancellationRequest {
  requestId: string;
  status: 'pending_review';
  createdAt: string;
  resolvedAt: null;
  membershipImpact: { requiresReview: true };
  retentionSummary: RetentionCategory[];
}
export const CANCELLATION_CONFIRMATION = 'SOLICITAR CANCELACIÓN';

export function invalidContract(): never {
  throw new ApiError('El servidor no confirmó una respuesta válida. Consulta de nuevo antes de continuar.', 502, undefined, 'INVALID_ARCO_RESPONSE');
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidContract();
  return value as Record<string, unknown>;
}
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const date = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));
export const isUuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function https(value: unknown): value is string {
  if (!text(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash; }
  catch { return false; }
}
export function parseNotice(value: unknown): PrivacyNotice {
  const p = record(value);
  if (p.noticeId !== 'privacy-notice' || !text(p.version) || p.version.length > 80 ||
      typeof p.contentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.contentSha256) ||
      !https(p.documentUrl) || typeof p.requiredForRegistration !== 'boolean') return invalidContract();
  return { noticeId: p.noticeId, version: p.version, contentSha256: p.contentSha256,
    documentUrl: p.documentUrl, requiredForRegistration: p.requiredForRegistration };
}
export function consentFor(notice: PrivacyNotice): ConsentAcceptance {
  return { noticeId: notice.noticeId, version: notice.version, accepted: true };
}
export function parseReceipt(value: unknown, notice?: PrivacyNotice): ConsentReceipt {
  const p = record(value);
  if (!isUuid(p.receiptId) || !date(p.acceptedAt) || (p.revokedAt !== null && !date(p.revokedAt))) return invalidContract();
  const document = parseNotice({ ...p, requiredForRegistration: false });
  if (notice && (notice.version !== document.version || notice.contentSha256 !== document.contentSha256 ||
      notice.documentUrl !== document.documentUrl || p.revokedAt !== null)) return invalidContract();
  return { receiptId: p.receiptId, noticeId: document.noticeId, version: document.version,
    contentSha256: document.contentSha256, documentUrl: document.documentUrl,
    acceptedAt: p.acceptedAt, revokedAt: p.revokedAt as string | null };
}
export function parseConsents(value: unknown): ConsentReceipt[] {
  const p = record(value);
  if (!Array.isArray(p.consents)) return invalidContract();
  return p.consents.map((item) => parseReceipt(item));
}
export function parsePersonalSnapshot(value: unknown, ownerId: string, etag: string | null): PersonalSnapshot {
  const p = record(value);
  if (p.id !== ownerId || typeof p.version !== 'string' || !/^[a-f0-9]{64}$/.test(p.version) ||
      etag !== '"' + p.version + '"' || (p.updatedAt !== null && !date(p.updatedAt)) ||
      (p.fullName !== null && (typeof p.fullName !== 'string' || p.fullName.length > 160)) ||
      (p.phone !== null && (typeof p.phone !== 'string' || p.phone.length > 30))) return invalidContract();
  return { id: ownerId, fullName: p.fullName as string | null, phone: p.phone as string | null,
    updatedAt: p.updatedAt as string | null, version: p.version, etag };
}
export function parseArcoProfile(value: unknown, ownerId: string, role: UserRole, etag: string | null): ArcoProfile {
  const p = record(value);
  if (parseUserRole(p.rol) !== role || !text(p.email)) return invalidContract();
  const identity: UserProfileResponse = { id: ownerId, email: p.email, rol: role };
  for (const field of ['provider', 'authMethod', 'loginMethod'] as const) {
    if (typeof p[field] === 'string') identity[field] = p[field];
  }
  return { ...identity, ...parsePersonalSnapshot(p, ownerId, etag) };
}
export function parsePreferences(value: unknown): PrivacyPreferences {
  const p = record(value);
  if (!Number.isSafeInteger(p.version) || Number(p.version) < 1 || !Array.isArray(p.preferences) ||
      p.preferences.length !== PURPOSES.length) return invalidContract();
  const seen = new Set();
  const preferences = p.preferences.map((value): PrivacyPreference => {
    const item = record(value);
    if (!PURPOSES.includes(item.purpose as OptionalPurpose) || seen.has(item.purpose) ||
        (item.optOut !== null && typeof item.optOut !== 'boolean') ||
        (item.optOut === null ? item.updatedAt !== null : !date(item.updatedAt))) return invalidContract();
    seen.add(item.purpose);
    return { purpose: item.purpose as OptionalPurpose, optOut: item.optOut as boolean | null, updatedAt: item.updatedAt as string | null };
  });
  return { version: Number(p.version), preferences };
}
export function parseProof(value: unknown): ReauthenticationProof {
  const p = record(value);
  if (typeof p.reauthenticationToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(p.reauthenticationToken) ||
      !date(p.expiresAt) || Date.parse(p.expiresAt) <= Date.now()) return invalidContract();
  return { reauthenticationToken: p.reauthenticationToken, expiresAt: p.expiresAt };
}
export function parseChallenge(value: unknown): ReauthenticationChallenge {
  const p = record(value);
  if (!isUuid(p.challengeId) || !['otp', 'totp'].includes(String(p.method)) ||
      !date(p.expiresAt) || Date.parse(p.expiresAt) <= Date.now() || 'reauthenticationToken' in p ||
      (p.method === 'totp' && (!date(p.notBefore) || Date.parse(p.notBefore) >= Date.parse(p.expiresAt)))) return invalidContract();
  return { challengeId: p.challengeId, method: p.method as 'otp' | 'totp', expiresAt: p.expiresAt,
    ...(p.method === 'totp' ? { notBefore: p.notBefore as string } : {}) };
}
export function parseCancellation(value: unknown, requestId?: string): CancellationRequest {
  const p = record(value);
  if (!isUuid(p.requestId) || (requestId !== undefined && p.requestId !== requestId) || p.status !== 'pending_review' ||
      !date(p.createdAt) || p.resolvedAt !== null || record(p.membershipImpact).requiresReview !== true ||
      !Array.isArray(p.retentionSummary) || !p.retentionSummary.length) return invalidContract();
  const retentionSummary = p.retentionSummary.map((value): RetentionCategory => {
    const item = record(value);
    if (!text(item.category) || item.policyStatus !== 'pending_approval' ||
        (item.reason !== null && typeof item.reason !== 'string') ||
        (item.retainUntil !== null && !date(item.retainUntil))) return invalidContract();
    return { category: item.category, policyStatus: 'pending_approval',
      reason: item.reason as string | null, retainUntil: item.retainUntil as string | null };
  });
  return { requestId: p.requestId, status: 'pending_review', createdAt: p.createdAt,
    resolvedAt: null, membershipImpact: { requiresReview: true }, retentionSummary };
}
export function arcoErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No fue posible completar la operación. Revisa tu conexión y vuelve a intentar.';
  const code = error.code ?? (error.data && typeof error.data === 'object' && 'code' in error.data ? error.data.code : undefined);
  const messages: Record<string, string> = {
    ARCO_DISABLED: 'Las operaciones ARCO todavía no están habilitadas. Consulta el canal ARCO del aviso.',
    PRIVACY_NOTICE_UNAVAILABLE: 'El aviso aprobado aún no está disponible. No se registró una aceptación.',
    NOTICE_VERSION_CHANGED: 'El aviso cambió. Consulta su versión vigente y vuelve a aceptarlo expresamente.',
    CONSENT_REQUIRED: 'Debes aceptar expresamente la versión vigente del aviso.',
    PROFILE_VERSION_CHANGED: 'El perfil cambió en otro dispositivo. Se recargaron los datos; revisa y vuelve a editar.',
    PREFERENCES_VERSION_CHANGED: 'Las preferencias cambiaron en otro dispositivo. Consulta el estado actualizado.',
    REAUTHENTICATION_METHOD_UNAVAILABLE: 'La verificación disponible no permite este trámite. Utiliza el canal ARCO del aviso; Google sin contraseña local aún no admite cancelación automatizada.',
    REAUTHENTICATION_FAILED: 'No se pudo verificar tu identidad. Comprueba tu contraseña y los requisitos de la cuenta.',
    REAUTHENTICATION_REQUIRED: 'La verificación no es válida o venció. Verifica tu identidad nuevamente.',
    CANCELLATION_ALREADY_PENDING: 'Ya existe una solicitud pendiente para tu cuenta. Consulta tu folio o el canal ARCO.',
    IDEMPOTENCY_CONFLICT: 'La operación no coincide con el intento anterior. Reinicia la verificación.',
    CANCELLATION_NOT_FOUND: 'No se encontró una solicitud propia con ese folio.',
    INVALID_ARCO_RESPONSE: 'El servidor no confirmó una respuesta válida. Consulta de nuevo antes de continuar.',
  };
  if (typeof code === 'string' && messages[code]) return messages[code];
  if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (error.status === 429) return 'Demasiados intentos. Espera antes de volver a intentar.';
  if (error.status === 412 || error.status === 428) return messages.PROFILE_VERSION_CHANGED;
  if (error.status === 422) return 'Revisa los datos y la confirmación de la operación.';
  if (error.status === 403) return 'No se autorizó esta operación. Tu sesión no se ha cerrado por este rechazo.';
  return 'El servicio no confirmó la operación. Intenta de nuevo más tarde.';
}
