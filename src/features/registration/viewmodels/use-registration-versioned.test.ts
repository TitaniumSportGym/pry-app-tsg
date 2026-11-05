import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { consentReceipt, privacyNotice } from '../../../../tests/fixtures/arco';
import { getPrivacyNotice } from '@/features/privacy/api/arco-api';
import { registerMobile } from '@/services/authService';
import { ApiError } from '@/types/auth';
import { useRegistrationViewModel } from './use-registration-view-model';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/features/privacy/models/arco-config', () => ({ isArcoBackendEnabled: () => true }));
jest.mock('@/features/privacy/api/arco-api', () => ({ getPrivacyNotice: jest.fn() }));
jest.mock('@/services/authService', () => ({ registerMobile: jest.fn() }));
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getPrivacyNotice).mockResolvedValue(privacyNotice());
  jest.mocked(registerMobile).mockResolvedValue({ message: 'Verifica tu correo', privacyConsent: consentReceipt() });
});
function fill(vm: ReturnType<typeof useRegistrationViewModel>) {
  vm.setEmail(' Persona@Correo.COM '); vm.setPassword('Titanium1!'); vm.setConfirmPassword('Titanium1!');
}
describe('registro con aviso versionado', () => {
  it('consulta aviso, conserva elección explícita y valida recibo antes de navegar', async () => {
    const { result } = await renderHook(useRegistrationViewModel);
    expect(result.current.privacyAccepted).toBe(false);
    await act(() => { fill(result.current); });
    await act(() => result.current.submit()); expect(registerMobile).not.toHaveBeenCalled();
    await act(() => result.current.openPrivacyNotice());
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(privacyNotice().documentUrl);
    expect(result.current.privacyAccepted).toBe(false);
    await act(() => result.current.setPrivacyAccepted(true));
    await act(() => result.current.submit());
    expect(registerMobile).toHaveBeenCalledWith('persona@correo.com', 'Titanium1!', {
      noticeId: 'privacy-notice', version: privacyNotice().version, accepted: true,
    });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/verify-account', params: { email: 'persona@correo.com' } });
    expect(result.current.password).toBe(''); expect(result.current.confirmPassword).toBe('');
  });
  it('NOTICE_VERSION_CHANGED desmarca y exige aceptar de nuevo la versión consultada', async () => {
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    jest.mocked(registerMobile).mockRejectedValueOnce(new ApiError('Changed', 409, undefined, 'NOTICE_VERSION_CHANGED'));
    jest.mocked(getPrivacyNotice).mockResolvedValueOnce({ ...privacyNotice(), version: 'test-approved-v2' });
    await act(() => result.current.submit());
    expect(result.current.privacyAccepted).toBe(false);
    expect(result.current.notice?.version).toBe('test-approved-v2');
    expect(router.push).not.toHaveBeenCalled(); expect(result.current.formError).toMatch(/aviso cambió/);
  });
  it('sin aviso aprobado no acepta ni envía el formulario; puede reintentar su consulta', async () => {
    jest.mocked(getPrivacyNotice).mockRejectedValueOnce(new ApiError('Unavailable', 503, undefined, 'PRIVACY_NOTICE_UNAVAILABLE'));
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    await act(() => result.current.submit());
    expect(result.current.privacyAccepted).toBe(false); expect(registerMobile).not.toHaveBeenCalled();
    expect(result.current.noticeError).toMatch(/aprobado aún no está disponible/);
    await act(() => result.current.reloadNotice()); expect(result.current.notice).toEqual(privacyNotice());
  });
  it.each([{ message: 'Created' }, { message: 'Created', privacyConsent: { ...consentReceipt(), version: 'other' } }])(
    'un recibo ausente o contradictorio no se anuncia como consentimiento registrado', async (response) => {
      jest.mocked(registerMobile).mockResolvedValueOnce(response);
      const { result } = await renderHook(useRegistrationViewModel);
      await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
      await act(() => result.current.submit());
      expect(router.push).not.toHaveBeenCalled(); expect(result.current.formError).toMatch(/respuesta válida/);
      expect(result.current.privacyAccepted).toBe(false);
    });
  it('no navega si el registro termina después de abandonar la pantalla', async () => {
    let complete!: (value: Awaited<ReturnType<typeof registerMobile>>) => void;
    jest.mocked(registerMobile).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const { result, unmount } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    let pending!: Promise<void>;
    await act(() => { pending = result.current.submit(); }); await unmount();
    await act(async () => { complete({ message: 'Created', privacyConsent: consentReceipt() }); await pending; });
    expect(router.push).not.toHaveBeenCalled();
  });
});
