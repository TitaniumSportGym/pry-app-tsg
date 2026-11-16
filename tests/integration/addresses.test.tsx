import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import { AddressFormView } from '../../src/features/delivery/views/address-form-view';
import { AddressesView } from '../../src/features/delivery/views/addresses-view';
import { AuthProvider } from '../../src/providers/auth-provider';
import { apiRequest, type ApiRequestOptions } from '../../src/services/apiClient';
import { restoreSession } from '../../src/services/authService';
import { ApiError } from '../../src/types/auth';

// Contrato real de /api/addresses/me con datos sintéticos; sin datos de clientes reales.
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

const HOME_ID = '0b6f1c8e-6c1a-4d3e-9a51-1f2b3c4d5e6f';
const WORK_ID = '9d8c7b6a-5f4e-4d3c-8b2a-1a2b3c4d5e6f';
const address = (id: string, street: string, isDefault: boolean) => ({
  id, recipientName: 'Cliente Ejemplo', phone: '7711234567', postalCode: '43000', state: 'Hidalgo',
  municipality: 'Huejutla de Reyes', neighborhood: 'Centro', street, exteriorNumber: '12',
  interiorNumber: null, references: 'Portón negro', isDefault,
});

type Route = unknown | ((options: ApiRequestOptions) => unknown);

function givenApi(routes: Record<string, Route>) {
  jest.mocked(apiRequest).mockImplementation(async (path, options = {}) => {
    const key = `${options.method ?? 'GET'} ${path}`;
    if (!(key in routes)) throw new Error(`Petición inesperada en la prueba: ${key}`);
    const route = routes[key];
    const response = typeof route === 'function' ? (route as (o: ApiRequestOptions) => unknown)(options) : route;
    if (response instanceof Error) throw response;
    return response as never;
  });
}

const calls = (key: string) =>
  jest.mocked(apiRequest).mock.calls.filter(([path, options]) => `${options?.method ?? 'GET'} ${path}` === key);

async function renderWithSession(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({
    authenticated: true,
    user: { id: 'client-test', email: 'cliente@example.test', rol: 'cliente' },
  });
  await render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(false);
});

