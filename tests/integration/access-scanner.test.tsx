import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useCameraPermissions, type CameraViewProps } from 'expo-camera';
import { router } from 'expo-router';
import { Animated, AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminTabsLayout from '@/app/admin/(tabs)/_layout';
import AdminScanScreen from '@/app/admin/scan';
import type { TabBarCenterAction } from '@/components/navigation/app-tab-bar';
import { getAdminAccessHistory, scanAccessCode } from '@/features/access/api/access-api';
import { AccessScannerView } from '@/features/access/views/access-scanner-view';
import { getAdminUsers } from '@/features/admin/api/admin-api';
import { ApiError } from '@/types/auth';

jest.mock('expo-camera', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: jest.fn(),
    CameraView: (props: CameraViewProps) =>
      createElement(View, { ...props, testID: 'access-camera' }),
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
// Objeto estable, como el del proveedor real: un signOut nuevo en cada render recargaría sin fin.
jest.mock('@/hooks/use-auth', () => {
  const auth = { user: { email: 'admin@example.com' }, signOut: async () => undefined };
  return { useAuth: () => auth };
});
// Solo se simula la red: ViewModel, repositorios y caché son los reales.
jest.mock('@/features/access/api/access-api', () => ({
  scanAccessCode: jest.fn(),
  getAdminAccessHistory: jest.fn(),
  getMyAccessHistory: jest.fn(),
}));
jest.mock('@/features/admin/api/admin-api', () => ({ getAdminUsers: jest.fn() }));
// Las pestañas reales dependen del navegador de Expo Router; aquí solo se dibuja la acción
// central para comprobar que el layout del administrador la conecta con el escáner.
jest.mock('@/components/app-tabs', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ centerAction }: { centerAction: TabBarCenterAction }) =>
      createElement(Pressable, {
        accessibilityLabel: centerAction.label,
        accessibilityRole: 'button',
        onPress: centerAction.onPress,
      }),
  };
});

type CameraPermission = NonNullable<ReturnType<typeof useCameraPermissions>[0]>;
const granted: CameraPermission = {
  granted: true,
  canAskAgain: true,
  status: 'granted' as CameraPermission['status'],
  expires: 'never',
};
const askable: CameraPermission = {
  ...granted,
  granted: false,
  status: 'denied' as CameraPermission['status'],
};
const blocked: CameraPermission = { ...askable, canAskAgain: false };
const requestPermission = jest.fn<Promise<CameraPermission>, []>();
const getPermission = jest.fn<Promise<CameraPermission>, []>();
const startAnimation = jest.fn();
const stopAnimation = jest.fn();
const removeSubscription = jest.fn();
let onAppStateChange: (state: AppStateStatus) => void;

const MEMBER_ID = 'b2ec5cc4-2186-4f87-bcff-b2240678f907';
const NOW = new Date();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(scanAccessCode).mockReset();
  jest.mocked(getAdminAccessHistory).mockReset().mockResolvedValue({
    entries: [
      { id: 'a1', userId: MEMBER_ID, scannedAt: NOW, granted: true },
      { id: 'a2', userId: MEMBER_ID, scannedAt: NOW, granted: false },
    ],
    page: 1,
    totalPages: 1,
    total: 2,
  });
  jest.mocked(getAdminUsers).mockReset().mockResolvedValue([
    { id: MEMBER_ID, email: '20230008@uthh.edu.mx', role: 'cliente', isVerified: true },
  ]);
  requestPermission.mockReset().mockResolvedValue(granted);
  getPermission.mockReset().mockResolvedValue(granted);
  jest.mocked(useCameraPermissions).mockReturnValue([granted, requestPermission, getPermission]);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    onAppStateChange = listener;
    return { remove: removeSubscription };
  });
  jest.spyOn(Animated, 'loop').mockReturnValue({
    start: startAnimation,
    stop: stopAnimation,
    reset: jest.fn(),
  });
});

afterEach(() => jest.restoreAllMocks());

