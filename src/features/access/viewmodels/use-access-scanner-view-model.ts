import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { scanAccessCode } from '@/features/access/api/access-api';
import { getCameraAccess, normalizeScannedCode } from '@/features/access/models/access-code';
import { getScanRejection, type ScanRejection } from '@/features/access/models/access-errors';
import { formatAccessMoment } from '@/features/access/models/access-format';
import type { GrantedAccess } from '@/features/access/models/access-history';
import { ACCESS_KEYS, accessRepository } from '@/features/access/repositories/access-repository';
import { formatTime } from '@/features/admin/models/admin-format';
import { adminRepository } from '@/features/admin/repositories/admin-repository';
import { getInitials, getMemberId } from '@/features/home/models/home';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';

export interface ScannedMember {
  name: string;
  detail: string;
  initials: string | null;
}

type ScanState =
  | { kind: 'idle' }
  | { kind: 'validating'; code: string }
  | { kind: 'granted'; access: GrantedAccess; member: ScannedMember }
  | { kind: 'rejected'; code: string; rejection: ScanRejection };

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = { active: 'Activa' };

/** Datos del socio a partir de la lista de socios del panel; si no está, se muestra genérico. */
async function findMember(userId: string): Promise<ScannedMember> {
  try {
    const member = (await adminRepository.getMembers()).find((item) => item.id === userId);
    if (member) {
      return {
        name: `Socio ${member.memberId}`,
        detail: member.email,
        initials: getInitials(getMemberId(member.email)),
      };
    }
  } catch {
    // La entrada ya quedó registrada; sin la lista de socios solo falta el nombre.
  }
  return { name: 'Socio Titanium', detail: 'Datos del socio no disponibles', initials: null };
}

/**
 * Pantallas 43–45 · Admin — Escanear acceso.
 * Cada lectura se envía una sola vez al backend; mientras llega la respuesta la cámara no
 * envía más lecturas. Solo una respuesta del servidor con accessGranted confirma la entrada:
 * sin conexión o con error nunca se concede el acceso.
 */
export function useAccessScannerViewModel() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [scan, setScan] = useState<ScanState>({ kind: 'idle' });
  // La cámara sigue reportando el mismo código varias veces por segundo; el candado deja pasar solo la primera.
  const scanLock = useRef(false);
  const blockedUntil = useRef(0);
  const mounted = useRef(true);

  const cameraAccess = getCameraAccess(permission);
  const today = useAuthorizedResource(accessRepository.getTodaySummary, {
    reloadOn: [ACCESS_KEYS.admin],
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Si el administrador activa el permiso desde Ajustes, se refleja al volver a la app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getPermission()
          .then(() => setPermissionError(null))
          .catch(() =>
            setPermissionError('No se pudo consultar el permiso de la cámara. Vuelve a intentarlo.'),
          );
      }
    });
    return () => subscription.remove();
  }, [getPermission]);

  async function validate(code: string) {
    setScan({ kind: 'validating', code });
    try {
      const access = await scanAccessCode(code);
      accessRepository.invalidate();
      const member = await findMember(access.userId);
      if (mounted.current) setScan({ kind: 'granted', access, member });
    } catch (error) {
      const rejection = getScanRejection(error);
      if (rejection.retryAfterSeconds) {
        blockedUntil.current = Date.now() + rejection.retryAfterSeconds * 1000;
      }
      if (mounted.current) setScan({ kind: 'rejected', code, rejection });
    }
  }

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (scanLock.current || Date.now() < blockedUntil.current) return;
    const code = normalizeScannedCode(data);
    if (!code) return;
    scanLock.current = true;
    void validate(code);
  }

  function scanNext() {
    scanLock.current = false;
    setScan({ kind: 'idle' });
  }

  /** Solo tras una falla de conexión: reenvía el mismo código (el backend evita duplicados). */
  function retryValidation() {
    if (scan.kind === 'rejected' && scan.rejection.kind === 'unverified') {
      void validate(scan.code);
    }
  }

  function requestCameraAccess() {
    setPermissionError(null);
    if (cameraAccess === 'blocked') {
      Linking.openSettings().catch(() =>
        setPermissionError('No se pudieron abrir los ajustes. Vuelve a intentarlo.'),
      );
    } else {
      requestPermission().catch(() =>
        setPermissionError('No se pudo solicitar el permiso de la cámara. Vuelve a intentarlo.'),
      );
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/admin');
  }

  const summary = today.data;

  return {
    cameraAccess,
    permissionError,
    torchOn,
    /** idle: listo para leer; validating: esperando al servidor; granted/rejected: resultado. */
    scanStatus: scan.kind,
    granted:
      scan.kind === 'granted'
        ? {
            member: scan.member,
            membership:
              MEMBERSHIP_STATUS_LABELS[scan.access.subscriptionStatus] ??
              scan.access.subscriptionStatus,
            registeredAt: formatAccessMoment(scan.access.scannedAt, new Date()),
          }
        : null,
    rejection: scan.kind === 'rejected' ? scan.rejection : null,
    todayCount: summary ? `${summary.count}${summary.capped ? '+' : ''} ${summary.count === 1 ? 'socio' : 'socios'}` : '—',
    todayLast: summary?.lastAt ? formatTime(summary.lastAt) : '—',
    toggleTorch: () => setTorchOn((value) => !value),
    handleBarcodeScanned,
    scanNext,
    retryValidation,
    requestCameraAccess,
    openHistory: () => router.push('/admin/access-history'),
    goBack,
  };
}
