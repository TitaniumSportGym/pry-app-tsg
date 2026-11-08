import { AdminProvider, deferred, givenAdminApi, renderAdmin } from '../support/admin-harness';

import { act, fireEvent, renderHook, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { repositoryCache } from '../../src/core/repository/repository-cache';
import { NETWORK_ERROR_MESSAGE } from '../../src/features/authorization/models/access-errors';
import { useAdminHomeViewModel } from '../../src/features/admin/viewmodels/use-admin-home-view-model';
import { AdminHomeView } from '../../src/features/admin/views/admin-home-view';
import { AdminMembersView } from '../../src/features/admin/views/admin-members-view';
import { AdminMoreView } from '../../src/features/admin/views/admin-more-view';
import { AdminOrdersView } from '../../src/features/admin/views/admin-orders-view';
import { AdminPaymentsView } from '../../src/features/admin/views/admin-payments-view';
import { AdminUsersView } from '../../src/features/admin/views/admin-users-view';
import { PickupPointView } from '../../src/features/admin/views/pickup-point-view';
import { ShippingRatesView } from '../../src/features/admin/views/shipping-rates-view';
import { UpdateDeliveryView } from '../../src/features/admin/views/update-delivery-view';
import { apiRequest } from '../../src/services/apiClient';
import { logout, restoreSession } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';
import { adminMember, adminOrder } from '../support/admin-fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'order-1' })),
}));

const ordersPath = '/api/admin/orders?limit=100';
const usersPath = '/api/admin/users';
const ratesPath = '/api/admin/shipping-rates';

// Pull-to-refresh has no accessibility query; locate the real native control by
// its event prop, then dispatch that event through RNTL.
const refreshControl = () => screen.container.queryAll(node => typeof node.props.onRefresh === 'function')[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(false);
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'order-1' });
  givenAdminApi();
});
afterEach(() => jest.restoreAllMocks());

