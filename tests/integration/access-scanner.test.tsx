import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useCameraPermissions, type CameraViewProps } from 'expo-camera';
import { router } from 'expo-router';
import { Animated, AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminScanScreen from '@/app/admin/scan';
import { AccessScannerView } from '@/features/access/views/access-scanner-view';
import { AdminHomeView } from '@/features/admin/views/admin-home-view';

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
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { email: 'admin@example.com' } }),
}));

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

beforeEach(() => {
  jest.clearAllMocks();
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
  it('abre la ruta del escáner desde el panel del administrador', async () => {
    const user = userEvent.setup();
    await render(<AdminHomeView />);

    await user.press(screen.getByRole('button', { name: 'Escanear acceso' }));

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
    expect(screen.queryByText('Listo para escanear')).toBeNull();
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
    expect(screen.getByText('Listo para escanear')).toBeOnTheScreen();
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

  it('ignora QR vacíos, muestra un QR válido, desactiva lecturas y permite escanear el siguiente', async () => {
    const user = userEvent.setup();
    await render(<AccessScannerView />);

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: ' \n\t' });
    expect(screen.getByText('Listo para escanear')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Escanear siguiente' })).toBeNull();

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: '  TSG-ACC-001  ' });

    expect(screen.getByText('TSG-ACC-001')).toBeOnTheScreen();
    expect(screen.getByText('Código leído')).toBeOnTheScreen();
    expect(screen.getByText(/La validación del acceso estará disponible pronto/)).toBeOnTheScreen();
    expect(screen.queryByText('Apunta al código QR del socio')).toBeNull();
    expect(screen.getByTestId('access-camera')).not.toHaveProp('onBarcodeScanned');
    expect(stopAnimation).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: 'TSG-ACC-002' });
    expect(screen.queryByText('TSG-ACC-002')).toBeNull();
    expect(screen.getByText('TSG-ACC-001')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Escanear siguiente' }));

    expect(screen.queryByText('TSG-ACC-001')).toBeNull();
    expect(screen.getByText('Listo para escanear')).toBeOnTheScreen();
    expect(screen.getByTestId('access-camera')).toHaveProp('onBarcodeScanned', expect.any(Function));
    await fireEvent(screen.getByTestId('access-camera'), 'barcodeScanned', { data: 'TSG-ACC-002' });
    expect(screen.getByText('TSG-ACC-002')).toBeOnTheScreen();
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
    expect(screen.getByText('Listo para escanear')).toBeOnTheScreen();
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });
});
