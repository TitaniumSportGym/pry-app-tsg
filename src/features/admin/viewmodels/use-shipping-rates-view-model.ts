import { router } from 'expo-router';

import { formatMoney } from '@/features/admin/models/admin-format';
import { sortShippingRates } from '@/features/admin/models/shipping-rate';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';

/** Pantalla 51 · Admin — Tarifas de envío (lectura real; editar y crear quedan pendientes). */
export function useShippingRatesViewModel() {
  const resource = useAuthorizedResource(adminRepository.getShippingRates, {
    reloadOn: [ADMIN_KEYS.shippingRates],
  });

  return {
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No pudimos cargar las tarifas.')
      : null,
    isEmpty: !resource.isLoading && !resource.error && (resource.data?.length ?? 0) === 0,
    rates: sortShippingRates(resource.data ?? []).map((rate) => ({
      id: rate.id,
      name: rate.name,
      active: rate.active,
      statusLabel: rate.active ? 'Activa' : 'Inactiva',
      from: rate.postalCodeFrom,
      to: rate.postalCodeTo,
      amount: formatMoney(rate.amount),
    })),
    retry: resource.retry,
    refresh: resource.refresh,
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/account');
    },
  };
}
