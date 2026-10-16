import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getTrainerClients } from '@/features/trainer/api/trainer-api';
import { getClientDisplayName } from '@/features/trainer/models/trainer-presentation';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';

export function useTrainerClientsViewModel() {
  const clients = useAuthorizedResource(getTrainerClients);

  return {
    clients: (clients.data ?? []).map((client) => ({
      id: client.id,
      displayName: getClientDisplayName(client),
      email: client.email,
    })),
    isLoading: clients.isLoading,
    isRefreshing: clients.isRefreshing,
    errorMessage: clients.error
      ? getAccessErrorMessage(clients.error, 'No encontramos tus clientes.')
      : null,
    retry: clients.retry,
    refresh: clients.refresh,
  };
}
