import { Subject } from '@/core/observer/subject';

export type SessionEvent = { type: 'signed-in'; userId: string } | { type: 'signed-out' };

/**
 * Published by the auth provider whenever the signed-in user changes. Other
 * layers (such as the repository cache) react to it without the auth code
 * knowing they exist.
 */
export const sessionEvents = new Subject<SessionEvent>();
