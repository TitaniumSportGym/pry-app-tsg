import {
  arcoProfile, cancellationRequest, consentReceipt, privacyNotice, privacyPreferences,
  reauthenticationChallenge, reauthenticationProof, ARCO_USER_ID, ARCO_OTHER_ID, ARCO_DATE,
} from '../../../../tests/fixtures/arco';

import {
  arcoErrorMessage, consentFor, parseArcoProfile, parseCancellation, parseChallenge,
  parseConsents, parseNotice, parsePreferences, parseProof, parseReceipt,
} from './arco-contracts';
import { ApiError } from '@/types/auth';

describe('contratos ARCO del commit remoto 1e5f1bf', () => {
  it('acepta el contrato público publicado sin convertir el registro opcional en aceptación implícita', () => {
    const notice = parseNotice({
      noticeId: 'privacy-notice', version: '2026-11-08-v1',
      contentSha256: '7ae0e648561f1ba64aa4f3e09a8f271d644cc6dce4927abfd5c683d1a863c7ea',
      documentUrl: 'https://titaniumsportgym.vercel.app/avisos/aviso-privacidad-titanium-sport-gym.pdf',
      requiredForRegistration: false,
    });
    expect(notice.requiredForRegistration).toBe(false);
    expect(consentFor(notice)).toEqual({ noticeId: 'privacy-notice', version: '2026-11-08-v1', accepted: true });
  });
  it('aceptación explícita omite hash, fecha, identidad y fines opcionales del cuerpo cliente', () => {
    expect(consentFor(privacyNotice())).toEqual({ noticeId: 'privacy-notice', version: 'test-approved-v1', accepted: true });
    expect(parseConsents({ consents: [] })).toEqual([]);
    expect(parseReceipt(consentReceipt(), privacyNotice())).toEqual(consentReceipt());
  });
  it.each([
    { ...privacyNotice(), documentUrl: 'http://example.test/notice' },
    { ...privacyNotice(), contentSha256: 'fake' },
    { ...privacyNotice(), version: '' },
    { ...privacyNotice(), documentUrl: 'https://user:pass@example.test/notice' },
  ])('rechaza aviso no verificable %j', (value) => expect(() => parseNotice(value)).toThrow(ApiError));
  it('rechaza recibos sin fecha, de otro aviso o revocados como confirmación nueva', () => {
    for (const receipt of [{ ...consentReceipt(), acceptedAt: undefined }, { ...consentReceipt(), version: 'old' },
      { ...consentReceipt(), contentSha256: 'f'.repeat(64) }, { ...consentReceipt(), revokedAt: new Date().toISOString() }]) {
      expect(() => parseReceipt(receipt, privacyNotice())).toThrow(ApiError);
    }
  });
  it('perfil comprueba propietario, rol y ETag; solo conserva campos permitidos', () => {
    const value = { ...arcoProfile(), password: 'private-password', otp: '123456', accessToken: 'private-token' };
    const parsed = parseArcoProfile(value, ARCO_USER_ID, 'cliente', '"' + value.version + '"');
    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('otp');
    expect(parsed).not.toHaveProperty('accessToken');
    for (const [owner, role, etag] of [[ARCO_OTHER_ID, 'cliente', '"' + value.version + '"'],
      [ARCO_USER_ID, 'administrador', '"' + value.version + '"'], [ARCO_USER_ID, 'cliente', null]] as const) {
      expect(() => parseArcoProfile(value, owner, role, etag)).toThrow(ApiError);
    }
  });
  it('mantiene null de preferencias y rechaza finalidades duplicadas, desconocidas o booleanos simulados', () => {
    expect(parsePreferences(privacyPreferences())).toEqual(privacyPreferences());
    for (const value of [
      { version: 1, preferences: [] },
      { ...privacyPreferences(), version: '1' },
      { version: 1, preferences: [privacyPreferences().preferences[0], privacyPreferences().preferences[0]] },
      { version: 1, preferences: [{ purpose: 'unknown', optOut: true, updatedAt: new Date().toISOString() }, privacyPreferences().preferences[1]] },
      { version: 1, preferences: [{ purpose: 'promotional_communications', optOut: 'false', updatedAt: null }, privacyPreferences().preferences[1]] },
    ]) expect(() => parsePreferences(value)).toThrow(ApiError);
  });
  it('distingue reto de prueba y rechaza pruebas vencidas o anticipadas', () => {
    expect(parseChallenge(reauthenticationChallenge()).method).toBe('otp');
    const proof = reauthenticationProof();
    expect(parseProof(proof)).toEqual(proof);
    expect(() => parseChallenge({ ...reauthenticationChallenge(), reauthenticationToken: 'P'.repeat(43) })).toThrow(ApiError);
    expect(() => parseProof({ ...reauthenticationProof(), expiresAt: '2000-01-01T00:00:00Z' })).toThrow(ApiError);
    expect(() => parseChallenge({ ...reauthenticationChallenge('totp'), notBefore: undefined })).toThrow(ApiError);
  });
  it('cancelación solo confirma pending_review con folio, sin inventar bajas ni plazos', () => {
    expect(parseCancellation(cancellationRequest())).toEqual(cancellationRequest());
    for (const value of [{ ...cancellationRequest(), status: 'deleted' }, { ...cancellationRequest(), requestId: undefined },
      { ...cancellationRequest(), retentionSummary: [] }]) expect(() => parseCancellation(value)).toThrow(ApiError);
    expect(() => parseCancellation(cancellationRequest(), ARCO_OTHER_ID)).toThrow(ApiError);
  });
  it('mensajes no reflejan secretos ni confunden fallos de reautenticación con expiración de sesión', () => {
    expect(arcoErrorMessage(new ApiError('secret-password', 403, undefined, 'REAUTHENTICATION_REQUIRED'))).toMatch(/verificación/);
    expect(arcoErrorMessage(new Error('secret-password'))).not.toContain('secret-password');
    expect(arcoErrorMessage(new ApiError('secret-password', 503))).not.toContain('secret-password');
  });
  it('distingue estados administrativos y exige resolución y conservación aprobada para una baja', () => {
    for (const status of ['under_review','awaiting_policy']) {
      expect(parseCancellation({ ...cancellationRequest(),status,version:2 }).status).toBe(status);
    }
    expect(parseCancellation({ ...cancellationRequest(),status:'rejected',resolvedAt:ARCO_DATE }).status).toBe('rejected');
    const completed={...cancellationRequest(),status:'completed',resolvedAt:ARCO_DATE,retentionSummary:[
      {category:'payment_records',policyStatus:'approved',reason:'Synthetic fixture; not a legal basis',retainUntil:'2027-01-01T00:00:00Z'},
    ]};
    expect(parseCancellation(completed).status).toBe('completed');
    expect(()=>parseCancellation({...completed,resolvedAt:null})).toThrow(ApiError);
    expect(()=>parseCancellation({...completed,retentionSummary:cancellationRequest().retentionSummary})).toThrow(ApiError);
    expect(()=>parseCancellation({...cancellationRequest(),version:0})).toThrow(ApiError);
  });
});
