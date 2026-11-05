import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

import { useLegalViewModel } from './use-legal-view-model';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/use-auth', () => ({ useAuth: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

describe('acceso al centro de privacidad desde el aviso', () => {
  it.each([
    ['cliente', '/account/personal-data'],
    ['entrenador', '/trainer/account/personal-data'],
    ['administrador', '/admin/account/personal-data'],
  ] as const)('usa la ruta autenticada de %s', async (role, route) => {
    jest.mocked(useAuth).mockReturnValue({ status: 'authenticated', role } as ReturnType<typeof useAuth>);
    const { result } = await renderHook(() => useLegalViewModel('privacy'));
    expect(result.current.canManagePrivacy).toBe(true);
    await act(() => result.current.openPrivacyRights());
    expect(router.push).toHaveBeenCalledWith(route);
  });

  it.each([
    ['unauthenticated', null], ['loading', null], ['authenticated', null],
  ] as const)('no navega a datos privados sin una sesión y rol válidos (%s)', async (status, role) => {
    jest.mocked(useAuth).mockReturnValue({ status, role } as ReturnType<typeof useAuth>);
    const { result } = await renderHook(() => useLegalViewModel('privacy'));
    expect(result.current.canManagePrivacy).toBe(false);
    await act(() => result.current.openPrivacyRights());
    expect(router.push).not.toHaveBeenCalled();
  });
});
