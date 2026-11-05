import { act, renderHook } from '@testing-library/react-native';

import { arcoProfile, cancellationRequest, consentReceipt, privacyNotice, privacyPreferences, reauthenticationChallenge, reauthenticationProof, ARCO_DATE, ARCO_USER_ID } from '../../../../tests/fixtures/arco';

import * as api from '@/features/privacy/api/arco-api';
import { useAuth } from '@/hooks/use-auth';
import type { AuthContextValue } from '@/providers/auth-provider';
import { ApiError } from '@/types/auth';
import { useArcoCenterViewModel } from './use-arco-center-view-model';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/hooks/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/privacy/api/arco-api', () => ({
  acceptPrivacyNotice: jest.fn(), getArcoProfile: jest.fn(), getCancellationRequest: jest.fn(), getPrivacyConsents: jest.fn(),
  getPrivacyNotice: jest.fn(), getPrivacyPreferences: jest.fn(), patchPrivacyPreference: jest.fn(), rectifyPersonalData: jest.fn(),
  startCancellationReauthentication: jest.fn(), submitCancellation: jest.fn(), verifyCancellationReauthentication: jest.fn(),
}));
let auth: AuthContextValue;
const snapshot = () => ({ ...arcoProfile(), etag: '"' + arcoProfile().version + '"' });
beforeEach(() => {
  jest.resetAllMocks();
  auth = { status: 'authenticated', user: { id: ARCO_USER_ID, email: 'persona@example.test', rol: 'cliente' }, role: 'cliente',
    signOut: jest.fn().mockResolvedValue(undefined), signIn: jest.fn(), confirmOtp: jest.fn(), signInWithGoogle: jest.fn() };
  jest.mocked(useAuth).mockImplementation(() => auth);
  jest.mocked(api.getArcoProfile).mockResolvedValue(snapshot());
  jest.mocked(api.getPrivacyNotice).mockResolvedValue(privacyNotice());
  jest.mocked(api.getPrivacyConsents).mockResolvedValue([]);
  jest.mocked(api.getPrivacyPreferences).mockResolvedValue(privacyPreferences());
  jest.mocked(api.acceptPrivacyNotice).mockResolvedValue(consentReceipt());
  jest.mocked(api.startCancellationReauthentication).mockResolvedValue({ kind: 'proof', proof: reauthenticationProof() });
  jest.mocked(api.submitCancellation).mockResolvedValue(cancellationRequest());
  jest.mocked(api.getCancellationRequest).mockResolvedValue(cancellationRequest());
});
afterEach(() => jest.useRealTimers());

async function ready() {
  const hook = await renderHook(useArcoCenterViewModel);
  return hook;
}
async function verify(result: Awaited<ReturnType<typeof ready>>['result']) {
  await act(() => result.current.setPassword('private-password'));
  await act(() => result.current.reauthenticate());
}

