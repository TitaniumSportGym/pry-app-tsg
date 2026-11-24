import { router } from 'expo-router';
import { useState } from 'react';

import {
  PICKUP_LIMITS,
  validatePickupSettings,
  type PickupSettings,
} from '@/features/admin/models/pickup-point';
import {
  adminDeliveryRepository,
  PICKUP_SETTINGS_KEY,
} from '@/features/admin/repositories/admin-delivery-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { getApiErrorMessage } from '@/utils/api-error-message';

/** Pantallas 52 y 76 · Admin — Punto de recogida (GET/PUT /api/admin/pickup-settings). */
export function usePickupPointViewModel() {
  const resource = useAuthorizedResource(adminDeliveryRepository.getPickupSettings, {
    reloadOn: [PICKUP_SETTINGS_KEY],
  });
  const [form, setForm] = useState<PickupSettings | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // El formulario se llena una sola vez con lo que tiene el servidor; después es del administrador.
  if (!form && resource.data) setForm(resource.data);

  const errors = submitted && form ? validatePickupSettings(form) : {};

  return {
    isLoading: resource.isLoading && !form,
    errorMessage:
      resource.error && !form
        ? getAccessErrorMessage(resource.error, 'No pudimos cargar el punto de recogida.')
        : null,
    retry: resource.retry,
    form,
    errors,
    limits: PICKUP_LIMITS,
    isSaving,
    saveError,
    saved: savedAt !== null,
    update<K extends keyof PickupSettings>(key: K, value: PickupSettings[K]) {
      setSavedAt(null);
      setForm((current) =>
        current
          ? { ...current, [key]: key === 'postalCode' ? String(value).replace(/\D/g, '').slice(0, 5) : value }
          : current,
      );
    },
    async save() {
      if (!form || isSaving) return;
      setSubmitted(true);
      if (Object.keys(validatePickupSettings(form)).length > 0) return;
      setIsSaving(true);
      setSaveError(null);
      try {
        setForm(await adminDeliveryRepository.savePickupSettings(form));
        setSavedAt(Date.now());
      } catch (error) {
        setSaveError(getApiErrorMessage(error, 'No pudimos guardar los cambios. Inténtalo de nuevo.'));
      } finally {
        setIsSaving(false);
      }
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/account');
    },
  };
}
