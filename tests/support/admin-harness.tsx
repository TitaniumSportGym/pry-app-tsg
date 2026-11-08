import { render } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';

import { AuthProvider } from '../../src/providers/auth-provider';
import { apiRequest } from '../../src/services/apiClient';
import { restoreSession } from '../../src/services/authService';
import { adminMember, adminOrder, shippingRates } from './admin-fixtures';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));
jest.mock('../../src/services/authService', () => ({
  getCurrentUser: jest.fn(), login: jest.fn(), logout: jest.fn(),
  restoreSession: jest.fn(), verifyOtp: jest.fn(),
}));
jest.mock('../../src/features/authentication/data/google-auth-gateway', () => ({
  openGoogleAuthSession: jest.fn(),
}));
jest.mock('../../src/services/sessionService', () => ({
  removeAccessToken: jest.fn(), saveAccessToken: jest.fn(),
}));
jest.mock('../../src/services/apiClient', () => ({
  ...jest.requireActual('../../src/services/apiClient'), apiRequest: jest.fn(),
}));
// RN's preset drops RefreshControl props. Keep the native boundary simulated,
// but expose its real event so refresh still executes the viewmodel/repository.
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: (props: object) => createElement(View, props) };
});

export const adminResponses = () => ({
  '/api/admin/users': { users: [adminMember(), adminMember('member-2', false)] },
  '/api/admin/orders?limit=100': { orders: [adminOrder()] },
  '/api/admin/payments?limit=100': { payments: [
    { status: 'paid', date: new Date().toISOString(), netAmount: 629 },
    { status: 'pending', amount: 100 },
  ] },
  '/api/admin/shipping-rates': { rates: shippingRates },
  '/api/admin/products': [{ id: 'product-1' }],
  '/api/admin/routines': { routines: [{ id: 'routine-1' }] },
  '/api/memberships/plans': { plans: [] },
});

export function givenAdminApi(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = { ...adminResponses(), ...overrides };
  jest.mocked(apiRequest).mockReset();
  jest.mocked(apiRequest).mockImplementation(async (path) => {
    if (!(path in responses)) throw new Error(`Unexpected test request: ${path}`);
    const response = responses[path];
    if (response instanceof Error) throw response;
    return response as never;
  });
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: 'admin-test', email: 'admin@example.test', rol: 'administrador' },
  });
  return responses;
}

export function AdminProvider({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function renderAdmin(ui: ReactElement) {
  return render(ui, { wrapper: AdminProvider });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