describe('AccessScannerView con su ViewModel', () => {
  it('abre la ruta del escáner desde el botón central de las pestañas del administrador', async () => {
    const user = userEvent.setup();
    await render(<AdminTabsLayout />);

    await user.press(screen.getByRole('button', { name: 'Escanear' }));

    expect(router.push).toHaveBeenCalledWith('/admin/scan');
  });

  it('espera el permiso sin montar la cámara ni ofrecer la linterna', async () => {
    jest.mocked(useCameraPermissions).mockReturnValue([null, requestPermission, getPermission]);

    await render(<AdminScanScreen />);

    expect(screen.getByText('ESCANEAR ACCESO')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Regresar' })).toBeOnTheScreen();
    expect(screen.queryByTestId('access-camera')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Encender linterna' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Permitir cámara' })).toBeNull();
    expect(screen.queryByText('Accesos de hoy')).toBeNull();
  });

  it.each([
    [askable, 'Permitir cámara'],
    [blocked, 'Abrir ajustes'],
  ] as const)('muestra la acción %s / %s y la conecta con el permiso', async (permission, label) => {
    jest.mocked(useCameraPermissions).mockReturnValue([permission, requestPermission, getPermission]);
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    expect(screen.queryByTestId('access-camera')).toBeNull();
    expect(screen.getByText('ACTIVA LA CÁMARA')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: label }));

    if (permission.canAskAgain) {
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(Linking.openSettings).not.toHaveBeenCalled();
    } else {
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });

  it('monta la cámara tras conceder el permiso y la retira si se revoca', async () => {
    jest.mocked(useCameraPermissions).mockReturnValue([askable, requestPermission, getPermission]);
    const user = userEvent.setup();
    const { rerender } = await render(<AccessScannerView />);
    await user.press(screen.getByRole('button', { name: 'Permitir cámara' }));

    jest.mocked(useCameraPermissions).mockReturnValue([granted, requestPermission, getPermission]);
    await rerender(<AccessScannerView />);

    expect(screen.getByTestId('access-camera')).toHaveProp('facing', 'back');
    expect(screen.getByTestId('access-camera')).toHaveProp('barcodeScannerSettings', {
      barcodeTypes: ['qr'],
    });
    expect(screen.getByText('Accesos de hoy')).toBeOnTheScreen();
    expect(screen.getByText('Apunta al código QR del socio')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Permitir cámara' })).toBeNull();

    jest.mocked(useCameraPermissions).mockReturnValue([blocked, requestPermission, getPermission]);
    await act(() => onAppStateChange('active'));
    await rerender(<AccessScannerView />);

    expect(getPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('access-camera')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir ajustes' })).toBeOnTheScreen();
    expect(stopAnimation).toHaveBeenCalledTimes(1);
  });

  it('resume los accesos de hoy con el historial del backend y abre el historial', async () => {
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    expect(await screen.findByText('1 socio')).toBeOnTheScreen();
    expect(getAdminAccessHistory).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 100 }));

    await user.press(screen.getByRole('button', { name: 'Ver historial de accesos' }));
    expect(router.push).toHaveBeenCalledWith('/admin/access-history');
  });

  it('valida el QR con el backend, muestra el acceso permitido y permite escanear el siguiente', async () => {
    jest.mocked(scanAccessCode).mockResolvedValue({
      id: 'acc-1',
      userId: MEMBER_ID,
      scannedAt: NOW,
      subscriptionStatus: 'active',
    });
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: ' \n\t' });
    expect(scanAccessCode).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: '  TOKEN-VALIDO  ' });

    expect(await screen.findByText('ACCESO PERMITIDO')).toBeOnTheScreen();
    expect(scanAccessCode).toHaveBeenCalledWith('TOKEN-VALIDO');
    expect(screen.getByText('Socio 20230008')).toBeOnTheScreen();
    expect(screen.getByText('20230008@uthh.edu.mx')).toBeOnTheScreen();
    expect(screen.getByText('Activa')).toBeOnTheScreen();
    expect(screen.getByTestId('access-camera')).not.toHaveProp('onBarcodeScanned');
    expect(screen.queryByText('TOKEN-VALIDO')).toBeNull();

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: 'OTRO' });
    expect(scanAccessCode).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Escanear siguiente' }));

    expect(screen.queryByText('ACCESO PERMITIDO')).toBeNull();
    expect(screen.getByTestId('access-camera')).toHaveProp('onBarcodeScanned', expect.any(Function));
  });

  it('muestra el acceso denegado con el motivo que envía el backend', async () => {
    jest
      .mocked(scanAccessCode)
      .mockRejectedValue(
        new ApiError('Membresía vencida', 403, undefined, 'MEMBERSHIP_REQUIRED'),
      );
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: 'TOKEN-VENCIDO' });

    expect(await screen.findByText('ACCESO DENEGADO')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Membresía no vigente');
    expect(screen.queryByText('ACCESO PERMITIDO')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Escanear de nuevo' }));
    expect(screen.queryByText('ACCESO DENEGADO')).toBeNull();
  });

  it('sin conexión no concede la entrada y reintenta el mismo código', async () => {
    jest
      .mocked(scanAccessCode)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce({ id: 'acc-2', userId: MEMBER_ID, scannedAt: NOW, subscriptionStatus: 'active' });
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: 'TOKEN-RED' });

    expect(await screen.findByText('SIN CONFIRMAR')).toBeOnTheScreen();
    expect(screen.queryByText('ACCESO PERMITIDO')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('ACCESO PERMITIDO')).toBeOnTheScreen();
    expect(scanAccessCode).toHaveBeenNthCalledWith(2, 'TOKEN-RED');
  });

  it('conecta la linterna con la cámara y actualiza la etiqueta accesible', async () => {
    const user = userEvent.setup();
    await render(<AccessScannerView />);
    expect(screen.getByTestId('access-camera')).toHaveProp('enableTorch', false);

    await user.press(screen.getByRole('button', { name: 'Encender linterna' }));

    expect(screen.getByTestId('access-camera')).toHaveProp('enableTorch', true);
    expect(screen.getByRole('button', { name: 'Apagar linterna' })).toBeSelected();
    await user.press(screen.getByRole('button', { name: 'Apagar linterna' }));
    expect(screen.getByTestId('access-camera')).toHaveProp('enableTorch', false);
    expect(screen.getByRole('button', { name: 'Encender linterna' })).not.toBeSelected();
  });

  it.each([true, false])('conecta Regresar con la navegación (historial=%s)', async (canGoBack) => {
    jest.mocked(router.canGoBack).mockReturnValue(canGoBack);
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await user.press(screen.getByRole('button', { name: 'Regresar' }));

    if (canGoBack) {
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.replace).not.toHaveBeenCalled();
    } else {
      expect(router.replace).toHaveBeenCalledWith('/admin');
      expect(router.back).not.toHaveBeenCalled();
    }
  });

  it.each([
    [askable, 'Permitir cámara', 'No se pudo solicitar el permiso de la cámara. Vuelve a intentarlo.'],
    [blocked, 'Abrir ajustes', 'No se pudieron abrir los ajustes. Vuelve a intentarlo.'],
  ] as const)('muestra el rechazo de la acción %s / %s y permite reintentar', async (permission, label, message) => {
    jest.mocked(useCameraPermissions).mockReturnValue([permission, requestPermission, getPermission]);
    if (permission.canAskAgain) requestPermission.mockRejectedValueOnce(new Error('Request failed'));
    else jest.mocked(Linking.openSettings).mockRejectedValueOnce(new Error('Settings failed'));
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await user.press(screen.getByRole('button', { name: label }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByTestId('access-camera')).toBeNull();
    await user.press(screen.getByRole('button', { name: label }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(permission.canAskAgain ? requestPermission : Linking.openSettings).toHaveBeenCalledTimes(2);
  });

  it('muestra el error al consultar permisos al volver y lo retira al recuperarse', async () => {
    getPermission.mockRejectedValueOnce(new Error('Refresh failed'));
    await render(<AccessScannerView />);

    await act(() => onAppStateChange('active'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo consultar el permiso de la cámara. Vuelve a intentarlo.',
    );
    expect(screen.getByTestId('access-camera')).toBeOnTheScreen();
    await act(() => onAppStateChange('active'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('detiene la animación y retira el listener al salir del escáner', async () => {
    const { unmount } = await render(<AccessScannerView />);
    expect(startAnimation).toHaveBeenCalledTimes(1);

    await unmount();

    expect(stopAnimation).toHaveBeenCalledTimes(1);
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('renderiza también en web con un área segura distinta de cero', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 44, bottom: 34, left: 0, right: 0 });

    await render(<AccessScannerView />);

    expect(screen.getByTestId('access-camera')).toBeOnTheScreen();
    expect(screen.getByText('Accesos de hoy')).toBeOnTheScreen();
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });
});
