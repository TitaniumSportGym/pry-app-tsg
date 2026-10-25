import type { UserRole } from '@/features/authorization/models/user-role';

/**
 * The legal screens open inside each role's "Más" tab, so the tab bar never changes.
 * Guests use the client area.
 */
const LEGAL_ROUTES = {
  cliente: { terms: '/account/terms', privacy: '/account/privacy', parent: '/account' },
  entrenador: {
    terms: '/trainer/account/terms',
    privacy: '/trainer/account/privacy',
    parent: '/trainer/account',
  },
  administrador: {
    terms: '/admin/account/terms',
    privacy: '/admin/account/privacy',
    parent: '/admin/account',
  },
} as const satisfies Record<UserRole, Record<'terms' | 'privacy' | 'parent', string>>;

export type LegalDocument = 'terms' | 'privacy';

export function getLegalRoutes(role: UserRole | null) {
  return LEGAL_ROUTES[role ?? 'cliente'];
}
