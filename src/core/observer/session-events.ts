import { Subject } from '@/core/observer/subject';

export type SessionEvent = { type: 'signed-in'; userId: string } | { type: 'signed-out' } | { type: 'invalidated' };

/**
 * El proveedor publica los cambios de cuenta; el almacén publica invalidaciones
 * de credenciales. La UI y la caché reaccionan sin acoplar el cliente HTTP a React.
 */
export const sessionEvents = new Subject<SessionEvent>();
