import { ApiError } from '@/types/auth';

/** Cuando el backend no manda Retry-After en un 429, se espera una ventana completa. */
const DEFAULT_RETRY_AFTER_SECONDS = 60;

function retryAfter(error: ApiError) {
  return error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
}

export type PassProblem =
  | { kind: 'membership' }
  | { kind: 'rate-limited'; retryAfterSeconds: number; message: string }
  | { kind: 'session'; message: string }
  | { kind: 'error'; message: string };

/** Traduce el fallo de POST /api/access/qr a lo que muestra "Mi acceso". */
export function getPassProblem(error: unknown): PassProblem {
  if (!(error instanceof ApiError)) {
    return {
      kind: 'error',
      message: 'No pudimos generar tu código. Revisa tu conexión e inténtalo de nuevo.',
    };
  }

  if (error.code === 'MEMBERSHIP_REQUIRED') return { kind: 'membership' };

  if (error.status === 429) {
    const seconds = retryAfter(error);
    return {
      kind: 'rate-limited',
      retryAfterSeconds: seconds,
      message: `Generaste varios códigos seguidos. Espera ${seconds} s para obtener uno nuevo.`,
    };
  }

  if (error.status === 401) {
    return { kind: 'session', message: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  }

  if (error.status === 403) {
    return { kind: 'error', message: 'Tu cuenta no puede generar un pase de acceso.' };
  }

  return {
    kind: 'error',
    message: 'No pudimos generar tu código. Inténtalo de nuevo en unos segundos.',
  };
}

export interface ScanRejection {
  /**
   * denied: el servidor revisó el código y negó la entrada.
   * unverified: no hubo respuesta válida (red, 5xx); no se sabe si hubo entrada, nunca se concede.
   * session: la sesión del administrador ya no sirve.
   */
  kind: 'denied' | 'unverified' | 'session';
  title: string;
  description: string;
  /** Segundos antes de poder escanear otra vez (límite de escaneos). */
  retryAfterSeconds?: number;
}

const DENIED_BY_CODE: Record<string, Pick<ScanRejection, 'title' | 'description'>> = {
  QR_INVALID: {
    title: 'Código no válido',
    description: 'No es un pase de Titanium o ya no existe. Pide al socio que genere uno nuevo.',
  },
  QR_EXPIRED: {
    title: 'Código vencido',
    description: 'El código caducó. Pide al socio que abra de nuevo "Mi acceso".',
  },
  QR_ALREADY_USED: {
    title: 'Código ya utilizado',
    description:
      'Este código ya registró una entrada. Si no viste la confirmación, revísala en el historial.',
  },
  MEMBERSHIP_REQUIRED: {
    title: 'Membresía no vigente',
    description: 'El socio no tiene una membresía activa. Puede renovarla en recepción o en la app.',
  },
  SELF_SCAN_FORBIDDEN: {
    title: 'Es tu propio código',
    description: 'No puedes registrar tu propia entrada. Escanea el código de un socio.',
  },
  QR_OWNER_INVALID: {
    title: 'Cuenta no válida',
    description: 'La cuenta de este código ya no pertenece a un socio.',
  },
};

const UNVERIFIED: ScanRejection = {
  kind: 'unverified',
  title: 'No se pudo validar',
  description:
    'No hubo respuesta del sistema. No permitas la entrada hasta que se confirme el acceso.',
};

/** Traduce el fallo de POST /api/access/scan al motivo que ve recepción. */
export function getScanRejection(error: unknown): ScanRejection {
  if (!(error instanceof ApiError)) return UNVERIFIED;

  const known = error.code ? DENIED_BY_CODE[error.code] : undefined;
  if (known) return { kind: 'denied', ...known };

  if (error.status === 429) {
    const seconds = retryAfter(error);
    return {
      kind: 'denied',
      title: 'Demasiados escaneos',
      description: `Espera ${seconds} s antes de escanear de nuevo.`,
      retryAfterSeconds: seconds,
    };
  }

  if (error.status === 401) {
    return {
      kind: 'session',
      title: 'Sesión vencida',
      description: 'Inicia sesión de nuevo para seguir registrando accesos.',
    };
  }

  if (error.status === 403) {
    return {
      kind: 'denied',
      title: 'Sin permiso',
      description: 'Tu cuenta no puede validar accesos.',
    };
  }

  if (error.status === 400) {
    return { kind: 'denied', ...DENIED_BY_CODE.QR_INVALID };
  }

  return UNVERIFIED;
}
