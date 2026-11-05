import type { UserRole } from '@/features/authorization/models/user-role';

/**
 * The legal screens open inside each role's "Más" tab, so the tab bar never changes.
 * Guests use the client area.
 */
const LEGAL_ROUTES = {
  cliente: {
    terms: '/account/terms',
    privacy: '/account/privacy',
    parent: '/account',
    rights: '/account/personal-data',
  },
  entrenador: {
    terms: '/trainer/account/terms',
    privacy: '/trainer/account/privacy',
    parent: '/trainer/account',
    rights: '/trainer/account/personal-data',
  },
  administrador: {
    terms: '/admin/account/terms',
    privacy: '/admin/account/privacy',
    parent: '/admin/account',
    rights: '/admin/account/personal-data',
  },
} as const satisfies Record<UserRole, Record<'terms' | 'privacy' | 'parent' | 'rights', string>>;

export type LegalDocument = 'terms' | 'privacy';

export function getLegalRoutes(role: UserRole | null) {
  return LEGAL_ROUTES[role ?? 'cliente'];
}
