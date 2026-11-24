import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  formatAddressCity,
  formatAddressTitle,
  formatPhone,
  toAddressInput,
  type Address,
} from '@/features/delivery/models/address';
import {
  DELIVERY_KEYS,
  deliveryRepository,
} from '@/features/delivery/repositories/delivery-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { getApiErrorMessage } from '@/utils/api-error-message';

const SKELETON_DELAY_MS = 300;

export interface AddressCardItem {
  id: string;
  title: string;
  contact: string;
  neighborhood: string;
  city: string;
  isDefault: boolean;
}

export function toAddressCardItem(address: Address): AddressCardItem {
  return {
    id: address.id,
    title: formatAddressTitle(address),
    contact: [address.recipientName, formatPhone(address.phone)].filter(Boolean).join(' · '),
    neighborhood: address.neighborhood ? `Col. ${address.neighborhood}` : '',
    city: formatAddressCity(address),
    isDefault: address.isDefault,
  };
}

/** Pantallas 31, 61 y 71 · Mis direcciones: lista, vacío y cargando. */
export function useAddressesViewModel() {
  const resource = useAuthorizedResource(deliveryRepository.getAddresses, {
    reloadOn: [DELIVERY_KEYS.addresses],
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const addresses = resource.data ?? [];

  async function run(addressId: string, action: () => Promise<unknown>, fallback: string) {
    if (busyId) return;
    setBusyId(addressId);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(getApiErrorMessage(error, fallback));
    } finally {
      setBusyId(null);
    }
  }

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    isEmpty: !resource.isLoading && !resource.error && addresses.length === 0,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos tus direcciones.')
      : null,
    actionError,
    busyId,
    items: addresses.map(toAddressCardItem),
    retry: resource.retry,
    refresh: resource.refresh,
    add() {
      router.push('/account/addresses/new');
    },
    edit(addressId: string) {
      router.push({ pathname: '/account/addresses/[id]', params: { id: addressId } });
    },
    remove(addressId: string) {
      return run(
        addressId,
        () => deliveryRepository.deleteAddress(addressId),
        'No pudimos eliminar la dirección. Inténtalo de nuevo.',
      );
    },
    makeDefault(addressId: string) {
      const address = addresses.find((item) => item.id === addressId);
      if (!address) return Promise.resolve();
      return run(
        addressId,
        () => deliveryRepository.saveAddress({ ...toAddressInput(address), isDefault: true }, addressId),
        'No pudimos cambiar la dirección predeterminada.',
      );
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    },
  };
}
