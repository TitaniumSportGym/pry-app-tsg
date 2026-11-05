import { Subject } from '@/core/observer/subject';

export type SessionEvent = { type: 'signed-in'; userId: string } | { type: 'signed-out' };

/**
 * Lo publica el proveedor de autenticación cada vez que cambia el usuario con
 * sesión. Otras capas (como la caché de repositorios) reaccionan a él sin que
 * el código de autenticación sepa que existen.
 */
export const sessionEvents = new Subject<SessionEvent>();
