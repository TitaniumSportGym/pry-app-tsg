import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { trainerProfile } from '../../../../tests/fixtures/privacy';

import { getTrainerPersonalProfile, rectifyTrainerPersonalProfile } from '@/features/privacy/api/personal-data-api';
import { useAuth } from '@/hooks/use-auth';
import type { AuthContextValue } from '@/providers/auth-provider';
import { getCurrentUser } from '@/services/authService';
import { ApiError } from '@/types/auth';

import { usePrivacyCenterViewModel } from './use-privacy-center-view-model';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() } }));
jest.mock('@/hooks/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/authService', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/features/privacy/api/personal-data-api', () => ({ getTrainerPersonalProfile: jest.fn(), rectifyTrainerPersonalProfile: jest.fn() }));

let auth: AuthContextValue;

beforeEach(() => {
  jest.resetAllMocks();
  auth = {
    status: 'authenticated', user: { id: 'user-1', email: 'persona@example.com', rol: 'cliente' }, role: 'cliente',
    signOut: jest.fn().mockResolvedValue(undefined), signIn: jest.fn(), confirmOtp: jest.fn(), signInWithGoogle: jest.fn(),
  };
  jest.mocked(useAuth).mockImplementation(() => auth);
  jest.mocked(getCurrentUser).mockImplementation(async () => ({ ...auth.user!, rol: auth.role! }));
  jest.mocked(getTrainerPersonalProfile).mockResolvedValue(trainerProfile());
  jest.mocked(rectifyTrainerPersonalProfile).mockResolvedValue(trainerProfile());
});

function trainerSession() {
  auth = { ...auth, role: 'entrenador', user: { ...auth.user!, rol: 'entrenador' } };
}

describe('ViewModel de privacidad', () => {
  it('un cliente no puede crear una edición ni escribir a través del ViewModel', async () => {
    const { result } = await renderHook(usePrivacyCenterViewModel);
    await act(() => {
      result.current.beginEdit();
      result.current.setField('fullName', 'Nombre falso');
    });
    await act(() => result.current.save());
    expect(result.current.draft).toBeNull();
    expect(getTrainerPersonalProfile).not.toHaveBeenCalled();
    expect(rectifyTrainerPersonalProfile).not.toHaveBeenCalled();
  });

  it('actualiza al solicitarlo y conserva el borrador durante la edición', async () => {
    trainerSession();
    const { result } = await renderHook(usePrivacyCenterViewModel);
    await act(() => result.current.refresh());
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
    await act(() => result.current.beginEdit());
    await act(() => result.current.refresh());
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
    await act(() => result.current.cancelEdit());
    await act(() => result.current.refresh());
    expect(getCurrentUser).toHaveBeenCalledTimes(3);
  });

  it('no permite editar un perfil previo si falló su actualización', async () => {
    trainerSession();
    const { result } = await renderHook(usePrivacyCenterViewModel);
    jest.mocked(getCurrentUser).mockRejectedValueOnce(new ApiError('Unavailable', 503));
    await act(() => result.current.refresh());
    await act(() => result.current.beginEdit());
    expect(result.current.errorMessage).not.toBeNull();
    expect(result.current.draft).toBeNull();
  });

  it('bloquea un segundo guardado y la cancelación mientras la escritura está pendiente', async () => {
    trainerSession();
    let finish!: (profile: ReturnType<typeof trainerProfile>) => void;
    jest.mocked(rectifyTrainerPersonalProfile).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = await renderHook(usePrivacyCenterViewModel);
    await act(() => result.current.beginEdit());
    let pending!: Promise<void>;
    await act(() => { pending = result.current.save(); });
    expect(result.current.isSaving).toBe(true);
    await act(async () => {
      await result.current.save();
      result.current.cancelEdit();
      result.current.refresh();
    });
    expect(result.current.draft).not.toBeNull();
    expect(rectifyTrainerPersonalProfile).toHaveBeenCalledTimes(1);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    await act(async () => { finish(trainerProfile()); await pending; });
    expect(result.current.draft).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it.each([true, false])('descarta un guardado terminado después de salir (éxito=%s)', async (success) => {
    trainerSession();
    let finish!: () => void;
    jest.mocked(rectifyTrainerPersonalProfile).mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = () => success ? resolve(trainerProfile()) : reject(new Error('Offline'));
    }));
    const { result, unmount } = await renderHook(usePrivacyCenterViewModel);
    await act(() => result.current.beginEdit());
    let pending!: Promise<void>;
    await act(() => { pending = result.current.save(); });
    await unmount();
    await act(async () => { finish(); await pending; });
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['cliente', '/account', '/account/privacy'],
    ['administrador', '/admin/account', '/admin/account/privacy'],
    ['entrenador', '/trainer/account', '/trainer/account/privacy'],
  ] as const)('respeta la navegación del rol %s con o sin historial', async (role, parent, notice) => {
    auth = { ...auth, role, user: { ...auth.user!, rol: role } };
    const { result } = await renderHook(usePrivacyCenterViewModel);
    await act(() => result.current.goBack());
    expect(router.replace).toHaveBeenCalledWith(parent);
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await act(() => result.current.goBack());
    expect(router.back).toHaveBeenCalledTimes(1);
    await act(() => result.current.openNotice());
    expect(router.push).toHaveBeenCalledWith(notice);
  });
});
