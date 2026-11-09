import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { router, useIsFocused } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as WebBrowser from 'expo-web-browser';
import { AppState, type AppStateStatus } from 'react-native';

import {
  createAccessPass,
  getAdminAccessHistory,
  getMyAccessHistory,
} from '@/features/access/api/access-api';
import type { AccessHistoryPage } from '@/features/access/models/access-history';
import { AccessHistoryView } from '@/features/access/views/access-history-view';
import { AccessPassView } from '@/features/access/views/access-pass-view';
import { getAdminUsers } from '@/features/admin/api/admin-api';
import { createMembershipCheckout, getOrderPaymentStatus } from '@/features/memberships/api/checkout-api';
import { getMySubscription , getMembershipPlans } from '@/features/memberships/api/memberships-api';
import { useMembershipPurchase } from '@/features/memberships/viewmodels/use-membership-purchase';
import { MembershipPaymentResultView } from '@/features/memberships/views/membership-payment-result-view';
import { MembershipsView } from '@/features/memberships/views/memberships-view';
import { MembershipCard } from '@/features/home/views/membership-card';
import { ApiError } from '@/types/auth';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useIsFocused: jest.fn(() => true),
}));
jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'idempotency-key' }));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
// El QR se reemplaza por una vista que expone su contenido para poder comprobarlo.
jest.mock('react-native-qrcode-svg', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: string }) => createElement(View, { testID: 'qr', accessibilityValue: { text: value } }),
  };
});
// Objeto estable, como el del proveedor real: un signOut nuevo en cada render recargaría sin fin.
jest.mock('@/hooks/use-auth', () => {
  const auth = {
    status: 'authenticated',
    role: 'cliente',
    user: { id: 'c1', email: '20230008@uthh.edu.mx', rol: 'cliente' },
    signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});
// Solo se simula la red; ViewModels, repositorios y caché son los reales.
jest.mock('@/features/access/api/access-api', () => ({
  createAccessPass: jest.fn(),
  scanAccessCode: jest.fn(),
  getMyAccessHistory: jest.fn(),
  getAdminAccessHistory: jest.fn(),
}));
jest.mock('@/features/admin/api/admin-api', () => ({ getAdminUsers: jest.fn() }));
jest.mock('@/features/memberships/api/memberships-api', () => ({
  getMySubscription: jest.fn(),
  getMembershipPlans: jest.fn(),
  getMembershipPlan: jest.fn(),
}));
jest.mock('@/features/memberships/api/checkout-api', () => ({
  createMembershipCheckout: jest.fn(),
  getOrderPaymentStatus: jest.fn(),
}));

const TOKEN_A = 'hG5Wa8zF1rD0vQ3uN9bK2sC7eL4mP6xT8yJ0aR5dVUw';
const TOKEN_B = 'Zt9Qw2Lx7Pk4Rm1Nv8Bc5Hd3Gf6Js0Ae2Yu4Io7Kl9Mn';
const ORDER_ID = '0d6c3a5e-8f1b-4c2d-9e7a-1b2c3d4e5f60';
const MEMBER_ID = 'b2ec5cc4-2186-4f87-bcff-b2240678f907';

const subscription = {
  planName: 'Titanium',
  durationDays: 30,
  startsAt: '2026-11-03',
  endsAt: '2026-12-02',
  amount: 499,
};

function pass(token: string, secondsLeft = 60) {
  return {
    token,
    expiresAt: new Date(Date.now() + secondsLeft * 1000),
    subscription: { status: 'active', endsAt: '2026-12-02' },
  };
}

function history(entries: AccessHistoryPage['entries'], total = entries.length): AccessHistoryPage {
  return { entries, page: 1, totalPages: entries.length > 0 ? 1 : 0, total };
}

/** Contenido del QR dibujado, o null si no hay QR en pantalla (p. ej. mientras carga). */
function shownQrValue() {
  return (screen.queryByTestId('qr')?.props.accessibilityValue?.text as string | undefined) ?? null;
}

let appStateListeners: ((state: AppStateStatus) => void)[];

// Todo el archivo usa temporizadores falsos: la cuenta regresiva y la consulta del pago
// avanzan solo cuando la prueba lo indica (mezclarlos con reales deja timers colgados).
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(useIsFocused).mockReturnValue(true);
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListeners.push(listener);
    return { remove: jest.fn() };
  });
  jest.mocked(createAccessPass).mockReset();
  jest.mocked(getMySubscription).mockReset().mockResolvedValue(subscription);
  jest.mocked(getMyAccessHistory).mockReset().mockResolvedValue(history([]));
  jest.mocked(getAdminAccessHistory).mockReset().mockResolvedValue(history([]));
  jest.mocked(getAdminUsers).mockReset().mockResolvedValue([]);
  jest.mocked(getOrderPaymentStatus).mockReset();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setAppState(state: AppStateStatus) {
  await act(() => appStateListeners.forEach((listener) => listener(state)));
}

