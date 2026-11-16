import { router } from 'expo-router';
import { useState } from 'react';

import { formatMoney } from '@/features/admin/models/admin-format';
import { sortShippingRates } from '@/features/admin/models/shipping-rate';
import { adminDeliveryRepository } from '@/features/admin/repositories/admin-delivery-repository';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { getApiErrorMessage } from '@/utils/api-error-message';

/** Pantallas 51 y 75 · Admin — Tarifas de envío: lista, activar/desactivar, crear y editar. */
export function useShippingRatesViewModel() {
  const resource = useAuthorizedResource(adminRepository.getShippingRates, {
    reloadOn: [ADMIN_KEYS.shippingRates],
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    busyId,
    actionError,
    retry: resource.retry,
    refresh: resource.refresh,
    create() {
      router.push('/admin/shipping-rate');
    },
    edit(rateId: string) {
      router.push({ pathname: '/admin/shipping-rate', params: { id: rateId } });
    },
    async setActive(rateId: string, active: boolean) {
      if (busyId) return;
      setBusyId(rateId);
      setActionError(null);
      try {
        await adminDeliveryRepository.setShippingRateActive(rateId, active);
      } catch (error) {
        setActionError(getApiErrorMessage(error, 'No pudimos cambiar la tarifa. Inténtalo de nuevo.'));
      } finally {
        setBusyId(null);
      }
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/account');
    },
  };
}
