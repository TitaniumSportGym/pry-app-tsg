import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Text } from 'react-native';

import { getCartCount } from '../../src/features/cart/models/cart';
import { CheckoutView } from '../../src/features/checkout/views/checkout-view';
import { ProductPaymentResultView } from '../../src/features/checkout/views/product-payment-result-view';
import { AddressFormView } from '../../src/features/delivery/views/address-form-view';
import { OrderDetailView } from '../../src/features/orders/views/order-detail-view';
import { OrdersView } from '../../src/features/orders/views/orders-view';
import { useCart } from '../../src/hooks/use-cart';
import { AuthProvider } from '../../src/providers/auth-provider';
import { CartProvider } from '../../src/providers/cart-provider';
import { apiRequest, type ApiRequestOptions } from '../../src/services/apiClient';
import { restoreSession } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';

// Contratos sintéticos del backend: sin datos de clientes reales ni escrituras reales.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(),
    canGoBack: jest.fn(), canDismiss: jest.fn(), dismissAll: jest.fn(),
  },
  useIsFocused: () => true,
}));
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
jest.mock('expo-linking', () => ({ createURL: (path: string) => `pryapptsg://${path}`, openURL: jest.fn() }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: (props: object) => createElement(View, props) };
});

const ORDER_ID = '3f2b1a0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';
const ADDRESS_ID = '0b6f1c8e-6c1a-4d3e-9a51-1f2b3c4d5e6f';
const CHECKOUT_URL = 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-test';

const pickupLocation = { name: 'Titanium Sport Gym', address: 'Av. Ejemplo 8', phone: '7710000000' };
const address = {
  id: ADDRESS_ID, recipientName: 'Cliente Ejemplo', phone: '7711234567', postalCode: '43000',
  state: 'Hidalgo', municipality: 'Huejutla de Reyes', neighborhood: 'Centro',
  street: 'Calle Ejemplo', exteriorNumber: '12', interiorNumber: null, references: null, isDefault: true,
};
const quote = (overrides: Record<string, unknown> = {}) => ({
  ok: true, subtotal: '1098.00', discountTotal: '0', taxTotal: '151.45', shippingTotal: '0',
  total: '1098.00', quoteToken: 'quote-1', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  ...overrides,
});
const order = (fulfillment: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID, orderNumber: '8F2K71', status: 'paid', createdAt: '2026-11-03T18:10:00.000Z',
  subtotal: '1098.00', taxTotal: '151.45', shippingTotal: '0', total: '1098.00',
  items: [{ id: 'i1', itemType: 'product', productId: 101, quantity: 2, unitPrice: '549.00', productName: 'Creatina de prueba' }],
  payments: [{ id: 'p1', amount: '1098.00', status: 'approved', paidAt: '2026-11-03T18:12:00.000Z' }],
  fulfillment: { method: 'pickup', recipientName: 'Cliente Ejemplo', phone: '7711234567', events: [], ...fulfillment },
  ...overrides,
});

type Handler = (path: string, options: ApiRequestOptions) => unknown;

function givenApi(routes: Record<string, unknown | Handler>) {
  jest.mocked(apiRequest).mockImplementation(async (path, options = {}) => {
    const key = `${options.method ?? 'GET'} ${path}`;
    if (!(key in routes)) throw new Error(`Petición inesperada en la prueba: ${key}`);
    const route = routes[key];
    const response = typeof route === 'function' ? (route as Handler)(path, options) : route;
    if (response instanceof Error) throw response;
    return response as never;
  });
}

function calls(key: string) {
  return jest.mocked(apiRequest).mock.calls.filter(([path, options]) => `${options?.method ?? 'GET'} ${path}` === key);
}

/** Pone 2 piezas de un producto en el carrito en cuanto hay sesión, y muestra cuántas quedan. */
function WithCart({ children }: { children: ReactElement }) {
  const cart = useCart();
  const seeded = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!cart.isAvailable || seeded.current) return;
    seeded.current = true;
    cart.add({ productId: 101, name: 'Creatina de prueba', price: 549, imageUrl: null, detail: '', stock: 5 }, 2);
    setReady(true);
  }, [cart]);
  return (
    <>
      <Text>{`piezas en carrito: ${getCartCount(cart.items)}`}</Text>
      {ready ? children : null}
    </>
  );
}

async function renderWithCart(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: 'client-test', email: 'cliente@example.test', rol: 'cliente' },
  });
  await render(
    <AuthProvider>
      <CartProvider>
        <WithCart>{ui}</WithCart>
      </CartProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  // clearAllMocks conserva los mocks propios de React Native (AppState, etc.).
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(true);
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: 'cancel' } as never);
});