describe('ViewModel ARCO', () => {
  it('carga estados reales y permite rectificación de cliente con ETag', async () => {
    const { result } = await ready();
    expect(result.current.privacyAccepted).toBe(false);
    expect(result.current.preferences?.preferences[0].optOut).toBeNull();
    await act(() => result.current.beginEdit());
    await act(() => result.current.setField('fullName', 'Nombre corregido'));
    jest.mocked(api.rectifyPersonalData).mockResolvedValue({ ...snapshot(), fullName: 'Nombre corregido' });
    await act(() => result.current.save());
    expect(api.rectifyPersonalData).toHaveBeenCalledWith(ARCO_USER_ID, { fullName: 'Nombre corregido', phone: '' }, snapshot().etag);
    expect(result.current.profile?.fullName).toBe('Nombre corregido');
    expect(result.current.draft).toBeNull();
  });
  it('conflicto 412 recarga el perfil y obliga a revisar otra edición', async () => {
    const { result } = await ready();
    await act(() => result.current.beginEdit());
    jest.mocked(api.rectifyPersonalData).mockRejectedValueOnce(new ApiError('Changed', 412, undefined, 'PROFILE_VERSION_CHANGED'));
    await act(() => result.current.save());
    expect(result.current.draft).toBeNull(); expect(api.getArcoProfile).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatch(/otro dispositivo/);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('no envía aceptación sin elección y solo muestra un comprobante confirmado', async () => {
    const { result } = await ready();
    await act(() => result.current.acceptNotice()); expect(api.acceptPrivacyNotice).not.toHaveBeenCalled();
    await act(() => result.current.setPrivacyAccepted(true));
    await act(() => result.current.acceptNotice());
    expect(api.acceptPrivacyNotice).toHaveBeenCalledWith(privacyNotice());
    expect(result.current.receipts).toEqual([consentReceipt()]);
    expect(result.current.privacyAccepted).toBe(false);
  });
  it('aviso cambiado retira la elección y consulta la nueva versión', async () => {
    const { result } = await ready();
    await act(() => result.current.setPrivacyAccepted(true));
    jest.mocked(api.acceptPrivacyNotice).mockRejectedValueOnce(new ApiError('Changed', 409, undefined, 'NOTICE_VERSION_CHANGED'));
    await act(() => result.current.acceptNotice());
    expect(result.current.privacyAccepted).toBe(false); expect(api.getPrivacyNotice).toHaveBeenCalledTimes(2);
    expect(result.current.receipts).toEqual([]);
  });
  it('preferencias no se actualizan optimistamente; bloquea doble guardado y aplica solo respuesta', async () => {
    const { result } = await ready();
    let complete!: (value: ReturnType<typeof privacyPreferences>) => void;
    jest.mocked(api.patchPrivacyPreference).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    let pending!: Promise<void>;
    await act(() => { pending = result.current.changePreference('promotional_communications', true); });
    expect(result.current.preferences?.preferences[0].optOut).toBeNull();
    await act(() => result.current.changePreference('promotional_communications', true));
    expect(api.patchPrivacyPreference).toHaveBeenCalledTimes(1);
    const updated = privacyPreferences(); updated.version = 2;
    updated.preferences[0] = { purpose: 'promotional_communications', optOut: true, updatedAt: ARCO_DATE };
    await act(async () => { complete(updated); await pending; });
    expect(result.current.preferences?.preferences[0].optOut).toBe(true);
  });
  it('202 de reautenticación exige completar reto y no permite solicitar cancelación anticipadamente', async () => {
    const challenge = reauthenticationChallenge();
    jest.mocked(api.startCancellationReauthentication).mockResolvedValueOnce({ kind: 'challenge', challenge });
    const { result } = await ready(); await verify(result);
    expect(result.current.password).toBe(''); expect(result.current.proofReady).toBe(false);
    expect(result.current.challenge).toEqual(challenge);
    await act(() => result.current.setConfirmation('SOLICITAR CANCELACIÓN'));
    await act(() => result.current.submitCancellation());
    expect(api.submitCancellation).not.toHaveBeenCalled();
  });
  it('verifica código fresco, limpia código y conserva sesión ante 403 de reto', async () => {
    const challenge = reauthenticationChallenge();
    jest.mocked(api.startCancellationReauthentication).mockResolvedValueOnce({ kind: 'challenge', challenge });
    const { result } = await ready(); await verify(result);
    await act(() => result.current.setCode('012345'));
    jest.mocked(api.verifyCancellationReauthentication).mockRejectedValueOnce(new ApiError('Code failed', 403, undefined, 'REAUTHENTICATION_REQUIRED'));
    await act(() => result.current.verifyCode());
    expect(auth.signOut).not.toHaveBeenCalled(); expect(result.current.code).toBe('');
    await act(() => result.current.setCode('012345'));
    jest.mocked(api.verifyCancellationReauthentication).mockResolvedValueOnce(reauthenticationProof());
    await act(() => result.current.verifyCode());
    expect(api.verifyCancellationReauthentication).toHaveBeenLastCalledWith(challenge.challengeId, '012345');
    expect(result.current.proofReady).toBe(true); expect(result.current.challenge).toBeNull();
    expect(result.current).not.toHaveProperty('reauthenticationToken');
  });
  it('TOTP espera notBefore y una prueba vencida no puede iniciar una solicitud', async () => {
    jest.useFakeTimers();
    const challenge = reauthenticationChallenge('totp');
    jest.mocked(api.startCancellationReauthentication).mockResolvedValueOnce({ kind: 'challenge', challenge });
    const { result } = await ready(); await verify(result);
    await act(() => result.current.setCode('123456'));
    await act(() => result.current.verifyCode());
    expect(api.verifyCancellationReauthentication).not.toHaveBeenCalled();
    await act(() => result.current.resetVerification());
    await verify(result);
    await act(() => { jest.advanceTimersByTime(300001); result.current.setConfirmation('SOLICITAR CANCELACIÓN'); });
    await act(() => result.current.submitCancellation());
    expect(api.submitCancellation).not.toHaveBeenCalled();
  });
  it('cancelación requiere confirmación y reintenta misma clave/cuerpo tras pérdida de respuesta', async () => {
    const { result } = await ready(); await verify(result);
    await act(() => result.current.submitCancellation()); expect(api.submitCancellation).not.toHaveBeenCalled();
    await act(() => result.current.setConfirmation('SOLICITAR CANCELACIÓN'));
    jest.mocked(api.submitCancellation).mockRejectedValueOnce(new Error('Response lost'));
    await act(() => result.current.submitCancellation());
    expect(result.current.pendingRetry).toBe(true); expect(result.current.cancellation).toBeNull();
    const original = jest.mocked(api.submitCancellation).mock.calls[0];
    await act(() => result.current.submitCancellation());
    expect(jest.mocked(api.submitCancellation).mock.calls[1]).toEqual(original);
    expect(original[2]).toMatch(/^[a-f0-9-]{36}$/);
    expect(result.current.cancellation?.status).toBe('pending_review');
    expect(result.current.proofExpiresAt).toBeNull(); expect(result.current.confirmation).toBe('');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('Google no disponible no simula verificación y permite recurrir al canal manual', async () => {
    jest.mocked(api.startCancellationReauthentication).mockRejectedValueOnce(new ApiError('Unsupported', 409, undefined, 'REAUTHENTICATION_METHOD_UNAVAILABLE'));
    const { result } = await ready(); await verify(result);
    expect(result.current.error).toMatch(/Google/); expect(result.current.password).toBe('');
    expect(result.current.proofReady).toBe(false); expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('401 en mutación cierra sesión; una respuesta tardía tras salir se descarta', async () => {
    const { result, unmount } = await ready();
    jest.mocked(api.startCancellationReauthentication).mockRejectedValueOnce(new ApiError('Unauthorized', 401));
    await verify(result); expect(auth.signOut).toHaveBeenCalledTimes(1);
    let complete!: (value: Awaited<ReturnType<typeof api.startCancellationReauthentication>>) => void;
    jest.mocked(api.startCancellationReauthentication).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    await act(() => result.current.setPassword('private-password'));
    let pending!: Promise<void>;
    await act(() => { pending = result.current.reauthenticate(); });
    await unmount();
    await act(async () => { complete({ kind: 'proof', proof: reauthenticationProof() }); await pending; });
    expect(api.submitCancellation).not.toHaveBeenCalled();
  });
});
