import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { getCameraAccess, normalizeScannedCode } from '@/features/access/models/access-code';

export function useAccessScannerViewModel() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  // La cámara sigue reportando el mismo código varias veces por segundo; el candado deja pasar solo la primera.
  const scanLock = useRef(false);

  const cameraAccess = getCameraAccess(permission);

  // Si el administrador activa el permiso desde Ajustes, se refleja al volver a la app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (scanLock.current) return;
    const code = normalizeScannedCode(data);
    if (!code) return;
    scanLock.current = true;
    setScannedCode(code);
  }

  function scanNext() {
    scanLock.current = false;
    setScannedCode(null);
  }

  function requestCameraAccess() {
    if (cameraAccess === 'blocked') Linking.openSettings();
    else requestPermission();
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/admin');
  }

  return {
    cameraAccess,
    torchOn,
    scannedCode,
    toggleTorch: () => setTorchOn((value) => !value),
    handleBarcodeScanned,
    scanNext,
    requestCameraAccess,
    goBack,
  };
}
