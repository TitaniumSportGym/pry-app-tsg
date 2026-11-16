import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { repositoryCache } from '../../src/core/repository/repository-cache';
import { MEMBERSHIP_KEYS } from '../../src/features/memberships/repositories/memberships-repository';
import { MyMembershipView } from '../../src/features/memberships/views/my-membership-view';
import { AuthProvider } from '../../src/providers/auth-provider';
import { apiRequest } from '../../src/services/apiClient';
import { restoreSession } from '../../src/services/authService';

// Respuestas sintéticas con la forma real del backend; sin datos de clientes reales.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../src/services/authService', () => ({
  getCurrentUser: jest.fn(), login: jest.fn(), logout: jest.fn(), restoreSession: jest.fn(), verifyOtp: jest.fn(),
}));
jest.mock('../../src/features/authentication/data/google-auth-gateway', () => ({ openGoogleAuthSession: jest.fn() }));
jest.mock('../../src/services/sessionService', () => ({ removeAccessToken: jest.fn(), saveAccessToken: jest.fn() }));
jest.mock('../../src/services/apiClient', () => ({
  ...jest.requireActual('../../src/services/apiClient'), apiRequest: jest.fn(),
}));
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: (props: object) => createElement(View, props) };
});

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

const subscription = (endsInDays: number) => ({
  ok: true,
  hasActiveSubscription: true,
  subscription: {
    status: 'active',
    startsAt: daysFromToday(endsInDays - 29),
    endsAt: daysFromToday(endsInDays),
    autoRenew: false,
    plan: {
      name: 'Plan de prueba', description: 'Membresía de prueba.', type: 'individual', durationDays: 30,
      maxPeople: 1, accessLevel: 'standard', benefits: ['Acceso al gimnasio', 'Rutinas'],
    },
    payment: {
      amount: '440.00', method: 'online_checkout', paidAt: '2026-11-08T23:47:26.800Z',
      receipt: { folio: 'TSG-TEST-0001', metadata: { orderNumber: 'ORD-TEST-0001' } },
    },
  },
});

async function renderView(response: unknown) {
  jest.mocked(apiRequest).mockResolvedValue(response as never);
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: 'client-test', email: 'cliente@example.test', rol: 'cliente' },
  });
  await render(
    <AuthProvider>
      <MyMembershipView />
    </AuthProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Integración — Más → Mi membresía', () => {
  it('muestra el plan activo con su estado, vigencia, beneficios y pago', async () => {
    await renderView(subscription(20));
    const user = userEvent.setup();

    expect(await screen.findByText('PLAN DE PRUEBA')).toBeOnTheScreen();
    expect(screen.getByLabelText('Estado: Activa')).toBeOnTheScreen();
    expect(screen.getByText('20 días restantes')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: '20 días restantes' })).toBeOnTheScreen();
    expect(screen.getByText('Individual')).toBeOnTheScreen();
    expect(screen.getByText('30 días')).toBeOnTheScreen();
    expect(screen.getByText('Estándar')).toBeOnTheScreen();
    expect(screen.getByText('Acceso al gimnasio')).toBeOnTheScreen();
    expect(screen.getByText('$440.00')).toBeOnTheScreen();
    expect(screen.getByText('TSG-TEST-0001')).toBeOnTheScreen();
    expect(apiRequest).toHaveBeenCalledWith('/api/memberships/me/subscription');

    await user.press(screen.getByRole('button', { name: 'Mi acceso QR' }));
    expect(router.push).toHaveBeenCalledWith('/account/access');
    await user.press(screen.getByRole('button', { name: 'Ver planes de membresía' }));
    expect(router.push).toHaveBeenCalledWith('/memberships');
  });

  it('avisa que está por vencer y propone renovar', async () => {
    await renderView(subscription(3));
    const user = userEvent.setup();

    expect(await screen.findByLabelText('Estado: Por vencer')).toBeOnTheScreen();
    expect(screen.getByText('3 días restantes')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Renovar membresía' }));
    expect(router.push).toHaveBeenCalledWith('/memberships');
  });

  it('sin membresía invita a elegir un plan', async () => {
    await renderView({ ok: true, hasActiveSubscription: false, subscription: null });
    const user = userEvent.setup();

    expect(await screen.findByText('SIN MEMBRESÍA ACTIVA')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ver membresías' }));
    expect(router.push).toHaveBeenCalledWith('/memberships');
  });

  it('se recarga cuando un pago aprobado invalida la membresía', async () => {
    await renderView({ ok: true, hasActiveSubscription: false, subscription: null });
    expect(await screen.findByText('SIN MEMBRESÍA ACTIVA')).toBeOnTheScreen();

    jest.mocked(apiRequest).mockResolvedValue(subscription(30) as never);
    await act(async () => repositoryCache.invalidate(MEMBERSHIP_KEYS.subscription));

    expect(await screen.findByText('PLAN DE PRUEBA')).toBeOnTheScreen();
  });
});
