import { router, type Href } from 'expo-router';

import { getAvatarInitials } from '@/features/admin/models/admin-format';
import { getAdminMenu } from '@/features/admin/models/admin-more-menu';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { useAccountViewModel } from '@/features/account/viewmodels/use-account-view-model';
import { getMemberId } from '@/features/home/models/home';
import { membershipsRepository } from '@/features/memberships/repositories/memberships-repository';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

async function loadCounts({ force }: LoadOptions) {
  const [catalog, plans] = await Promise.all([
    adminRepository.getCatalogCounts({ force }),
    membershipsRepository.getPlans({ force }),
  ]);
  return { ...catalog, plans: plans.length };
}

/** Pantalla 50 · Admin — Más. El cierre de sesión es el mismo de la cuenta de los demás roles. */
export function useAdminMoreViewModel() {
  const { user } = useAuth();
  const account = useAccountViewModel();
  // Si los contadores fallan el menú sigue funcionando; solo no muestra los números.
  const counts = useAuthorizedResource(loadCounts, { reloadOn: [ADMIN_KEYS.catalogCounts] });
  const memberId = getMemberId(user?.email) ?? 'Administrador';

  return {
    profile: {
      name: memberId.charAt(0).toUpperCase() + memberId.slice(1),
      email: user?.email ?? '',
      initials: getAvatarInitials(memberId),
      roleLabel: 'Administrador · Rol admin',
    },
    sections: getAdminMenu(counts.data),
    isSigningOut: account.isSigningOut,
    appVersion: account.appVersion,
    confirmLogout: account.confirmLogout,
    open(route: Href) {
      router.push(route);
    },
  };
}
