import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { registerMobile } from '@/services/authService';
import { ApiError } from '@/types/auth';

import { useRegistrationViewModel } from './use-registration-view-model';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/authService', () => ({ registerMobile: jest.fn() }));

const register = jest.mocked(registerMobile);
type ViewModel = ReturnType<typeof useRegistrationViewModel>;

function fill(vm: ViewModel) {
  vm.setEmail(' Usuario@Correo.COM ');
  vm.setPassword('Titanium1!');
  vm.setConfirmPassword('Titanium1!');
}

beforeEach(() => {
  jest.resetAllMocks();
  register.mockResolvedValue({ message: 'Verifica tu correo' });
});

describe('consentimiento del registro', () => {
  it('empieza desmarcado y no considera la lectura del aviso como aceptación', async () => {
    const { result } = await renderHook(useRegistrationViewModel);
    expect(result.current.privacyAccepted).toBe(false);
    await act(() => result.current.openPrivacyNotice());
    expect(router.push).toHaveBeenCalledWith('/privacy-notice');
    expect(result.current.privacyAccepted).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('bloquea el envío directo sin consentimiento y permite desmarcarlo de nuevo', async () => {
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => fill(result.current));
    await act(() => result.current.submit());
    expect(register).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.privacyAccepted).toBeDefined();
    await act(() => result.current.setPrivacyAccepted(true));
    expect(result.current.fieldErrors.privacyAccepted).toBeUndefined();
    await act(() => result.current.setPrivacyAccepted(false));
    await act(() => result.current.submit());
    expect(register).not.toHaveBeenCalled();
  });

  it('no envía datos inválidos aunque haya aceptación y limpia los errores al corregirlos', async () => {
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => result.current.setPrivacyAccepted(true));
    await act(() => result.current.submit());
    expect(register).not.toHaveBeenCalled();
    await act(() => fill(result.current));
    expect(result.current.fieldErrors.email).toBeUndefined();
    expect(result.current.fieldErrors.password).toBeUndefined();
    expect(result.current.fieldErrors.confirmPassword).toBeUndefined();
  });

  it('registra solo los argumentos admitidos por la API y navega sin contraseñas ni un comprobante inventado', async () => {
    const { result, unmount } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    await act(() => result.current.submit());
    expect(register).toHaveBeenCalledWith('usuario@correo.com', 'Titanium1!');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/verify-account', params: { email: 'usuario@correo.com' } });
    expect(result.current.isSubmitting).toBe(false);
    await unmount();
    const fresh = await renderHook(useRegistrationViewModel);
    expect(fresh.result.current.privacyAccepted).toBe(false);
  });

  it('bloquea envíos duplicados mientras la petición sigue pendiente', async () => {
    let finish!: (response: { message: string }) => void;
    register.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    let pending!: Promise<void>;
    await act(() => { pending = result.current.submit(); });
    expect(result.current.isSubmitting).toBe(true);
    await act(() => result.current.submit());
    expect(register).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ message: 'OK' }); await pending; });
    expect(result.current.isSubmitting).toBe(false);
  });

  it.each([
    [new Error('Offline'), 'No fue posible crear la cuenta. Revisa tu conexión e inténtalo de nuevo.'],
    [new ApiError('Conflict', 409), 'Ya existe una cuenta asociada a este correo.'],
  ])('maneja el rechazo sin navegar y permite reintentar (%s)', async (error, message) => {
    register.mockRejectedValueOnce(error);
    const { result } = await renderHook(useRegistrationViewModel);
    await act(() => { fill(result.current); result.current.setPrivacyAccepted(true); });
    await act(() => result.current.submit());
    expect(result.current.formError).toBe(message);
    expect(router.push).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
    await act(() => result.current.submit());
    expect(register).toHaveBeenCalledTimes(2);
    expect(result.current.formError).toBeNull();
  });
});
