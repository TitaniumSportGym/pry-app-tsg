import { useState } from 'react';

import { formatShortDate } from '@/features/admin/models/admin-format';
import {
  searchMembers,
  sortMembersByNewest,
  summarizeMembers,
} from '@/features/admin/models/admin-member';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { usePagination } from '@/hooks/use-pagination';

const SKELETON_DELAY_MS = 300;
/** Color del punto de cada tarjeta de resumen. */
const AppDot = { success: 'success', brand: 'brand', error: 'error' } as const;
const SEARCH_MAX_LENGTH = 80;
/** Hay más de mil socios: 20 por página mantiene la lista ligera y fácil de recorrer. */
const MEMBERS_PER_PAGE = 20;

/** Pantalla 49 · Admin — Socios (usuarios con rol cliente). */
export function useAdminMembersViewModel() {
  const resource = useAuthorizedResource(adminRepository.getMembers, {
    reloadOn: [ADMIN_KEYS.members],
  });
  const [query, setQuery] = useState('');

  const members = resource.data ?? [];
  const summary = summarizeMembers(members);
  const visible = searchMembers(sortMembersByNewest(members), query);
  // Al buscar se vuelve a la primera página.
  const pagination = usePagination(visible, MEMBERS_PER_PAGE, query.trim());

  return {
    subtitle: resource.data ? `${summary.total.toLocaleString('en-US')} registrados` : 'Socios del gimnasio',
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No pudimos cargar a los socios.')
      : null,
    summary: [
      { id: 'total', value: summary.total, label: 'Registrados', highlighted: true, dot: AppDot.success },
      { id: 'verified', value: summary.verified, label: 'Verificados', highlighted: false, dot: AppDot.brand },
      { id: 'unverified', value: summary.unverified, label: 'Sin verificar', highlighted: false, dot: AppDot.error },
    ],
    query,
    searchMaxLength: SEARCH_MAX_LENGTH,
    setQuery,
    isSearchEmpty: query.trim() !== '' && visible.length === 0,
    pagination,
    members: pagination.pageItems.map((member) => ({
      id: member.id,
      name: member.memberId,
      email: member.email,
      initials: member.initials,
      joinedLabel: member.createdAt ? `Alta: ${formatShortDate(member.createdAt)}` : 'Alta sin fecha',
      verified: member.verified,
    })),
    retry: resource.retry,
    refresh: resource.refresh,
  };
}

