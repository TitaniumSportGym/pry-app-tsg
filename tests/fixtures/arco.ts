import type { PrivacyNotice, ConsentReceipt, PrivacyPreferences, ReauthenticationChallenge, ReauthenticationProof, CancellationRequest } from '@/features/privacy/models/arco-contracts';
import type { UserRole } from '@/features/authorization/models/user-role';

export const ARCO_USER_ID = '11111111-1111-4111-8111-111111111111';
export const ARCO_OTHER_ID = '99999999-9999-4999-8999-999999999999';
export const ARCO_DATE = '2026-11-05T12:00:00.000Z';
export function privacyNotice(): PrivacyNotice {
  return { noticeId: 'privacy-notice', version: 'test-approved-v1', contentSha256: 'a'.repeat(64),
    documentUrl: 'https://example.test/privacy/test-approved-v1', requiredForRegistration: true };
}
export function consentReceipt(): ConsentReceipt {
  const { requiredForRegistration: _required, ...notice } = privacyNotice();
  return { ...notice, receiptId: '22222222-2222-4222-8222-222222222222', acceptedAt: ARCO_DATE, revokedAt: null };
}
export function arcoProfile(role: UserRole = 'cliente') {
  return { id: ARCO_USER_ID, email: 'persona@example.test', rol: role, provider: 'local', authMethod: 'normal',
    loginMethod: 'local', fullName: 'Ana Titanium', phone: null, updatedAt: ARCO_DATE, version: 'b'.repeat(64) };
}
export function privacyPreferences(): PrivacyPreferences {
  return { version: 1, preferences: [
    { purpose: 'promotional_communications', optOut: null, updatedAt: null },
    { purpose: 'satisfaction_surveys', optOut: null, updatedAt: null },
  ] };
}
export function reauthenticationProof(): ReauthenticationProof {
  return { reauthenticationToken: 'P'.repeat(43), expiresAt: new Date(Date.now() + 300000).toISOString() };
}
export function reauthenticationChallenge(method: 'otp' | 'totp' = 'otp'): ReauthenticationChallenge {
  return { challengeId: '33333333-3333-4333-8333-333333333333', method,
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    ...(method === 'totp' ? { notBefore: new Date(Date.now() + 30000).toISOString() } : {}) };
}
export function cancellationRequest(): CancellationRequest {
  return { requestId: '44444444-4444-4444-8444-444444444444', status: 'pending_review', createdAt: ARCO_DATE,
    resolvedAt: null, membershipImpact: { requiresReview: true }, retentionSummary: [
      { category: 'payment_records', policyStatus: 'pending_approval', reason: null, retainUntil: null },
    ] };
}
