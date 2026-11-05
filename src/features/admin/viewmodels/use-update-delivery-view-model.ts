import { router } from 'expo-router';
import { useState } from 'react';

import {
  getFulfillmentLabel,
  getNextStep,
  getTransitionOptions,
  type FulfillmentStatus,
} from '@/features/admin/models/admin-order';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';

export const CARRIERS = ['Estafeta', 'DHL', 'FedEx', 'Paquetexpress'] as const;
const TRACKING_MAX_LENGTH = 40;
const NOTE_MAX_LENGTH = 200;

/**
 * Pantalla 48 · Admin — Actualizar entrega.
 * El pedido sale de la lista ya cargada (el backend no tiene detalle por id). Guardar queda
 * pendiente: todavía no hay un endpoint confirmado para cambiar el estado logístico.
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

  const status = selected ?? (order ? (getNextStep(order)?.status ?? null) : null);

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
    select: setSelected,
    needsShippingData: status === 'shipped',
    carriers: CARRIERS,
    carrier,
    setCarrier,
    trackingNumber,
    trackingMaxLength: TRACKING_MAX_LENGTH,
    setTrackingNumber,
    note,
    noteMaxLength: NOTE_MAX_LENGTH,
    setNote,
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/orders');
    },
  };
}
