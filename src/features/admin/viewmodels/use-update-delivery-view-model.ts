import { router } from 'expo-router';
import { useState } from 'react';

import {
  getFulfillmentLabel,
  getNextStep,
  getTransitionOptions,
  type FulfillmentStatus,
} from '@/features/admin/models/admin-order';
import {
  NOTE_MAX_LENGTH,
  TRACKING_MAX_LENGTH,
  validateFulfillmentUpdate,
} from '@/features/admin/models/fulfillment-update';
import { adminDeliveryRepository } from '@/features/admin/repositories/admin-delivery-repository';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { getApiErrorMessage } from '@/utils/api-error-message';

export const CARRIERS = ['Estafeta', 'DHL', 'FedEx', 'Paquetexpress'] as const;

/**
 * Pantallas 48 y 69 · Admin — Actualizar entrega (PATCH /api/admin/orders/:id/fulfillment).
 * El pedido sale de la lista ya cargada (el backend no tiene detalle por id). Se envía el estado
 * que vio el administrador; si otro usuario lo cambió antes, el backend lo rechaza y la lista se
 * recarga para mostrar el estado actual.
 */
export function useUpdateDeliveryViewModel(orderId: string | undefined) {
  const resource = useAuthorizedResource(adminRepository.getOrders, {
    reloadOn: [ADMIN_KEYS.orders],
  });
  const order = resource.data?.find((item) => item.id === orderId) ?? null;
  const [selected, setSelected] = useState<FulfillmentStatus | null>(null);
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const status = selected ?? (order ? (getNextStep(order)?.status ?? null) : null);
  const input = order && status
    ? { status, expectedStatus: order.status, carrier, trackingNumber, note }
    : null;
  const errors = submitted && input ? validateFulfillmentUpdate(input) : {};

  return {
    isLoading: resource.isLoading,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No pudimos cargar el pedido.')
      : !resource.isLoading && !order
        ? 'Este pedido ya no aparece entre los recientes.'
        : null,
    retry: resource.retry,
    subtitle: order ? `Pedido #${order.orderNumber} · ${order.customerName}` : 'Pedido',
    currentStatus: order?.status ?? null,
    currentStatusLabel: order ? getFulfillmentLabel(order.status) : '',
    options: order ? getTransitionOptions(order) : [],
    selectedStatus: status,
    select(next: FulfillmentStatus) {
      setSaveError(null);
      setSelected(next);
    },
    needsShippingData: status === 'shipped',
    carriers: CARRIERS,
    carrier,
    setCarrier,
    trackingNumber,
    trackingMaxLength: TRACKING_MAX_LENGTH,
    trackingError: errors.trackingNumber ?? null,
    setTrackingNumber,
    note,
    noteMaxLength: NOTE_MAX_LENGTH,
    setNote,
    canSave: Boolean(input) && !isSaving,
    isSaving,
    saveError,
    async save() {
      if (!order || !input || isSaving) return;
      setSubmitted(true);
      if (Object.keys(validateFulfillmentUpdate(input)).length > 0) return;
      setIsSaving(true);
      setSaveError(null);
      try {
        await adminDeliveryRepository.updateFulfillment(order.id, input);
        if (router.canGoBack()) router.back();
        else router.replace('/admin/orders');
      } catch (error) {
        setSaveError(getApiErrorMessage(error, 'No pudimos guardar el estado. Inténtalo de nuevo.'));
        // Si otro usuario movió el pedido, se muestra su estado actual para decidir de nuevo.
        resource.refresh();
        setSelected(null);
      } finally {
        setIsSaving(false);
      }
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/orders');
    },
  };
}
