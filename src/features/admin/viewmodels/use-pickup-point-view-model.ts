import { router } from 'expo-router';
import { useState } from 'react';

import { PICKUP_POINT } from '@/features/admin/models/pickup-point';

/** Pantalla 52 · Admin — Punto de recogida. Formulario local; guardar queda pendiente del backend. */
export function usePickupPointViewModel() {
  const [form, setForm] = useState({
    available: PICKUP_POINT.available as boolean,
    name: PICKUP_POINT.name as string,
    address: PICKUP_POINT.address as string,
    municipality: PICKUP_POINT.municipality as string,
    postalCode: PICKUP_POINT.postalCode as string,
    phone: PICKUP_POINT.phone as string,
    instructions: PICKUP_POINT.instructions as string,
  });

  return {
    form,
    schedule: PICKUP_POINT.schedule,
    update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
      setForm((current) => ({ ...current, [key]: value }));
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/account');
    },
  };
}