describe('Integración — Mi acceso (cliente)', () => {
  it('muestra el QR del token con el plan y la vigencia, sin exponer el token como texto', async () => {
    jest.mocked(createAccessPass).mockResolvedValue(pass(TOKEN_A));
    jest.mocked(getMyAccessHistory).mockResolvedValue(
      history([{ id: 'h1', userId: 'c1', scannedAt: new Date(2026, 10, 1, 7, 2), granted: true }]),
    );

    await render(<AccessPassView />);

    expect(await screen.findByText('Titanium')).toBeOnTheScreen();
    expect(shownQrValue()).toBe(TOKEN_A);
    expect(createAccessPass).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2 dic 2026')).toBeOnTheScreen();
    expect(screen.getByText('Activa')).toBeOnTheScreen();
    expect(screen.getByText('Socio 20230008')).toBeOnTheScreen();
    expect(screen.getByText(/Último acceso: 1 nov 2026 · 7:02 a\.m\./)).toBeOnTheScreen();
    expect(screen.queryByText(TOKEN_A)).toBeNull();
    expect(usePreventScreenCapture).toHaveBeenCalledWith('access-pass');
  });

  it('renueva el código cuando caduca', async () => {
    jest
      .mocked(createAccessPass)
      .mockResolvedValueOnce(pass(TOKEN_A, 2))
      .mockResolvedValueOnce(pass(TOKEN_B, 60));
    await render(<AccessPassView />);
    await act(async () => {});
    expect(shownQrValue()).toBe(TOKEN_A);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(createAccessPass).toHaveBeenCalledTimes(2);
    expect(shownQrValue()).toBe(TOKEN_B);
  });

  it('descarta el código al mandar la app a segundo plano y pide uno nuevo al volver', async () => {
    jest
      .mocked(createAccessPass)
      .mockResolvedValueOnce(pass(TOKEN_A))
      .mockResolvedValueOnce(pass(TOKEN_B));
    await render(<AccessPassView />);
    await screen.findByText('Titanium');
    expect(shownQrValue()).toBe(TOKEN_A);

    await setAppState('background');
    expect(shownQrValue()).not.toBe(TOKEN_A);

    await setAppState('active');
    await act(async () => {});
    expect(createAccessPass).toHaveBeenCalledTimes(2);
    expect(shownQrValue()).toBe(TOKEN_B);
  });

  it('sin membresía vigente muestra el código desactivado y lleva a renovar', async () => {
    jest
      .mocked(createAccessPass)
      .mockRejectedValue(new ApiError('Se requiere membresía', 403, undefined, 'MEMBERSHIP_REQUIRED'));
    jest.mocked(getMySubscription).mockResolvedValue(null);
    await render(<AccessPassView />);

    expect(await screen.findByText('Inactiva')).toBeOnTheScreen();
    expect(screen.getAllByText('Código desactivado').length).toBeGreaterThan(0);
    expect(shownQrValue()).not.toBe(TOKEN_A);

    await fireEvent.press(screen.getByRole('button', { name: 'Renovar membresía' }));
    expect(router.push).toHaveBeenCalledWith('/memberships');
  });

  it('respeta el tiempo de espera del backend cuando se generan demasiados códigos', async () => {
    const limited = new ApiError('Demasiadas solicitudes', 429, undefined, 'ACCESS_RATE_LIMITED');
    limited.retryAfterSeconds = 30;
    jest.mocked(createAccessPass).mockRejectedValue(limited);
    await render(<AccessPassView />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Espera 30 s/);
    const retry = screen.getByRole('button', { name: /Reintentar en \d+ s/ });
    expect(retry).toBeDisabled();
    await fireEvent.press(retry);
    expect(createAccessPass).toHaveBeenCalledTimes(1);
  });
});

