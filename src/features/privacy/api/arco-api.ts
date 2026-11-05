import { isArcoBackendEnabled } from '@/features/privacy/models/arco-config';
import {
  consentFor, invalidContract, isUuid, parseArcoProfile, parseCancellation, parseChallenge,
  parseConsents, parseNotice, parsePersonalSnapshot, parsePreferences, parseProof, parseReceipt,
  type OptionalPurpose, type PrivacyNotice, type PrivacyPreferences, type ReauthenticationResult,
} from '@/features/privacy/models/arco-contracts';
import { validateRectification, type RectificationDraft } from '@/features/privacy/models/personal-data';
import type { UserRole } from '@/features/authorization/models/user-role';
import { apiRequest, type ApiRequestOptions } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

function enabled() {
  if (!isArcoBackendEnabled()) throw new ApiError('ARCO disabled.', 503, undefined, 'ARCO_DISABLED');
}
async function request(path: string, options: ApiRequestOptions = {}) {
  enabled();
  let status = 0;
  let etag: string | null = null;
  const body = await apiRequest<unknown>(path, { ...options, onResponse: (metadata) => {
    status = metadata.status; etag = metadata.headers.get('etag');
  } });
  return { body, status, etag };
}
export async function getPrivacyNotice() {
  const result = await request('/api/privacy/notice', { auth: false });
  if (result.status !== 200) return invalidContract();
  return parseNotice(result.body);
}
export async function getArcoProfile(ownerId: string, role: UserRole) {
  const result = await request('/api/user/profile');
  if (result.status !== 200) return invalidContract();
  return parseArcoProfile(result.body, ownerId, role, result.etag);
}
export async function rectifyPersonalData(ownerId: string, draft: RectificationDraft, etag: string) {
  const { values, errors } = validateRectification(draft);
  if (Object.keys(errors).length || !/^"[a-f0-9]{64}"$/.test(etag)) throw new ApiError('Invalid profile.', 422);
  const result = await request('/api/user/profile', { method: 'PATCH', headers: { 'If-Match': etag },
    body: { fullName: values.fullName || null, phone: values.phone || null } });
  if (result.status !== 200) return invalidContract();
  const updated = parsePersonalSnapshot(result.body, ownerId, result.etag);
  if (updated.fullName !== (values.fullName || null) || updated.phone !== (values.phone || null)) return invalidContract();
  return updated;
}
export async function getPrivacyConsents() {
  const result = await request('/api/user/privacy-consents');
  if (result.status !== 200) return invalidContract();
  return parseConsents(result.body);
}
export async function acceptPrivacyNotice(notice: PrivacyNotice) {
  const result = await request('/api/user/privacy-consents', { method: 'POST', body: consentFor(notice) });
  if (result.status !== 201) return invalidContract();
  return parseReceipt(result.body, notice);
}
export async function getPrivacyPreferences() {
  const result = await request('/api/user/privacy-preferences');
  if (result.status !== 200) return invalidContract();
  return parsePreferences(result.body);
}
export async function patchPrivacyPreference(previous: PrivacyPreferences, purpose: OptionalPurpose, optOut: boolean) {
  const result = await request('/api/user/privacy-preferences', { method: 'PATCH',
    body: { version: previous.version, preferences: [{ purpose, optOut }] } });
  if (result.status !== 200) return invalidContract();
  const updated = parsePreferences(result.body);
  if (updated.version !== previous.version + 1 || !updated.preferences.some((p) => p.purpose === purpose && p.optOut === optOut) ||
      previous.preferences.some((old) => old.purpose !== purpose &&
        !updated.preferences.some((p) => p.purpose === old.purpose && p.optOut === old.optOut && p.updatedAt === old.updatedAt))) return invalidContract();
  return updated;
}
export async function startCancellationReauthentication(password: string): Promise<ReauthenticationResult> {
  const result = await request('/api/auth/reauthenticate', { method: 'POST',
    body: { purpose: 'account-cancellation', method: 'password', password } });
  if (result.status === 200) return { kind: 'proof', proof: parseProof(result.body) };
  if (result.status === 202) return { kind: 'challenge', challenge: parseChallenge(result.body) };
  return invalidContract();
}
export async function verifyCancellationReauthentication(challengeId: string, code: string) {
  if (!isUuid(challengeId) || !/^\d{6}$/.test(code)) throw new ApiError('Invalid challenge.', 422);
  const result = await request('/api/auth/reauthenticate/verify', { method: 'POST', body: { challengeId, code } });
  if (result.status !== 200) return invalidContract();
  return parseProof(result.body);
}
export async function submitCancellation(confirmation: string, token: string, idempotencyKey: string) {
  const result = await request('/api/user/account-cancellation-requests', { method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey }, body: { confirmation, reauthenticationToken: token } });
  if (result.status !== 202) return invalidContract();
  return parseCancellation(result.body);
}
export async function getCancellationRequest(requestId: string) {
  if (!isUuid(requestId)) throw new ApiError('Invalid request ID.', 422);
  const result = await request('/api/user/account-cancellation-requests/' + encodeURIComponent(requestId));
  if (result.status !== 200) return invalidContract();
  return parseCancellation(result.body, requestId);
}
