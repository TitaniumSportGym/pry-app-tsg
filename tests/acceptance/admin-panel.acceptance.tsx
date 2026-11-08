import { givenAdminApi, renderAdmin } from '../support/admin-harness';

import { fireEvent, screen, userEvent } from '@testing-library/react-native';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

beforeEach(() => givenAdminApi());

describe('Aceptación simulada — panel del administrador', () => {
  // This suite follows route requests by rerendering the destination with the
  // same provider. admin-navigation.test.tsx separately runs the real navigator.
  it('CA-ADMIN-01: busco un pedido y preparo su envío sin afirmar que se guardó', async () => {
    givenAdminApi({ '/api/admin/orders?limit=100': { orders: [
      adminOrder('order-1', 'packed', 'delivery', ['shipped', 'incident']),
    ] } });
    const view = await renderAdmin(<AdminOrdersView />);
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Por enviar · 1' }));
    await user.type(screen.getByPlaceholderText('Buscar por pedido o cliente'), 'TEST-order-1');
    await user.press(screen.getByRole('button', { name: 'Registrar envío' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/admin/delivery/[id]', params: { id: 'order-1' } });
    await view.rerender(<UpdateDeliveryView />);
    expect(await screen.findByRole('radio', { name: /Enviado/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Entregado/ })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'FedEx' }));
    await user.type(screen.getByLabelText('Número de guía'), 'SYNTHETIC-123');
    expect(screen.getByLabelText('Número de guía')).toHaveDisplayValue('SYNTHETIC-123');
    const save = screen.getByRole('button', { name: 'Guardar estado' });
    expect(save).toBeDisabled();
    await user.press(save);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Guardar estará disponible cuando el backend lo permita.')).toBeOnTheScreen();
  });

  it('CA-ADMIN-02: consulto tarifas reales y distingo el formulario local del punto de recogida', async () => {
    const view = await renderAdmin(<AdminMoreView />);
    const user = userEvent.setup();
    expect(await screen.findByText('1 activa')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tarifas de envío' }));
    expect(router.push).toHaveBeenCalledWith('/admin/shipping-rates');
    await view.rerender(<ShippingRatesView />);
    expect(await screen.findByText('Zona de prueba')).toBeOnTheScreen();
    expect(screen.getByText('$230.00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nueva tarifa' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/account');
    await view.rerender(<AdminMoreView />);
    await user.press(screen.getByRole('button', { name: 'Punto de recogida' }));
    expect(router.push).toHaveBeenCalledWith('/admin/pickup-point');
    await view.rerender(<PickupPointView />);
    expect(screen.getByLabelText('Datos de ejemplo')).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Recepción temporal');
    expect(screen.getByLabelText('Nombre')).toHaveDisplayValue('Recepción temporal');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(jest.mocked(apiRequest).mock.calls.every(call => call.length === 1 || call[1]?.auth === false)).toBe(true);
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
