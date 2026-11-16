import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  EMPTY_ADDRESS_INPUT,
  onlyDigits,
  PHONE_DIGITS,
  POSTAL_CODE_DIGITS,
  toAddressInput,
  validateAddressInput,
  type AddressField,
  type AddressInput,
} from '@/features/delivery/models/address';
import { deliveryRepository } from '@/features/delivery/repositories/delivery-repository';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

type LoadState = 'ready' | 'loading' | 'not-found';

/**
 * Pantallas 32 y 60 · Nueva / Editar dirección. Los errores se muestran después del
 * primer intento de guardar y se actualizan mientras el usuario corrige.
 */
export function useAddressFormViewModel(addressId?: string) {
  const editingId = isUuid(addressId) ? addressId : null;
  const [input, setInput] = useState<AddressInput>(EMPTY_ADDRESS_INPUT);
  const [loadState, setLoadState] = useState<LoadState>(editingId ? 'loading' : 'ready');
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    deliveryRepository
      .getAddresses()
      .then((addresses) => {
        if (!active) return;
        const address = addresses.find((item) => item.id === editingId);
        if (address) setInput(toAddressInput(address));
        setLoadState(address ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (active) setLoadState('not-found');
      });
    return () => {
      active = false;
    };
  }, [editingId]);

  const errors = submitted ? validateAddressInput(input) : {};
  const close = () => (router.canGoBack() ? router.back() : router.replace('/account/addresses'));

  async function persist(action: () => Promise<unknown>, fallback: string) {
    setIsSaving(true);
    setSaveError(null);
    try {
      await action();
      close();
    } catch (error) {
      setSaveError(getApiErrorMessage(error, fallback));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    isEditing: Boolean(editingId),
    loadState,
    input,
    errors,
    isSaving,
    saveError,
    setField(field: AddressField, value: string) {
      const clean =
        field === 'phone'
          ? onlyDigits(value, PHONE_DIGITS)
          : field === 'postalCode'
            ? onlyDigits(value, POSTAL_CODE_DIGITS)
            : value;
      setInput((current) => ({ ...current, [field]: clean }));
    },
    setDefault(isDefault: boolean) {
      setInput((current) => ({ ...current, isDefault }));
    },
    async save() {
      if (isSaving) return;
      setSubmitted(true);
      if (Object.keys(validateAddressInput(input)).length > 0) return;
      await persist(
        () => deliveryRepository.saveAddress(input, editingId ?? undefined),
        'No pudimos guardar la dirección. Inténtalo de nuevo.',
      );
    },
    async remove() {
      if (!editingId || isSaving) return;
      await persist(
        () => deliveryRepository.deleteAddress(editingId),
        'No pudimos eliminar la dirección. Inténtalo de nuevo.',
      );
    },
    cancel: close,
  };
}
