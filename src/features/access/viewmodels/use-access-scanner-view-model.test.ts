import { act, renderHook } from '@testing-library/react-native';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { scanAccessCode } from '@/features/access/api/access-api';
import { accessRepository } from '@/features/access/repositories/access-repository';
import { adminRepository } from '@/features/admin/repositories/admin-repository';
import { ApiError } from '@/types/auth';

import { useAccessScannerViewModel } from './use-access-scanner-view-model';

jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));
jest.mock('@/hooks/use-auth', () => {
  const auth = { signOut: async () => undefined };
  return { useAuth: () => auth };
});
jest.mock('@/features/access/api/access-api', () => ({ scanAccessCode: jest.fn() }));
jest.mock('@/features/access/repositories/access-repository', () => ({
  ACCESS_KEYS: { all: 'access', mine: 'access:me', admin: 'access:admin' },
  accessRepository: { getTodaySummary: jest.fn(), invalidate: jest.fn() },
}));
jest.mock('@/features/admin/repositories/admin-repository', () => ({
  adminRepository: { getMembers: jest.fn() },
}));

const MEMBER_ID = 'b2ec5cc4-2186-4f87-bcff-b2240678f907';
const grantedAccess = {
  id: '25ae449c-b5ab-4b45-9be3-3fd7602a659a',
  userId: MEMBER_ID,
  scannedAt: new Date(2026, 10, 3, 12, 34),
  subscriptionStatus: 'active',
};

/** Deja la validación esperando al servidor, como pasa mientras llega la respuesta. */
function pendingScan() {
  jest.mocked(scanAccessCode).mockReturnValue(new Promise(() => undefined));
}

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
  jest.mocked(scanAccessCode).mockReset();
  pendingScan();
  jest
    .mocked(accessRepository.getTodaySummary)
    .mockReset()
    .mockResolvedValue({ count: 48, lastAt: new Date(2026, 10, 3, 12, 31), capped: false });
  jest.mocked(adminRepository.getMembers).mockReset().mockResolvedValue([]);
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
    expect(result.current.scanStatus).toBe('idle');
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

  it('envía al backend un solo QR normalizado y bloquea lecturas repetidas mientras valida', async () => {
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => {
      result.current.handleBarcodeScanned(barcode('  TSG-ACC-001 \n'));
      result.current.handleBarcodeScanned(barcode('TSG-ACC-001'));
      result.current.handleBarcodeScanned(barcode('TSG-ACC-002'));
    });

    expect(result.current.scanStatus).toBe('validating');
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-003')));
    expect(scanAccessCode).toHaveBeenCalledTimes(1);
    expect(scanAccessCode).toHaveBeenCalledWith('TSG-ACC-001');
  });

  it.each(['', '   ', '\n\t', 'x'.repeat(300)])(
    'ignora un QR vacío o que no puede ser un pase (%#) sin bloquear una lectura posterior',
    async (data) => {
      const { result } = await renderHook(useAccessScannerViewModel);

      await act(() => result.current.handleBarcodeScanned(barcode(data)));
      expect(result.current.scanStatus).toBe('idle');
      expect(scanAccessCode).not.toHaveBeenCalled();

      await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));
      expect(scanAccessCode).toHaveBeenCalledWith('TSG-ACC-001');
    },
  );

  it('muestra el acceso permitido con los datos del socio y recarga el historial', async () => {
    jest.mocked(scanAccessCode).mockResolvedValue(grantedAccess);
    jest.mocked(adminRepository.getMembers).mockResolvedValue([
      {
        id: MEMBER_ID,
        email: '20230008@uthh.edu.mx',
        memberId: '20230008',
        initials: 'UT',
        verified: true,
        createdAt: null,
      },
    ]);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-OK')));

    expect(result.current.scanStatus).toBe('granted');
    expect(result.current.granted?.member).toEqual({
      name: 'Socio 20230008',
      detail: '20230008@uthh.edu.mx',
      initials: null,
    });
    expect(result.current.granted?.membership).toBe('Activa');
    expect(accessRepository.invalidate).toHaveBeenCalledTimes(1);
  });

  it('permite la entrada aunque no se pueda leer la lista de socios', async () => {
    jest.mocked(scanAccessCode).mockResolvedValue(grantedAccess);
    jest.mocked(adminRepository.getMembers).mockRejectedValue(new Error('sin red'));
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-OK')));

    expect(result.current.scanStatus).toBe('granted');
    expect(result.current.granted?.member.name).toBe('Socio Titanium');
  });

  it('muestra el motivo del rechazo del servidor y no reintenta el mismo código', async () => {
    jest
      .mocked(scanAccessCode)
      .mockRejectedValue(new ApiError('El código QR expiró.', 410, undefined, 'QR_EXPIRED'));
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-VIEJO')));
    await act(() => result.current.retryValidation());

    expect(result.current.scanStatus).toBe('rejected');
    expect(result.current.rejection).toMatchObject({ kind: 'denied', title: 'Código vencido' });
    expect(scanAccessCode).toHaveBeenCalledTimes(1);
    expect(accessRepository.invalidate).not.toHaveBeenCalled();
  });

  it('sin conexión nunca concede el acceso y reintenta el mismo código', async () => {
    jest
      .mocked(scanAccessCode)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(grantedAccess);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-RED')));
    expect(result.current.rejection?.kind).toBe('unverified');
    expect(result.current.granted).toBeNull();

    await act(() => result.current.retryValidation());

    expect(scanAccessCode).toHaveBeenNthCalledWith(2, 'TOKEN-RED');
    expect(result.current.scanStatus).toBe('granted');
  });

  it('respeta Retry-After cuando el backend limita los escaneos', async () => {
    const limited = new ApiError('Demasiadas solicitudes', 429, undefined, 'ACCESS_RATE_LIMITED');
    limited.retryAfterSeconds = 30;
    jest.mocked(scanAccessCode).mockRejectedValue(limited);
    const { result } = await renderHook(useAccessScannerViewModel);

    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-1')));
    expect(result.current.rejection?.description).toBe('Espera 30 s antes de escanear de nuevo.');

    await act(() => result.current.scanNext());
    await act(() => result.current.handleBarcodeScanned(barcode('TOKEN-2')));
    expect(scanAccessCode).toHaveBeenCalledTimes(1);
  });

  it('reinicia la lectura y permite escanear de nuevo incluso el mismo QR', async () => {
    jest.mocked(scanAccessCode).mockResolvedValue(grantedAccess);
    const { result } = await renderHook(useAccessScannerViewModel);
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));

    await act(() => result.current.scanNext());
    expect(result.current.scanStatus).toBe('idle');
    await act(() => result.current.handleBarcodeScanned(barcode('TSG-ACC-001')));
    expect(scanAccessCode).toHaveBeenCalledTimes(2);
  });

  it('resume los accesos de hoy y abre el historial', async () => {
    const { result } = await renderHook(useAccessScannerViewModel);

    expect(result.current.todayCount).toBe('48 socios');
    expect(result.current.todayLast).toBe('12:31 p.m.');
    await act(() => result.current.openHistory());
    expect(router.push).toHaveBeenCalledWith('/admin/access-history');
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