describe('Integración — historial de entradas', () => {
  it('lista las entradas del cliente', async () => {
    jest.mocked(getMyAccessHistory).mockResolvedValue(
      history([{ id: 'h1', userId: 'c1', scannedAt: new Date(2026, 10, 1, 7, 2), granted: true }]),
    );

    await render(<AccessHistoryView mode="client" />);

    expect(await screen.findByText('1 nov 2026 · 7:02 a.m.')).toBeOnTheScreen();
    expect(screen.getByText('Entrada registrada')).toBeOnTheScreen();
    expect(getMyAccessHistory).toHaveBeenCalledWith({ page: 1 });
  });

  it('muestra un estado vacío cuando no hay entradas', async () => {
    await render(<AccessHistoryView mode="client" />);

    expect(await screen.findByText('AÚN NO HAY ENTRADAS')).toBeOnTheScreen();
  });

  it('muestra al administrador el socio de cada entrada', async () => {
    jest.mocked(getAdminAccessHistory).mockResolvedValue(
      history([{ id: 'h1', userId: MEMBER_ID, scannedAt: new Date(2026, 10, 1, 7, 2), granted: true }]),
    );
    jest.mocked(getAdminUsers).mockResolvedValue([
      { id: MEMBER_ID, email: '20230008@uthh.edu.mx', role: 'cliente', isVerified: true },
    ]);

    await render(<AccessHistoryView mode="admin" />);

    expect(await screen.findByText('Socio 20230008')).toBeOnTheScreen();
    expect(screen.getByText('1 nov 2026 · 7:02 a.m. · Entrada registrada')).toBeOnTheScreen();
  });
});