describe('Admin home: real view, viewmodel, repository and API adapter', () => {
  it('loads real totals, marks sample blocks and opens each pending destination', async () => {
    await renderAdmin(<AdminHomeView />);
    expect(await screen.findByText('Hola, Admin')).toBeOnTheScreen();
    expect(await screen.findByText('$629')).toBeOnTheScreen();
    expect(screen.getByText('1 pago')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Datos de ejemplo')).toHaveLength(4);
    expect(screen.getByText('Denegado')).toBeOnTheScreen();
    const user = userEvent.setup();
    for (const [name, route] of [
      ['Pedidos por preparar', '/admin/orders'], ['Listos para recoger', '/admin/orders'],
      ['Envíos sin guía', '/admin/orders'], ['Pagos pendientes', '/admin/account/payments'],
    ]) {
      await user.press(screen.getByRole('button', { name: new RegExp(`^${name},`) }));
      expect(router.push).toHaveBeenLastCalledWith(route);
    }
    expect(apiRequest).toHaveBeenCalledWith(ordersPath);
  });

  it('uses placeholders while loading, then zeroes and plural payments for an empty dashboard', async () => {
    const pending = deferred<unknown>();
    jest.mocked(apiRequest).mockImplementation(() => pending.promise as never);
    await renderAdmin(<AdminHomeView />);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Cargando…')).toBeOnTheScreen();
    await act(async () => pending.resolve({ orders: [], payments: [] }));
    expect(await screen.findByText('$0')).toBeOnTheScreen();
    expect(screen.getByText('0 pagos')).toBeOnTheScreen();
  });

  it('recovers from a network failure and refreshes cached totals', async () => {
    const responses = givenAdminApi({ [ordersPath]: new Error('offline') });
    await renderAdmin(<AdminHomeView />);
    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeOnTheScreen();
    responses[ordersPath] = { orders: [adminOrder()] };
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$629')).toBeOnTheScreen();
    responses['/api/admin/payments?limit=100'] = { payments: [] };
    await fireEvent(refreshControl(), 'refresh');
    expect(await screen.findByText('$0')).toBeOnTheScreen();
  });

  it('has a safe profile fallback without a restored user', async () => {
    jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
    const { result } = await renderHook(useAdminHomeViewModel, { wrapper: AdminProvider });
    await waitFor(() => expect(result.current.stats.salesToday.value).toBe('$629'));
    expect(result.current.greeting).toBe('Hola, Administrador');
    expect(result.current.initials).toBe('AD');
  });
});

describe('Admin orders', () => {
  it('filters every logistics group, searches, opens a real order and keeps terminal orders read-only', async () => {
    givenAdminApi({ [ordersPath]: { orders: [
      adminOrder(), adminOrder('prep', 'preparing', 'pickup', ['ready_for_pickup']),
      adminOrder('ready', 'ready_for_pickup', 'pickup', ['picked_up']),
      adminOrder('packed', 'packed', 'delivery', ['shipped']),
      adminOrder('shipped', 'shipped', 'delivery', []),
      { ...adminOrder('incident', 'incident', 'delivery', []), paidAt: null, items: [{ quantity: 1 }] },
    ] } });
    await renderAdmin(<AdminOrdersView />);
    expect(await screen.findByText('Pedido #TEST-order-1')).toBeOnTheScreen();
    expect(screen.getByText('Compras de productos · 6 activos')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Marcar en preparación' }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/admin/delivery/[id]', params: { id: 'order-1' } });
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por pedido o cliente'), 'missing');
    expect(screen.getByText('SIN RESULTADOS')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por pedido o cliente'), 'TEST-order-1');
    expect(screen.getByText('Pedido #TEST-order-1')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por pedido o cliente'), '');
    for (const [label, id] of [
      ['En preparación', 'prep'], ['Por recoger', 'ready'], ['Por enviar', 'packed'],
      ['Enviados', 'shipped'], ['Incidencias', 'incident'],
    ]) {
      await user.press(screen.getByRole('button', { name: `${label} · 1` }));
      expect(screen.getByText(`Pedido #TEST-${id}`)).toBeOnTheScreen();
    }
    expect(screen.getByText('Sin pago')).toBeOnTheScreen();
    expect(screen.getByText('1 producto')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Marcar/ })).toBeNull();
    await user.press(screen.getByRole('button', { name: /Pedido #TEST-incident/ }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/admin/delivery/[id]', params: { id: 'incident' } });
  });

  it('paginates orders and returns to page one when searching', async () => {
    givenAdminApi({ [ordersPath]: { orders: Array.from({ length: 11 }, (_, i) => adminOrder(`o-${i}`)) } });
    await renderAdmin(<AdminOrdersView />);
    expect(await screen.findByText('Mostrando 1–10 de 11 pedidos')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('Pedido #TEST-o-10')).toBeOnTheScreen();
    expect(screen.getByText('Mostrando 11–11 de 11 pedidos')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por pedido o cliente'), 'TEST-o-0');
    expect(screen.getByText('Pedido #TEST-o-0')).toBeOnTheScreen();
    expect(screen.queryByText('Pedido #TEST-o-10')).toBeNull();
  });

  it('delays its skeleton and shows an honest empty state after loading', async () => {
    const pending = deferred<unknown>();
    jest.mocked(apiRequest).mockImplementation(() => pending.promise as never);
    await renderAdmin(<AdminOrdersView />);
    expect(screen.queryByText('TODO AL DÍA')).toBeNull();
    expect(await screen.findByLabelText('Cargando pedidos')).toBeOnTheScreen();
    await act(async () => pending.resolve({ orders: [] }));
    expect(await screen.findByText('TODO AL DÍA')).toBeOnTheScreen();
    expect(screen.getByText('No hay pedidos en este estado.')).toBeOnTheScreen();
  });

  it('retries errors, pulls fresh orders, observes invalidation and reuses data on remount', async () => {
    const responses = givenAdminApi({ [ordersPath]: new Error('offline') });
    const view = await renderAdmin(<AdminOrdersView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    responses[ordersPath] = { orders: [adminOrder()] };
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Compras de productos · 1 activo')).toBeOnTheScreen();
    const pending = deferred<unknown>();
    jest.mocked(apiRequest).mockImplementationOnce(() => pending.promise as never);
    await fireEvent(refreshControl(), 'refresh');
    expect(refreshControl().props.refreshing).toBe(true);
    await act(async () => pending.resolve({ orders: [adminOrder('fresh')] }));
    expect(await screen.findByText('Pedido #TEST-fresh')).toBeOnTheScreen();
    expect(refreshControl().props.refreshing).toBe(false);
    await act(async () => repositoryCache.invalidate('admin:orders'));
    expect(await screen.findByText('Pedido #TEST-order-1')).toBeOnTheScreen();
    const count = jest.mocked(apiRequest).mock.calls.length;
    await view.unmount();
    await renderAdmin(<AdminOrdersView />);
    expect(await screen.findByText('Pedido #TEST-order-1')).toBeOnTheScreen();
    expect(apiRequest).toHaveBeenCalledTimes(count);
  });
});

describe('Admin members', () => {
  it('displays only customers with real verification and dates, searches and clears search', async () => {
    givenAdminApi({ [usersPath]: { users: [adminMember(), { ...adminMember('member-2', false), createdAt: null }, { ...adminMember('coach'), role: 'entrenador' }] } });
    await renderAdmin(<AdminMembersView />);
    expect(await screen.findByLabelText('2 Registrados')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 Verificados')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 Sin verificar')).toBeOnTheScreen();
    expect(screen.getByText('Alta: 1 nov 2026')).toBeOnTheScreen();
    expect(screen.getByText('Alta sin fecha')).toBeOnTheScreen();
    expect(screen.queryByText('coach@example.test')).toBeNull();
    expect(screen.getByRole('button', { name: 'Agregar socio, próximamente' })).toBeDisabled();
    const search = screen.getByPlaceholderText('Número de socio o correo');
    await fireEvent.changeText(search, 'MEMBER-2@EXAMPLE.TEST');
    expect(screen.getByText('member-2@example.test')).toBeOnTheScreen();
    expect(screen.queryByText('member-1@example.test')).toBeNull();
    await fireEvent.changeText(search, 'unknown');
    expect(screen.getByText('SIN RESULTADOS')).toBeOnTheScreen();
    await fireEvent.changeText(search, '');
    expect(screen.getByText('member-1@example.test')).toBeOnTheScreen();
  });

  it('paginates members and resets the page when the query changes', async () => {
    givenAdminApi({ [usersPath]: { users: Array.from({ length: 21 }, (_, i) => adminMember(`member-${i}`)) } });
    await renderAdmin(<AdminMembersView />);
    expect(await screen.findByText('Mostrando 1–20 de 21 socios')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('member-20@example.test')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Número de socio o correo'), 'member-0');
    expect(screen.getByText('member-0@example.test')).toBeOnTheScreen();
    expect(screen.queryByText('member-20@example.test')).toBeNull();
  });

  it('loads a skeleton, then shows no registered members', async () => {
    const pending = deferred<unknown>();
    jest.mocked(apiRequest).mockImplementation(() => pending.promise as never);
    await renderAdmin(<AdminMembersView />);
    expect(screen.queryByText('SIN SOCIOS')).toBeNull();
    expect(await screen.findByLabelText('Cargando socios')).toBeOnTheScreen();
    await act(async () => pending.resolve({ users: [] }));
    expect(await screen.findByText('SIN SOCIOS')).toBeOnTheScreen();
    expect(screen.getByText('Aún no hay socios registrados.')).toBeOnTheScreen();
  });

  it('retries network errors and refreshes members', async () => {
    const responses = givenAdminApi({ [usersPath]: new Error('offline') });
    await renderAdmin(<AdminMembersView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    responses[usersPath] = { users: [adminMember()] };
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('member-1@example.test')).toBeOnTheScreen();
    responses[usersPath] = { users: [] };
    await fireEvent(refreshControl(), 'refresh');
    expect(await screen.findByText('SIN SOCIOS')).toBeOnTheScreen();
  });
});

describe('Protected admin resources', () => {
  it.each([
    [403, 'No tienes permisos para consultar esta información.', false],
    [401, 'Tu sesión expiró. Inicia sesión de nuevo.', true],
  ] as const)('handles HTTP %s without confusing permissions and expiry', async (status, message, signsOut) => {
    givenAdminApi({ [usersPath]: new ApiError('Rejected', status) });
    await renderAdmin(<AdminMembersView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    if (signsOut) expect(logout).toHaveBeenCalledTimes(1);
    else expect(logout).not.toHaveBeenCalled();
  });
});

describe('Shipping rates', () => {
  it('shows active and inactive real rates, postal codes and prices, with editing disabled', async () => {
    await renderAdmin(<ShippingRatesView />);
    expect(await screen.findByText('Zona de prueba')).toBeOnTheScreen();
    expect(screen.getByText('43000')).toBeOnTheScreen();
    expect(screen.getByText('43999')).toBeOnTheScreen();
    expect(screen.getByText('$230.00')).toBeOnTheScreen();
    expect(screen.getByText('Inactiva')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: /Zona de prueba/ }).props.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Nueva tarifa' })).toBeDisabled();
    expect(screen.getByText('Gratis')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/account');
  });

  it('loads, reports errors, retries and refreshes to empty', async () => {
    const pending = deferred<unknown>();
    const responses = givenAdminApi();
    jest.mocked(apiRequest).mockImplementationOnce(() => pending.promise as never);
    await renderAdmin(<ShippingRatesView />);
    expect(screen.getByText('Cargando tarifas…')).toBeOnTheScreen();
    await act(async () => pending.reject(new Error('offline')));
    expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Zona de prueba')).toBeOnTheScreen();
    responses[ratesPath] = { rates: [] };
    await fireEvent(refreshControl(), 'refresh');
    expect(await screen.findByText('SIN TARIFAS')).toBeOnTheScreen();
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('Delivery form', () => {
  it('offers only server-authorized transitions, edits shipment fields and never pretends to save', async () => {
    givenAdminApi({ [ordersPath]: { orders: [adminOrder('order-1', 'packed', 'delivery', ['shipped', 'incident', 'cancelled'])] } });
    await renderAdmin(<UpdateDeliveryView />);
    expect(await screen.findByText('Pedido #TEST-order-1 · Socio de Prueba')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Enviado/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Entregado/ })).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'DHL' }));
    expect(screen.getByRole('button', { name: 'DHL' })).toBeSelected();
    const tracking = screen.getByLabelText('Número de guía');
    await user.type(tracking, 'TEST123');
    expect(tracking).toHaveDisplayValue('TEST123');
    expect(tracking.props.maxLength).toBe(40);
    await user.type(screen.getByLabelText('Nota interna'), 'Entregar por la tarde');
    expect(screen.getByLabelText('Nota interna')).toHaveDisplayValue('Entregar por la tarde');
    await user.press(screen.getByRole('radio', { name: /Incidencia/ }));
    expect(screen.getByRole('radio', { name: /Incidencia/ })).toBeChecked();
    expect(screen.queryByLabelText('Número de guía')).toBeNull();
    await user.press(screen.getByRole('radio', { name: /Cancelado/ }));
    expect(screen.getByRole('radio', { name: /Cancelado/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled();
    expect(screen.getByText('Guardar estará disponible cuando el backend lo permita.')).toBeOnTheScreen();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(ordersPath);
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/orders');
  });

  it('preselects the next ordinary step and goes back through navigation history', async () => {
    await renderAdmin(<UpdateDeliveryView />);
    expect(await screen.findByRole('radio', { name: /En preparación/ })).toBeChecked();
    expect(screen.queryByText('Datos del envío')).toBeNull();
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps a terminal order without transition options', async () => {
    givenAdminApi({ [ordersPath]: { orders: [adminOrder('order-1', 'delivered', 'delivery', [])] } });
    await renderAdmin(<UpdateDeliveryView />);
    expect(await screen.findByText('Este pedido ya no tiene cambios de estado disponibles.')).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Guardar estado' })).toBeDisabled();
  });

  it('loads, retries a failed request, and explains a missing recent order', async () => {
    const pending = deferred<unknown>();
    givenAdminApi({ [ordersPath]: { orders: [] } });
    jest.mocked(apiRequest).mockImplementationOnce(() => pending.promise as never);
    await renderAdmin(<UpdateDeliveryView />);
    expect(screen.getByText('Cargando pedido…')).toBeOnTheScreen();
    await act(async () => pending.reject(new Error('offline')));
    expect(await screen.findByRole('alert')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este pedido ya no aparece entre los recientes.');
  });
});

describe('Pickup point local form', () => {
  it('edits every field, sanitizes postal codes, toggles availability and identifies sample hours', async () => {
    await renderAdmin(<PickupPointView />);
    const user = userEvent.setup();
    for (const [label, value] of [
      ['Nombre', 'Recepción de prueba'], ['Dirección', 'Calle de prueba 1'],
      ['Municipio', 'Huejutla'], ['Teléfono', '7711234567'], ['Instrucciones para el cliente', 'Presentar identificación'],
    ]) {
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, value);
      expect(field).toHaveDisplayValue(value);
    }
    await fireEvent.changeText(screen.getByLabelText('CP'), '43a00');
    expect(screen.getByLabelText('CP')).toHaveDisplayValue('4300');
    await fireEvent(screen.getByRole('switch', { name: 'Recogida disponible' }), 'valueChange', false);
    expect(screen.getByRole('switch', { name: 'Recogida disponible' }).props.value).toBe(false);
    expect(screen.getByLabelText('Datos de ejemplo')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(apiRequest).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/account');
  });

  it('returns through history when available', async () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await renderAdmin(<PickupPointView />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('Admin more and placeholders', () => {
  it('loads counts, opens supported destinations and disables unfinished menus', async () => {
    await renderAdmin(<AdminMoreView />);
    expect(await screen.findByText('admin@example.test')).toBeOnTheScreen();
    expect(await screen.findByText('1 activa')).toBeOnTheScreen();
    const user = userEvent.setup();
    for (const [label, route] of [['Tarifas de envío', '/admin/shipping-rates'], ['Punto de recogida', '/admin/pickup-point'], ['Pagos', '/admin/account/payments']]) {
      await user.press(screen.getByRole('button', { name: label }));
      expect(router.push).toHaveBeenLastCalledWith(route);
    }
    for (const label of ['Productos', 'Planes de membresía', 'Comprobantes', 'Rutinas', 'Clases y horarios', 'Configuración']) {
      expect(screen.getByRole('button', { name: `${label}, próximamente` })).toBeDisabled();
    }
  });

  it('keeps navigation available when counters fail, with a profile fallback', async () => {
    givenAdminApi({ '/api/admin/products': new Error('offline') });
    jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
    await renderAdmin(<AdminMoreView />);
    expect(await screen.findByText('Administrador')).toBeOnTheScreen();
    expect(screen.queryByText('1 activa')).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Tarifas de envío' }));
    expect(router.push).toHaveBeenCalledWith('/admin/shipping-rates');
  });

  it('confirms logout and disables the button while the real provider signs out', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const pending = deferred<void>();
    jest.mocked(logout).mockReturnValue(pending.promise);
    await renderAdmin(<AdminMoreView />);
    await screen.findByText('admin@example.test');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).not.toHaveBeenCalled();
    const confirm = alert.mock.lastCall![2]!.find(button => button.text === 'Cerrar sesión')!;
    await act(async () => confirm.onPress!());
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled();
    await act(async () => pending.resolve());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it.each([['users', AdminUsersView], ['payments', AdminPaymentsView]] as const)('clearly labels the %s placeholder', async (_name, Component) => {
    await renderAdmin(<Component />);
    expect(screen.getByText('Sección en preparación')).toBeOnTheScreen();
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
