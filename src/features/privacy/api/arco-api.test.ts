import {
  arcoProfile, cancellationRequest, consentReceipt, privacyNotice, privacyPreferences,
  reauthenticationChallenge, reauthenticationProof, ARCO_DATE, ARCO_USER_ID,
} from '../../../../tests/fixtures/arco';

import * as api from './arco-api';
import { isArcoBackendEnabled } from '@/features/privacy/models/arco-config';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

jest.mock('@/features/privacy/models/arco-config', () => ({ isArcoBackendEnabled: jest.fn() }));
jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);
function respond(body: unknown, status = 200, etag?: string) {
  request.mockImplementationOnce(async (_path, options) => {
    options?.onResponse?.({ status, headers: new Headers(etag ? { etag } : {}) });
    return body as never;
  });
}
beforeEach(() => { jest.resetAllMocks(); jest.mocked(isArcoBackendEnabled).mockReturnValue(true); });

describe('adaptadores ARCO', () => {
  it('desactivado no emite peticiones nuevas', async () => {
    jest.mocked(isArcoBackendEnabled).mockReturnValue(false);
    await expect(api.getPrivacyNotice()).rejects.toMatchObject({ code: 'ARCO_DISABLED' });
    await expect(api.getPrivacyPreferences()).rejects.toMatchObject({ code: 'ARCO_DISABLED' });
    expect(request).not.toHaveBeenCalled();
  });
  it('consulta aviso sin JWT y registra aceptación autenticada sin identidad cliente', async () => {
    respond(privacyNotice()); expect(await api.getPrivacyNotice()).toEqual(privacyNotice());
    expect(request).toHaveBeenLastCalledWith('/api/privacy/notice', expect.objectContaining({ auth: false }));
    respond(consentReceipt(), 201); await api.acceptPrivacyNotice(privacyNotice());
    expect(request).toHaveBeenLastCalledWith('/api/user/privacy-consents', expect.objectContaining({
      method: 'POST', body: { noticeId: 'privacy-notice', version: 'test-approved-v1', accepted: true },
    }));
    respond({ consents: [] }); expect(await api.getPrivacyConsents()).toEqual([]);
  });
  it('usa ETag exacto e If-Match; PATCH parcial no envía datos profesionales, rol ni userId', async () => {
    const p = arcoProfile(), etag = '"' + p.version + '"';
    respond(p, 200, etag); expect((await api.getArcoProfile(ARCO_USER_ID, 'cliente')).etag).toBe(etag);
    const updated = { ...p, fullName: 'Nombre corregido', phone: null, version: 'c'.repeat(64) };
    respond(updated, 200, '"' + updated.version + '"');
    await api.rectifyPersonalData(ARCO_USER_ID, { fullName: ' Nombre corregido ', phone: '' }, etag);
    expect(request).toHaveBeenLastCalledWith('/api/user/profile', expect.objectContaining({
      method: 'PATCH', headers: { 'If-Match': etag }, body: { fullName: 'Nombre corregido', phone: null },
    }));
    respond(p); await expect(api.getArcoProfile(ARCO_USER_ID, 'cliente')).rejects.toMatchObject({ code: 'INVALID_ARCO_RESPONSE' });
  });
  it('valida que la respuesta refleje lo solicitado antes de confirmar', async () => {
    const p = arcoProfile(), etag = '"' + p.version + '"';
    respond(p, 200, etag);
    await expect(api.rectifyPersonalData(ARCO_USER_ID, { fullName: 'Otro', phone: '' }, etag)).rejects.toBeInstanceOf(ApiError);
    await expect(api.rectifyPersonalData(ARCO_USER_ID, { fullName: '', phone: 'bad' }, etag)).rejects.toBeInstanceOf(ApiError);
  });
  it('guarda una preferencia con versión y preserva la otra elección', async () => {
    const initial = privacyPreferences();
    respond(initial); expect(await api.getPrivacyPreferences()).toEqual(initial);
    const updated = { version: 2, preferences: [{ purpose: 'promotional_communications', optOut: true, updatedAt: ARCO_DATE }, initial.preferences[1]] };
    respond(updated); expect((await api.patchPrivacyPreference(initial, 'promotional_communications', true)).version).toBe(2);
    expect(request).toHaveBeenLastCalledWith('/api/user/privacy-preferences', expect.objectContaining({
      method: 'PATCH', body: { version: 1, preferences: [{ purpose: 'promotional_communications', optOut: true }] },
    }));
    respond(initial); await expect(api.patchPrivacyPreference(initial, 'promotional_communications', true)).rejects.toBeInstanceOf(ApiError);
  });
  it('200 exige prueba; 202 exige reto fresco; verify no usa endpoints de login', async () => {
    respond(reauthenticationProof()); expect((await api.startCancellationReauthentication('private-password')).kind).toBe('proof');
    expect(request).toHaveBeenLastCalledWith('/api/auth/reauthenticate', expect.objectContaining({
      method: 'POST', body: { purpose: 'account-cancellation', method: 'password', password: 'private-password' },
    }));
    const challenge = reauthenticationChallenge();
    respond(challenge, 202); expect((await api.startCancellationReauthentication('private-password')).kind).toBe('challenge');
    respond(reauthenticationProof()); await api.verifyCancellationReauthentication(challenge.challengeId, '012345');
    expect(request).toHaveBeenLastCalledWith('/api/auth/reauthenticate/verify', expect.objectContaining({ body: { challengeId: challenge.challengeId, code: '012345' } }));
    respond(reauthenticationProof(), 202); await expect(api.startCancellationReauthentication('private-password')).rejects.toBeInstanceOf(ApiError);
  });
  it('envía cancelación con confirmación y UUID; solo 202 confirma recepción; consulta propio folio', async () => {
    const key = '55555555-5555-4555-8555-555555555555', token = reauthenticationProof().reauthenticationToken;
    respond(cancellationRequest(), 202); await api.submitCancellation('SOLICITAR CANCELACIÓN', token, key);
    expect(request).toHaveBeenLastCalledWith('/api/user/account-cancellation-requests', expect.objectContaining({
      method: 'POST', headers: { 'Idempotency-Key': key }, body: { confirmation: 'SOLICITAR CANCELACIÓN', reauthenticationToken: token },
    }));
    respond(cancellationRequest()); await api.getCancellationRequest(cancellationRequest().requestId);
    respond(cancellationRequest(), 200); await expect(api.submitCancellation('SOLICITAR CANCELACIÓN', token, key)).rejects.toBeInstanceOf(ApiError);
  });
  it.each([401, 403, 409, 412, 422, 429, 503])('propaga errores HTTP %s sin inventar estados', async (status) => {
    const error = new ApiError('Private response', status, undefined, 'PREFERENCES_VERSION_CHANGED');
    request.mockRejectedValueOnce(error);
    await expect(api.getPrivacyPreferences()).rejects.toBe(error);
  });
});
