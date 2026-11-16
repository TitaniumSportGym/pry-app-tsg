import { router } from 'expo-router';
import { useState } from 'react';

import {
  EMPTY_SHIPPING_RATE_INPUT,
  findOverlappingRates,
  toShippingRateInput,
  validateShippingRateInput,
  type ShippingRateField,
  type ShippingRateInput,
} from '@/features/admin/models/shipping-rate';
import { adminDeliveryRepository } from '@/features/admin/repositories/admin-delivery-repository';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

/** Pantallas 67 y 68 · Admin — Nueva / Editar tarifa (POST / PATCH /api/admin/shipping-rates). */
export function useShippingRateFormViewModel(rateId: string | undefined) {
  const editingId = isUuid(rateId) ? rateId : null;
  const resource = useAuthorizedResource(adminRepository.getShippingRates, {
    reloadOn: [ADMIN_KEYS.shippingRates],
  });
  const rates = resource.data ?? [];
  const [input, setInput] = useState<ShippingRateInput | null>(editingId ? null : EMPTY_SHIPPING_RATE_INPUT);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Al editar, el formulario se llena una vez con la tarifa de la lista ya cargada.
  const editing = editingId ? rates.find((rate) => rate.id === editingId) : undefined;
  if (!input && editing) setInput(toShippingRateInput(editing));

  const errors = submitted && input ? validateShippingRateInput(input) : {};
  const overlaps = input ? findOverlappingRates(input, rates, editingId ?? undefined) : [];

  return {
    isEditing: Boolean(editingId),
    isLoading: !input && resource.isLoading,
    errorMessage: !input
      ? resource.error
        ? getAccessErrorMessage(resource.error, 'No pudimos cargar la tarifa.')
        : !resource.isLoading
          ? 'No encontramos esta tarifa.'
          : null
      : null,
    retry: resource.retry,
    input,
    errors,
    overlapWarning:
      overlaps.length > 0
        ? `El rango se cruza con ${overlaps
            .map((rate) => `“${rate.name}” (${rate.postalCodeFrom}–${rate.postalCodeTo})`)
            .join(', ')}. Revisa qué tarifa quieres que pague el cliente.`
        : null,
    isSaving,
    saveError,
    setField(field: ShippingRateField, value: string) {
      const clean =
        field === 'postalCodeFrom' || field === 'postalCodeTo'
          ? value.replace(/\D/g, '').slice(0, 5)
          : field === 'amount'
            ? value.replace(/[^\d.]/g, '')
            : value;
      setInput((current) => (current ? { ...current, [field]: clean } : current));
    },
    setActive(active: boolean) {
      setInput((current) => (current ? { ...current, active } : current));
    },
    async save() {
      if (!input || isSaving) return;
      setSubmitted(true);
      if (Object.keys(validateShippingRateInput(input)).length > 0) return;
      setIsSaving(true);
      setSaveError(null);
      try {
        await adminDeliveryRepository.saveShippingRate(input, editingId ?? undefined);
        if (router.canGoBack()) router.back();
        else router.replace('/admin/shipping-rates');
      } catch (error) {
        setSaveError(getApiErrorMessage(error, 'No pudimos guardar la tarifa. Inténtalo de nuevo.'));
      } finally {
        setIsSaving(false);
      }
    },
    cancel() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/shipping-rates');
    },
  };
}
