import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { formatAccessMoment } from '@/features/access/models/access-format';
import { ACCESS_HISTORY_PAGE_SIZE } from '@/features/access/models/access-history';
import { ACCESS_KEYS, accessRepository } from '@/features/access/repositories/access-repository';
import type { AdminMember } from '@/features/admin/models/admin-member';
import { adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

export type AccessHistoryMode = 'client' | 'admin';

export interface AccessHistoryItem {
  id: string;
  title: string;
  detail: string;
  granted: boolean;
}

/** Sin la lista de socios el historial se muestra igual, solo sin nombres. */
async function loadMembersById(options: LoadOptions) {
  try {
    const members = await adminRepository.getMembers(options);
    return new Map(members.map((member): [string, AdminMember] => [member.id, member]));
  } catch {
    return new Map<string, AdminMember>();
  }
}

/** Historial de entradas: el cliente ve las suyas; el administrador, las de todos los socios. */
export function useAccessHistoryViewModel(mode: AccessHistoryMode) {
  const [page, setPage] = useState(1);
  const isAdmin = mode === 'admin';

  const load = useCallback(
    async (options: LoadOptions) => {
      const [history, members] = await Promise.all([
        isAdmin
          ? accessRepository.getAdminHistory(page, options)
          : accessRepository.getMyHistory(page, options),
        isAdmin ? loadMembersById(options) : Promise.resolve(new Map<string, AdminMember>()),
      ]);
      return { history, members };
    },
    [isAdmin, page],
  );
  const resource = useAuthorizedResource(load, {
    reloadOn: [isAdmin ? ACCESS_KEYS.admin : ACCESS_KEYS.mine],
  });

  const history = resource.data?.history;
  const now = new Date();
  const items: AccessHistoryItem[] = (history?.entries ?? []).map((entry) => {
    const moment = formatAccessMoment(entry.scannedAt, now);
    const member = resource.data?.members.get(entry.userId);
    const status = entry.granted ? 'Entrada registrada' : 'Acceso rechazado';

    return isAdmin
      ? {
          id: entry.id,
          title: member ? `Socio ${member.memberId}` : 'Socio Titanium',
          detail: `${moment} · ${status}`,
          granted: entry.granted,
        }
      : { id: entry.id, title: moment, detail: status, granted: entry.granted };
  });
  const total = history?.total ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * ACCESS_HISTORY_PAGE_SIZE + 1;

  return {
    title: isAdmin ? 'HISTORIAL DE ACCESOS' : 'MIS ENTRADAS',
    subtitle: isAdmin ? 'Entradas registradas en recepción' : 'Tus visitas al gimnasio',
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos el historial de accesos.')
      : null,
    isEmpty: !resource.isLoading && !resource.error && total === 0,
    items,
    pagination: {
      page,
      pageCount: Math.max(1, history?.totalPages ?? 1),
      rangeStart,
      rangeEnd: Math.min(total, rangeStart + items.length - 1),
      totalItems: total,
    },
    changePage: setPage,
    refresh: resource.refresh,
    retry: resource.retry,
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(isAdmin ? '/admin' : '/account');
    },
  };
}
