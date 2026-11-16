import { givenAdminApi, renderAdmin } from '../support/admin-harness';

import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AdminHomeView } from '../../src/features/admin/views/admin-home-view';
import { AdminMembersView } from '../../src/features/admin/views/admin-members-view';
import { AdminMoreView } from '../../src/features/admin/views/admin-more-view';
import { AdminOrdersView } from '../../src/features/admin/views/admin-orders-view';
import { PickupPointView } from '../../src/features/admin/views/pickup-point-view';
import { ShippingRatesView } from '../../src/features/admin/views/shipping-rates-view';
import { UpdateDeliveryView } from '../../src/features/admin/views/update-delivery-view';
import { apiRequest } from '../../src/services/apiClient';
import { logout } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';
import { adminMember, adminOrder } from '../support/admin-fixtures';

jest.unmock('../../src/features/memberships/api/memberships-api');
const ORDER_ID = '01139ab5-a809-4fa9-8b41-287da9abb705';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: () => ({ id: '01139ab5-a809-4fa9-8b41-287da9abb705' }),
}));

const writes = (method: string) =>
  jest.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method === method);

beforeEach(() => givenAdminApi());

describe('Aceptación simulada — panel del administrador', () => {
  // This suite follows route requests by rerendering the destination with the
  // same provider. admin-navigation.test.tsx separately runs the real navigator.
  it('CA-ADMIN-01: busco un pedido, registro su envío con paquetería y guía y se guarda', async () => {
    givenAdminApi({
      '/api/admin/orders?limit=100': { orders: [adminOrder(ORDER_ID, 'packed', 'delivery', ['shipped', 'incident'])] },
      [`/api/admin/orders/${ORDER_ID}/fulfillment`]: { ok: true },
    });
    const view = await renderAdmin(<AdminOrdersView />);
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Por enviar · 1' }));
    await user.type(screen.getByPlaceholderText('Buscar por pedido o cliente'), `TEST-${ORDER_ID}`);
    await user.press(screen.getByRole('button', { name: 'Registrar envío' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/admin/delivery/[id]', params: { id: ORDER_ID } });
    await view.rerender(<UpdateDeliveryView />);
    expect(await screen.findByRole('radio', { name: /Enviado/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Entregado/ })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'FedEx' }));

    // Sin guía no se envía nada al backend.
    await user.press(screen.getByRole('button', { name: 'Guardar estado' }));
    expect(screen.getByText('Escribe el número de guía.')).toBeOnTheScreen();
    expect(writes('PATCH')).toHaveLength(0);

    await user.type(screen.getByLabelText('Número de guía'), 'SYNTHETIC-123');
    expect(screen.getByLabelText('Número de guía')).toHaveDisplayValue('SYNTHETIC-123');
    const save = screen.getByRole('button', { name: 'Guardar estado' });
    expect(save).toBeEnabled();
    await user.press(save);
    await waitFor(() => expect(writes('PATCH')).toHaveLength(1));
    expect(writes('PATCH')[0]).toEqual([`/api/admin/orders/${ORDER_ID}/fulfillment`, {
      method: 'PATCH',
      body: { status: 'shipped', expectedStatus: 'packed', carrier: 'FedEx', trackingNumber: 'SYNTHETIC-123' },
    }]);
    expect(router.replace).toHaveBeenCalledWith('/admin/orders');
  });

  it('CA-ADMIN-02: consulto tarifas reales, abro una nueva y guardo el punto de recogida real', async () => {
    const view = await renderAdmin(<AdminMoreView />);
    const user = userEvent.setup();
    expect(await screen.findByText('1 activa')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tarifas de envío' }));
    expect(router.push).toHaveBeenCalledWith('/admin/shipping-rates');
    await view.rerender(<ShippingRatesView />);
    expect(await screen.findByText('Zona de prueba')).toBeOnTheScreen();
    expect(screen.getByText('$230.00')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Nueva tarifa' }));
    expect(router.push).toHaveBeenCalledWith('/admin/shipping-rate');
    await user.press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/account');
    await view.rerender(<AdminMoreView />);
    await user.press(screen.getByRole('button', { name: 'Punto de recogida' }));
    expect(router.push).toHaveBeenCalledWith('/admin/pickup-point');
    await view.rerender(<PickupPointView />);

    // Carga la configuración real (ya no hay datos de ejemplo) y la guarda con PUT.
    expect(await screen.findByLabelText('Nombre')).toHaveDisplayValue('Gimnasio de prueba');
    expect(screen.queryByLabelText('Datos de ejemplo')).toBeNull();
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Recepción temporal');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(writes('PUT')).toHaveLength(1));
    expect(writes('PUT')[0][0]).toBe('/api/admin/pickup-settings');
    expect(writes('PUT')[0][1]?.body).toMatchObject({ name: 'Recepción temporal', postalCode: '43000', enabled: true });
    expect(await screen.findByText('Cambios guardados. El cliente ya ve la nueva información.')).toBeOnTheScreen();
  });

  it('CA-ADMIN-03: encuentro socios por correo y recupero la lista al borrar la búsqueda', async () => {
    givenAdminApi({ '/api/admin/users': { users: [adminMember('ana'), adminMember('luis', false)] } });
    await renderAdmin(<AdminMembersView />);
    expect(await screen.findByLabelText('2 Registrados')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Número de socio o correo'), 'ANA@example.test');
    expect(screen.getByText('ana@example.test')).toBeOnTheScreen();
    expect(screen.queryByText('luis@example.test')).toBeNull();
    await fireEvent.changeText(screen.getByPlaceholderText('Número de socio o correo'), 'nadie');
    expect(screen.getByText('Ningún socio coincide con tu búsqueda.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Número de socio o correo'), '');
    expect(screen.getByText('luis@example.test')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Agregar socio, próximamente' })).toBeDisabled();
  });

  it('CA-ADMIN-04: sin permisos no veo ventas inventadas ni pierdo la sesión', async () => {
    const responses = givenAdminApi({ '/api/admin/payments?limit=100': new ApiError('Forbidden', 403) });
    await renderAdmin(<AdminHomeView />);
    expect(await screen.findByText('No tienes permisos para consultar esta información.')).toBeOnTheScreen();
    expect(screen.queryByText('$629')).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getAllByLabelText('Datos de ejemplo')).toHaveLength(4);
    expect(logout).not.toHaveBeenCalled();
    responses['/api/admin/payments?limit=100'] = { payments: [] };
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$0')).toBeOnTheScreen();
    expect(screen.queryByText('No tienes permisos para consultar esta información.')).toBeNull();
  });
});
