import { router } from 'expo-router';

import { SERVICE_OPTIONS, type ServiceId } from '@/features/services/models/service-options';

const SERVICE_ROUTES = {
  memberships: '/services/memberships',
} as const satisfies Record<ServiceId, string>;

export function useServicesViewModel() {
  return {
    options: SERVICE_OPTIONS,
    openService(serviceId: ServiceId) {
      router.push(SERVICE_ROUTES[serviceId]);
    },
  };
}
