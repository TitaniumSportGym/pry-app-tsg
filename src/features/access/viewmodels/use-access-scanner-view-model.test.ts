import { act, renderHook } from '@testing-library/react-native';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { useAccessScannerViewModel } from './use-access-scanner-view-model';

jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
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
const removeSubscription = jest.fn();
let onAppStateChange: (state: AppStateStatus) => void;

function barcode(data: string): BarcodeScanningResult {
  return {
    data,
    type: 'qr',
    bounds: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
    cornerPoints: [],
  };
}

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
});

afterEach(() => jest.restoreAllMocks());

describe('useAccessScannerViewModel', () => {
  it.each([
    [null, 'loading'],
    [granted, 'granted'],
    [askable, 'askable'],
    [blocked, 'blocked'],
  ] as const)('traduce el permiso %j al estado %s', async (permission, access) => {
    jest.mocked(useCameraPermissions).mockReturnValue([permission, requestPermission, getPermission]);

    const { result } = await renderHook(useAccessScannerViewModel);

    expect(result.current.cameraAccess).toBe(access);
    expect(result.current.permissionError).toBeNull();
    expect(result.current.scannedCode).toBeNull();
    expect(result.current.torchOn).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(Linking.openSettings).not.toHaveBeenCalled();
  });

  it('solicita el permiso y refleja la respuesta actualizada del hook de cámara', async () => {
    jest.mocked(useCameraPermissions).mockReturnValue([askable, requestPermission, getPermission]);
    const { result, rerender } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.requestCameraAccess());

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(Linking.openSettings).not.toHaveBeenCalled();
    jest.mocked(useCameraPermissions).mockReturnValue([granted, requestPermission, getPermission]);
    await rerender(undefined);
    expect(result.current.cameraAccess).toBe('granted');
    expect(result.current.permissionError).toBeNull();
  });

  it('abre Ajustes cuando el permiso está bloqueado', async () => {
    jest.mocked(useCameraPermissions).mockReturnValue([blocked, requestPermission, getPermission]);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.requestCameraAccess());

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(result.current.cameraAccess).toBe('blocked');
  });

  it('consulta el permiso solo al volver al primer plano y retira la suscripción al desmontar', async () => {
    const { result, rerender, unmount } = await renderHook(useAccessScannerViewModel);
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    await act(() => {
      onAppStateChange('background');
      onAppStateChange('inactive');
    });
    expect(getPermission).not.toHaveBeenCalled();

    await act(() => onAppStateChange('active'));

    expect(getPermission).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
    jest.mocked(useCameraPermissions).mockReturnValue([blocked, requestPermission, getPermission]);
    await rerender(undefined);
    expect(result.current.cameraAccess).toBe('blocked');
    await unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('reemplaza la suscripción si cambia la función de consulta', async () => {
    const { rerender, unmount } = await renderHook(useAccessScannerViewModel);
    const nextGetPermission = jest.fn().mockResolvedValue(granted);
    jest.mocked(useCameraPermissions).mockReturnValue([granted, requestPermission, nextGetPermission]);

    await rerender(undefined);
    await act(() => onAppStateChange('active'));

    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(nextGetPermission).toHaveBeenCalledTimes(1);
    expect(getPermission).not.toHaveBeenCalled();
    await unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(2);
  });

  it('normaliza un QR válido y bloquea lecturas repetidas antes del siguiente render', async () => {
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => {
      result.current.handleBarcodeScanned(barcode('  TSG-ACC-001 \n'));
      result.current.handleBarcodeScanned(barcode('TSG-ACC-001'));
      result.current.handleBarcodeScanned(barcode('TSG-ACC-002'));
    });

    expect(result.current.scannedCode).toBe('TSG-ACC-001');
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-003')));
    expect(result.current.scannedCode).toBe('TSG-ACC-001');
  });

  it.each(['', '   ', '\n\t'])('ignora un QR vacío (%j) sin bloquear una lectura posterior', async (data) => {
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode(data)));
    expect(result.current.scannedCode).toBeNull();

    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));
    expect(result.current.scannedCode).toBe('TSG-ACC-001');
  });

  it('reinicia la lectura y permite escanear de nuevo incluso el mismo QR', async () => {
    const { result } = await renderHook(useAccessScannerViewModel);
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));

    await act(() => result.current.scanNext());
    expect(result.current.scannedCode).toBeNull();
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));
    expect(result.current.scannedCode).toBe('TSG-ACC-001');

    await act(() => {
      result.current.scanNext();
      result.current.handleBarcodeScanned(barcode('TSG-ACC-002'));
    });
    expect(result.current.scannedCode).toBe('TSG-ACC-002');
  });

  it('alterna la linterna y conserva su estado al reiniciar la lectura', async () => {
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.toggleTorch());
    expect(result.current.torchOn).toBe(true);
    await act(() => result.current.scanNext());
    expect(result.current.torchOn).toBe(true);
    await act(() => result.current.toggleTorch());
    expect(result.current.torchOn).toBe(false);
  });

  it.each([true, false])('regresa con historial=%s o reemplaza la ruta por /admin', async (canGoBack) => {
    jest.mocked(router.canGoBack).mockReturnValue(canGoBack);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.goBack());

    expect(router.canGoBack).toHaveBeenCalledTimes(1);
    if (canGoBack) {
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.replace).not.toHaveBeenCalled();
    } else {
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/admin');
    }
  });

  it('maneja el rechazo de getPermission y elimina el error tras una consulta exitosa', async () => {
    getPermission.mockRejectedValueOnce(new Error('Native permission error'));
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => onAppStateChange('active'));

    expect(result.current.permissionError).toBe(
      'No se pudo consultar el permiso de la cámara. Vuelve a intentarlo.',
    );
    expect(result.current.cameraAccess).toBe('granted');
    await act(() => onAppStateChange('active'));
    expect(getPermission).toHaveBeenCalledTimes(2);
    expect(result.current.permissionError).toBeNull();
  });

  it('maneja el rechazo de requestPermission y permite reintentar', async () => {
    requestPermission.mockRejectedValueOnce(new Error('Native request error'));
    jest.mocked(useCameraPermissions).mockReturnValue([askable, requestPermission, getPermission]);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.requestCameraAccess());

    expect(result.current.permissionError).toBe(
      'No se pudo solicitar el permiso de la cámara. Vuelve a intentarlo.',
    );
    expect(result.current.cameraAccess).toBe('askable');
    await act(() => result.current.requestCameraAccess());
    expect(requestPermission).toHaveBeenCalledTimes(2);
    expect(result.current.permissionError).toBeNull();
  });

  it('maneja el rechazo de Linking.openSettings y permite reintentar', async () => {
    jest.mocked(Linking.openSettings).mockRejectedValueOnce(new Error('Settings unavailable'));
    jest.mocked(useCameraPermissions).mockReturnValue([blocked, requestPermission, getPermission]);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.requestCameraAccess());

    expect(result.current.permissionError).toBe('No se pudieron abrir los ajustes. Vuelve a intentarlo.');
    expect(result.current.cameraAccess).toBe('blocked');
    await act(() => result.current.requestCameraAccess());
    expect(Linking.openSettings).toHaveBeenCalledTimes(2);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(result.current.permissionError).toBeNull();
  });
});