describe('Integración — comprar productos', () => {
  it('recoge en gimnasio: cotiza con quién recoge y paga con Mercado Pago sin enviar precios', async () => {
    givenApi({
      'GET /api/delivery/options': { ok: true, pickupLocation },
      'GET /api/addresses/me': { ok: true, addresses: [] },
      'POST /api/checkout/product-quote': quote(),
      'POST /api/checkout/products/mercadopago': { orderId: ORDER_ID, preferenceId: 'pref-test', checkoutUrl: CHECKOUT_URL },
    });
    await renderWithCart(<CheckoutView />);
    const user = userEvent.setup();

    expect(await screen.findByText('Punto de recogida')).toBeOnTheScreen();
    expect(screen.getByText('Escribe quién recoge para calcular el total.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pagar con Mercado Pago' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nombre completo'), 'Cliente Ejemplo');
    await user.type(screen.getByLabelText('Teléfono'), '7711234567');

    expect((await screen.findAllByText('$1,098.00')).length).toBeGreaterThan(0);
    expect(screen.getByText('IVA incluido')).toBeOnTheScreen();
    expect(calls('POST /api/checkout/product-quote').at(-1)?.[1]?.body).toEqual({
      items: [{ productId: 101, quantity: 2 }],
      fulfillment: { method: 'pickup', recipientName: 'Cliente Ejemplo', phone: '7711234567' },
    });

    await user.press(screen.getByRole('button', { name: 'Pagar con Mercado Pago' }));

    await waitFor(() =>
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(CHECKOUT_URL, expect.stringContaining('cart/payment-result')),
    );
    const body = calls('POST /api/checkout/products/mercadopago')[0][1]?.body as Record<string, unknown>;
    expect(body).toEqual({
      idempotencyKey: expect.any(String),
      items: [{ productId: 101, quantity: 2 }],
      fulfillment: { method: 'pickup', recipientName: 'Cliente Ejemplo', phone: '7711234567' },
      quoteToken: 'quote-1',
      client: 'mobile',
    });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/cart/payment-result', params: { orderId: ORDER_ID } });
    // El carrito no se vacía hasta que el servidor confirme el pago.
    expect(screen.getByText('piezas en carrito: 2')).toBeOnTheScreen();
  });

  it('sin recogida disponible usa la dirección predeterminada y muestra el mensaje del backend si no hay tarifa', async () => {
    givenApi({
      'GET /api/delivery/options': { ok: true, pickupLocation: null },
      'GET /api/addresses/me': { ok: true, addresses: [address] },
      'POST /api/checkout/product-quote': new ApiError('No hay tarifa de envío para el código postal 43000.', 422),
    });
    await renderWithCart(<CheckoutView />);

    expect(await screen.findByText('No disponible')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Recoger en gimnasio/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Calle Ejemplo 12/ })).toBeChecked();
    expect(await screen.findByText('No pudimos cotizar el envío')).toBeOnTheScreen();
    expect(screen.getByText('No hay tarifa de envío para el código postal 43000.')).toBeOnTheScreen();
    expect(calls('POST /api/checkout/product-quote')[0][1]?.body).toEqual({
      items: [{ productId: 101, quantity: 2 }],
      fulfillment: { method: 'delivery', addressId: ADDRESS_ID },
    });
    expect(screen.getByRole('button', { name: 'Pagar con Mercado Pago' })).toBeDisabled();
  });

  it('pide una cotización nueva cuando la anterior venció', async () => {
    givenApi({
      'GET /api/delivery/options': { ok: true, pickupLocation: null },
      'GET /api/addresses/me': { ok: true, addresses: [address] },
      'POST /api/checkout/product-quote': () =>
        calls('POST /api/checkout/product-quote').length === 1
          ? quote({ shippingTotal: '149.00', total: '1247.00', expiresAt: new Date(Date.now() - 1000).toISOString() })
          : quote({ shippingTotal: '149.00', total: '1247.00', quoteToken: 'quote-2' }),
    });
    await renderWithCart(<CheckoutView />);
    const user = userEvent.setup();

    expect(await screen.findByText(/La cotización venció/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Actualizar costo de envío' }));

    expect(await screen.findByText(/Cotización válida por/)).toBeOnTheScreen();
    expect(calls('POST /api/checkout/product-quote')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Pagar con Mercado Pago' })).toBeEnabled();
  });
});

describe('Integración — resultado del pago de productos', () => {
  it('confirma el pago solo con la respuesta del servidor y entonces vacía el carrito', async () => {
    givenApi({
      [`GET /api/orders/${ORDER_ID}/payment-status`]: {
        order: { status: 'paid', orderNumber: '8F2K71', total: '1098.00' },
        payment: { status: 'paid' },
      },
      [`GET /api/orders/${ORDER_ID}`]: { ok: true, order: order({ status: 'payment_confirmed' }) },
    });
    await renderWithCart(<ProductPaymentResultView orderId={ORDER_ID} />);

    expect(await screen.findByText('¡PAGO CONFIRMADO!')).toBeOnTheScreen();
    expect(await screen.findByText('Recoger en gimnasio')).toBeOnTheScreen();
    expect(screen.getByText('piezas en carrito: 0')).toBeOnTheScreen();
  });

  it('si Mercado Pago rechaza el pago, conserva el carrito para reintentar', async () => {
    givenApi({
      [`GET /api/orders/${ORDER_ID}/payment-status`]: {
        order: { status: 'pending', orderNumber: '8F2K71', total: '1098.00' },
        payment: { status: 'rejected' },
      },
      [`GET /api/orders/${ORDER_ID}`]: { ok: true, order: order({ status: 'awaiting_payment' }, { status: 'pending' }) },
    });
    await renderWithCart(<ProductPaymentResultView orderId={ORDER_ID} />);
    const user = userEvent.setup();

    expect(await screen.findByText('PAGO RECHAZADO')).toBeOnTheScreen();
    expect(screen.getByText('piezas en carrito: 2')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar pago' }));
    expect(router.replace).toHaveBeenCalledWith('/cart/checkout');
  });
});

describe('Integración — mis pedidos y seguimiento', () => {
  it('lista los pedidos de productos con su estado y abre el seguimiento', async () => {
    givenApi({
      'GET /api/orders/me?productOnly=true&page=1&limit=50': {
        ok: true,
        orders: [order({ method: 'delivery', status: 'shipped', addressSnapshot: address })],
      },
    });
    await renderWithCart(<OrdersView />);
    const user = userEvent.setup();

    expect(await screen.findByText('Pedido #8F2K71')).toBeOnTheScreen();
    expect(screen.getByText('Enviado')).toBeOnTheScreen();
    expect(screen.getByText('2 productos')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: /Pedido #8F2K71/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/account/orders/[id]', params: { id: ORDER_ID } });
  });

  it('muestra la línea de tiempo con la guía y permite cancelar un pedido pendiente de pago', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    givenApi({
      'GET /api/delivery/options': { ok: true, pickupLocation },
      [`GET /api/orders/${ORDER_ID}`]: {
        ok: true,
        order: order({ method: 'delivery', status: 'awaiting_payment', addressSnapshot: address }, { status: 'pending', payments: [] }),
      },
      [`POST /api/orders/${ORDER_ID}/cancel`]: { ok: true },
    });
    await renderWithCart(<OrderDetailView orderId={ORDER_ID} />);
    const user = userEvent.setup();

    expect(await screen.findByText('PENDIENTE DE PAGO')).toBeOnTheScreen();
    expect(screen.getByText('Seguimiento')).toBeOnTheScreen();
    expect(screen.getByText('Calle Ejemplo 12, Col. Centro, Huejutla de Reyes, Hidalgo · CP 43000')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await waitFor(() => expect(calls(`POST /api/orders/${ORDER_ID}/cancel`)).toHaveLength(1));
  });

  it('un pedido enviado muestra paquetería y número de guía', async () => {
    givenApi({
      'GET /api/delivery/options': { ok: true, pickupLocation: null },
      [`GET /api/orders/${ORDER_ID}`]: {
        ok: true,
        order: order({
          method: 'delivery', status: 'shipped', addressSnapshot: address,
          carrier: 'Estafeta', trackingNumber: '701234567890',
          events: [{ status: 'shipped', createdAt: '2026-11-04T19:20:00.000Z' }],
        }),
      },
    });
    await renderWithCart(<OrderDetailView orderId={ORDER_ID} />);

    expect(await screen.findByText('ENVIADO')).toBeOnTheScreen();
    expect(screen.getByText('701234567890')).toBeOnTheScreen();
    expect(screen.getByText('Estafeta · Guía 701234567890')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull();
  });
});

describe('Integración — direcciones', () => {
  it('valida antes de enviar y guarda la dirección con el contrato del backend', async () => {
    givenApi({ 'POST /api/addresses/me': { ok: true, address: { ...address, isDefault: false } } });
    await renderWithCart(<AddressFormView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Guardar dirección' }));
    expect(screen.getByText('Escribe un código postal de 5 dígitos.')).toBeOnTheScreen();
    expect(calls('POST /api/addresses/me')).toHaveLength(0);

    await user.type(screen.getByLabelText('Nombre de quien recibe'), 'Cliente Ejemplo');
    await user.type(screen.getByLabelText('Teléfono'), '771-123-4567');
    await user.type(screen.getByLabelText('Código postal'), '06000');
    await user.type(screen.getByLabelText('Estado'), 'Hidalgo');
    await user.type(screen.getByLabelText('Municipio'), 'Huejutla de Reyes');
    await user.type(screen.getByLabelText('Colonia'), 'Centro');
    await user.type(screen.getByLabelText('Calle'), 'Calle Ejemplo');
    await user.type(screen.getByLabelText('No. exterior'), '12');
    await user.type(screen.getByLabelText('Referencias'), 'Portón negro');
    await user.press(screen.getByRole('button', { name: 'Guardar dirección' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(calls('POST /api/addresses/me')[0][1]?.body).toEqual({
      recipientName: 'Cliente Ejemplo', phone: '7711234567', postalCode: '06000', state: 'Hidalgo',
      municipality: 'Huejutla de Reyes', neighborhood: 'Centro', street: 'Calle Ejemplo',
      exteriorNumber: '12', interiorNumber: null, references: 'Portón negro', isDefault: false,
    });
  });
});