describe('Integración — Más → Mis direcciones', () => {
  it('lista las direcciones sin alias, con la predeterminada primero, y navega a agregar y editar', async () => {
    givenApi({
      'GET /api/addresses/me': { ok: true, addresses: [address(WORK_ID, 'Av. Universidad', false), address(HOME_ID, 'Calle Ejemplo', true)] },
    });
    await renderWithSession(<AddressesView />);
    const user = userEvent.setup();

    expect(await screen.findByText('Calle Ejemplo 12')).toBeOnTheScreen();
    expect(screen.getByText('PREDETERMINADA')).toBeOnTheScreen();
    expect(screen.getAllByText('Cliente Ejemplo · 771 123 4567')).toHaveLength(2);
    expect(screen.getAllByText('Huejutla de Reyes, Hidalgo · CP 43000')).toHaveLength(2);
    // Solo la que no es predeterminada ofrece "Hacer predeterminada".
    expect(screen.getAllByRole('button', { name: 'Hacer predeterminada' })).toHaveLength(1);

    await user.press(screen.getAllByRole('button', { name: 'Editar' })[0]);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/account/addresses/[id]', params: { id: HOME_ID } });
    await user.press(screen.getByRole('button', { name: 'Agregar dirección' }));
    expect(router.push).toHaveBeenCalledWith('/account/addresses/new');
    await user.press(screen.getByRole('button', { name: 'Regresar' }));
    expect(router.replace).toHaveBeenCalledWith('/account');
  });

  it('hace predeterminada una dirección y elimina otra tras confirmar; la lista se recarga', async () => {
    let addresses = [address(HOME_ID, 'Calle Ejemplo', true), address(WORK_ID, 'Av. Universidad', false)];
    givenApi({
      'GET /api/addresses/me': () => ({ ok: true, addresses }),
      [`PUT /api/addresses/me/${WORK_ID}`]: () => {
        addresses = [address(HOME_ID, 'Calle Ejemplo', false), address(WORK_ID, 'Av. Universidad', true)];
        return { ok: true, address: addresses[1] };
      },
      [`DELETE /api/addresses/me/${HOME_ID}`]: () => {
        addresses = addresses.filter((item) => item.id !== HOME_ID);
        return null;
      },
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await renderWithSession(<AddressesView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Hacer predeterminada' }));
    await waitFor(() => expect(calls(`PUT /api/addresses/me/${WORK_ID}`)).toHaveLength(1));
    expect(calls(`PUT /api/addresses/me/${WORK_ID}`)[0][1]?.body).toMatchObject({ isDefault: true, references: 'Portón negro' });

    const deleteHome = await screen.findAllByRole('button', { name: 'Eliminar' });
    await user.press(deleteHome[deleteHome.length - 1]);
    await waitFor(() => expect(calls(`DELETE /api/addresses/me/${HOME_ID}`)).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText('Calle Ejemplo 12')).toBeNull());
    expect(screen.getByText('Av. Universidad 12')).toBeOnTheScreen();
  });

  it('muestra el mensaje del backend cuando no puede eliminar', async () => {
    givenApi({
      'GET /api/addresses/me': { ok: true, addresses: [address(HOME_ID, 'Calle Ejemplo', true)] },
      [`DELETE /api/addresses/me/${HOME_ID}`]: new ApiError('La dirección está en un pedido activo.', 409),
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await renderWithSession(<AddressesView />);

    await userEvent.setup().press(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('La dirección está en un pedido activo.')).toBeOnTheScreen();
  });

  it('sin direcciones invita a agregar una; con error permite reintentar', async () => {
    givenApi({ 'GET /api/addresses/me': { ok: true, addresses: [] } });
    await renderWithSession(<AddressesView />);
    const user = userEvent.setup();
    expect(await screen.findByText('AÚN NO TIENES DIRECCIONES')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Agregar dirección' }));
    expect(router.push).toHaveBeenCalledWith('/account/addresses/new');
  });

  it('informa un error de conexión y se recupera al reintentar', async () => {
    let fail = true;
    givenApi({
      'GET /api/addresses/me': () => (fail ? new Error('offline') : { ok: true, addresses: [address(HOME_ID, 'Calle Ejemplo', true)] }),
    });
    await renderWithSession(<AddressesView />);
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    fail = false;
    await userEvent.setup().press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Calle Ejemplo 12')).toBeOnTheScreen();
  });
});

describe('Integración — Editar dirección', () => {
  it('carga la dirección, guarda los cambios con PUT y permite eliminarla', async () => {
    givenApi({
      'GET /api/addresses/me': { ok: true, addresses: [address(HOME_ID, 'Calle Ejemplo', true)] },
      [`PUT /api/addresses/me/${HOME_ID}`]: { ok: true, address: address(HOME_ID, 'Calle Nueva', true) },
      [`DELETE /api/addresses/me/${HOME_ID}`]: null,
    });
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await renderWithSession(<AddressFormView addressId={HOME_ID} />);
    const user = userEvent.setup();

    expect(await screen.findByText('EDITAR DIRECCIÓN')).toBeOnTheScreen();
    expect(screen.getByLabelText('Calle')).toHaveDisplayValue('Calle Ejemplo');
    expect(screen.getByLabelText('Referencias')).toHaveDisplayValue('Portón negro');

    await user.clear(screen.getByLabelText('Calle'));
    await user.type(screen.getByLabelText('Calle'), 'Calle Nueva');
    await act(async () => {
      await user.press(screen.getByRole('switch', { name: 'Usar como predeterminada' }));
    });
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(calls(`PUT /api/addresses/me/${HOME_ID}`)).toHaveLength(1));
    expect(calls(`PUT /api/addresses/me/${HOME_ID}`)[0][1]?.body).toMatchObject({ street: 'Calle Nueva', references: 'Portón negro' });
    expect(router.back).toHaveBeenCalledTimes(1);

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await user.press(screen.getByRole('button', { name: 'Eliminar dirección' }));
    await waitFor(() => expect(calls(`DELETE /api/addresses/me/${HOME_ID}`)).toHaveLength(1));
  });

  it('avisa cuando la dirección ya no existe', async () => {
    givenApi({ 'GET /api/addresses/me': { ok: true, addresses: [] } });
    await renderWithSession(<AddressFormView addressId={HOME_ID} />);
    expect(await screen.findByText('No encontramos esta dirección.')).toBeOnTheScreen();
  });

  it('muestra el error del backend al guardar y se queda en el formulario', async () => {
    givenApi({
      'GET /api/addresses/me': { ok: true, addresses: [address(HOME_ID, 'Calle Ejemplo', true)] },
      [`PUT /api/addresses/me/${HOME_ID}`]: new ApiError('Código postal inválido.', 422),
    });
    await renderWithSession(<AddressFormView addressId={HOME_ID} />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Código postal inválido.')).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(router.replace).toHaveBeenCalledWith('/account/addresses');
  });
});
