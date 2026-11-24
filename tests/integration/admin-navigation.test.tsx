import { AdminProvider, givenAdminApi } from '../support/admin-harness';

import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import AdminLayout from '../../src/app/admin/_layout';
import AdminTabsLayout from '../../src/app/admin/(tabs)/_layout';
import AdminHomeScreen from '../../src/app/admin/(tabs)/index';
import AdminOrdersScreen from '../../src/app/admin/(tabs)/orders';
import AdminUsersScreen from '../../src/app/admin/(tabs)/users';
import AdminMoreScreen from '../../src/app/admin/(tabs)/account/index';
import AdminAccountLayout from '../../src/app/admin/(tabs)/account/_layout';
import AdminPaymentsScreen from '../../src/app/admin/(tabs)/account/payments';
import DeliveryScreen from '../../src/app/admin/delivery/[id]';
import PickupScreen from '../../src/app/admin/pickup-point';
import RatesScreen from '../../src/app/admin/shipping-rates';
import { AppTabBar } from '../../src/components/navigation/app-tab-bar';
import { CLIENT_TABS } from '../../src/features/navigation/models/role-tabs';

const routes = {
  'admin/_layout': AdminLayout,
  'admin/(tabs)/_layout': AdminTabsLayout,
  'admin/(tabs)/index': AdminHomeScreen,
  'admin/(tabs)/orders': AdminOrdersScreen,
  'admin/(tabs)/users': AdminUsersScreen,
  'admin/(tabs)/account/index': AdminMoreScreen,
  'admin/(tabs)/account/_layout': AdminAccountLayout,
  'admin/(tabs)/account/payments': AdminPaymentsScreen,
  'admin/delivery/[id]': DeliveryScreen,
  'admin/pickup-point': PickupScreen,
  'admin/shipping-rates': RatesScreen,
  // Native camera behavior is covered separately in access-scanner.test.tsx.
  'admin/scan': () => <Text>Camera destination</Text>,
};

beforeEach(() => {
  jest.clearAllMocks();
  givenAdminApi();
});

it('navigates the real admin tabs, order detail, menus and full-screen scanner', async () => {
  await renderRouter(routes, { initialUrl: '/admin', wrapper: AdminProvider });
  expect(await screen.findByText('Hola, Admin')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Inicio' })).toBeSelected();
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: 'Pedidos' }));
  await waitFor(() => expect(screen).toHavePathname('/admin/orders'));
  await user.press(await screen.findByRole('button', { name: 'Marcar en preparación' }));
  await waitFor(() => expect(screen).toHavePathname('/admin/delivery/order-1'));
  expect(await screen.findByRole('header', { name: 'ACTUALIZAR ENTREGA' })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen).toHavePathname('/admin/orders'));
  await user.press(screen.getByRole('tab', { name: 'Socios' }));
  expect(await screen.findByText('member-1@example.test')).toBeOnTheScreen();
  expect(screen).toHavePathname('/admin/users');
  await user.press(screen.getByRole('tab', { name: 'Más' }));
  expect(await screen.findByText('admin@example.test')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Tarifas de envío' }));
  expect(await screen.findByText('Zona de prueba')).toBeOnTheScreen();
  expect(screen).toHavePathname('/admin/shipping-rates');
  await user.press(screen.getByRole('button', { name: 'Regresar' }));
  await user.press(screen.getByRole('button', { name: 'Punto de recogida' }));
  expect(await screen.findByRole('header', { name: 'PUNTO DE RECOGIDA' })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Regresar' }));
  await user.press(screen.getByRole('button', { name: 'Pagos' }));
  expect(await screen.findByText('Sección en preparación')).toBeOnTheScreen();
  expect(screen).toHavePathname('/admin/account/payments');
  await user.press(screen.getByRole('tab', { name: 'Inicio' }));
  await user.press(screen.getByRole('button', { name: 'Escanear' }));
  expect(await screen.findByText('Camera destination')).toBeOnTheScreen();
  expect(screen).toHavePathname('/admin/scan');
  expect(screen.queryByRole('tab', { name: 'Inicio' })).toBeNull();
});

it('renders shared client tabs without a center action, including singular and plural cart badges', async () => {
  let count = 1;
  function ClientLayout() { return <AppTabBar tabs={CLIENT_TABS} badges={{ cart: count }} />; }
  const clientRoutes = {
    _layout: ClientLayout,
    index: () => <Text>Client home</Text>,
    store: () => <Text>Store</Text>,
    cart: () => <Text>Cart</Text>,
    memberships: () => <Text>Memberships</Text>,
    account: () => <Text>Account</Text>,
  };
  const view = await renderRouter(clientRoutes);
  expect(screen.getByRole('tab', { name: 'Carrito, 1 producto' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Escanear' })).toBeNull();
  await userEvent.setup().press(screen.getByRole('tab', { name: 'Carrito, 1 producto' }));
  expect(await screen.findByText('Cart')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Carrito, 1 producto' })).toBeSelected();
  await view.unmount();
  count = 3;
  await renderRouter(clientRoutes);
  expect(screen.getByRole('tab', { name: 'Carrito, 3 productos' })).toBeOnTheScreen();
});