describe('Integración — compra de membresía con Mercado Pago', () => {
  it('abre Mercado Pago y luego la pantalla que verifica el pago de esa orden', async () => {
    jest
      .mocked(createMembershipCheckout)
      .mockResolvedValue({ checkoutUrl: 'https://www.mercadopago.com.mx/checkout', orderId: ORDER_ID });
    jest
      .mocked(WebBrowser.openBrowserAsync)
      .mockResolvedValue({ type: 'opened' } as WebBrowser.WebBrowserResult);
    const { result } = await renderHook(() => useMembershipPurchase('client'));

    await act(() => result.current.buy('42614bdf-4774-4848-9dff-50fe031f7076'));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://www.mercadopago.com.mx/checkout');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/memberships/payment-result',
      params: { orderId: ORDER_ID },
    });
  });

  it('consulta el estado hasta que el servidor aprueba el pago y muestra la membresía activada', async () => {
    jest
      .mocked(getOrderPaymentStatus)
      .mockResolvedValueOnce({ outcome: 'pending', orderNumber: 'ORD-2026-000265', total: 499 })
      .mockResolvedValueOnce({ outcome: 'approved', orderNumber: 'ORD-2026-000265', total: 499 });
    jest.mocked(createAccessPass).mockResolvedValue(pass(TOKEN_A));
    await render(<MembershipPaymentResultView orderId={ORDER_ID} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByText('CONFIRMANDO TU PAGO')).toBeOnTheScreen();
    expect(screen.getByText('ORD-2026-000265')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {});

    expect(screen.getByText('¡MEMBRESÍA ACTIVADA!')).toBeOnTheScreen();
    expect(getOrderPaymentStatus).toHaveBeenCalledWith(ORDER_ID);
    expect(screen.getByText('Vigente del 3 nov 2026 al 2 dic 2026')).toBeOnTheScreen();
    expect(screen.getByText('$499.00')).toBeOnTheScreen();
    expect(shownQrValue()).toBe(TOKEN_A);

    await fireEvent.press(screen.getByRole('button', { name: 'Ver mi acceso' }));
    expect(router.replace).toHaveBeenCalledWith('/account/access');
  });

  it('informa cuando Mercado Pago no aprueba el pago', async () => {
    jest
      .mocked(getOrderPaymentStatus)
      .mockResolvedValue({ outcome: 'rejected', orderNumber: null, total: null });

    await render(<MembershipPaymentResultView orderId={ORDER_ID} />);

    expect(await screen.findByText('PAGO NO APROBADO')).toBeOnTheScreen();
    expect(screen.queryByText('¡MEMBRESÍA ACTIVADA!')).toBeNull();
  });

  it('no consulta nada con un id de orden inválido (p. ej. desde un enlace)', async () => {
    await render(<MembershipPaymentResultView orderId="../../admin" />);

    expect(screen.getByText('PAGO NO ENCONTRADO')).toBeOnTheScreen();
    expect(getOrderPaymentStatus).not.toHaveBeenCalled();
  });

  it('pausa la consulta con la app en segundo plano y deja consultar de nuevo si sigue pendiente', async () => {
    jest
      .mocked(getOrderPaymentStatus)
      .mockResolvedValue({ outcome: 'pending', orderNumber: null, total: null });
    await render(<MembershipPaymentResultView orderId={ORDER_ID} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(getOrderPaymentStatus).toHaveBeenCalledTimes(1);

    await setAppState('background');
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(getOrderPaymentStatus).toHaveBeenCalledTimes(1);

    await setAppState('active');
    for (let attempt = 0; attempt < 25; attempt += 1) {
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
    }

    expect(getOrderPaymentStatus).toHaveBeenCalledTimes(20);
    expect(screen.getByText('PAGO EN PROCESO')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Consultar de nuevo' }));
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(getOrderPaymentStatus).toHaveBeenCalledTimes(21);
  });
});

describe('Integración — plan vigente del cliente', () => {
  it('muestra el plan y sus días restantes arriba de los planes', async () => {
    jest.setSystemTime(new Date(2026, 10, 3, 12, 0));
    jest.mocked(getMembershipPlans).mockResolvedValue([
      {
        id: '42614bdf-4774-4848-9dff-50fe031f7076',
        name: 'Mensual',
        description: '',
        type: 'individual',
        durationDays: 30,
        price: 499,
        pricePerPerson: 499,
        minPeople: 1,
        maxPeople: 1,
        requiresStudentProof: false,
        benefits: [],
        sortOrder: 1,
      },
    ]);

    await render(<MembershipsView area="client" />);

    expect(await screen.findByText('TU PLAN ACTUAL')).toBeOnTheScreen();
    expect(screen.getByText('Titanium')).toBeOnTheScreen();
    expect(screen.getByText('Vigente hasta 2 dic 2026 · 29 días restantes')).toBeOnTheScreen();
    expect(screen.getByText('RENUEVA O CAMBIA DE PLAN')).toBeOnTheScreen();
  });

  it('la tarjeta del inicio muestra el plan en lugar del aviso de próximamente', async () => {
    await render(
      <MembershipCard
        isAuthenticated
        plan={{ name: 'Titanium', validity: 'Vigente hasta 2 dic 2026 · 29 días restantes' }}
        onLogin={jest.fn()}
        onOpenAccess={jest.fn()}
        onOpenMemberships={jest.fn()}
      />,
    );

    expect(screen.getByText('TITANIUM')).toBeOnTheScreen();
    expect(screen.getByText('Vigente hasta 2 dic 2026 · 29 días restantes')).toBeOnTheScreen();
    expect(screen.queryByText(/Próximamente/i)).toBeNull();
  });
});
