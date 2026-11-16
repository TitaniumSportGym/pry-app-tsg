import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { deliveryRepository } from '@/features/delivery/repositories/delivery-repository';
import {
  getFulfillmentLabel,
  getFulfillmentTone,
} from '@/features/orders/models/fulfillment-status';
import {
  buildTimeline,
  canCancelOrder,
  formatRecipient,
  getLegacyOrderLabel,
  isAwaitingPayment,
} from '@/features/orders/models/order';
import {
  formatOrderDateTime,
  formatOrderMoney,
  getStatusDescription,
  getTotalsRows,
  LEGACY_ORDER_DESCRIPTION,
} from '@/features/orders/models/order-presentation';
import { ORDER_KEYS, ordersRepository } from '@/features/orders/repositories/orders-repository';
import type { LoadOptions } from '@/hooks/use-authorized-resource';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

const SKELETON_DELAY_MS = 300;

/** Pantallas 36, 37, 63–66, 70 y 72 · Detalle y seguimiento del pedido. */
export function useOrderDetailViewModel(orderId: string | undefined) {
  const validId = isUuid(orderId) ? orderId : null;
  const load = useCallback(
    (options: LoadOptions) =>
      validId
        ? ordersRepository.getOrder(validId, options)
        : Promise.reject(new ApiError('Pedido no encontrado.', 404)),
    [validId],
  );
  const resource = useAuthorizedResource(load, { reloadOn: [ORDER_KEYS.all] });
  const [gymPhone, setGymPhone] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // El teléfono del gimnasio es opcional: solo habilita "Contactar al gimnasio".
  useEffect(() => {
    let active = true;
    deliveryRepository
      .getOptions()
      .then(({ pickupLocation }) => {
        if (active && pickupLocation?.phone) setGymPhone(pickupLocation.phone);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const order = resource.data;
  const fulfillment = order?.fulfillment ?? null;
  const tone = fulfillment
    ? getFulfillmentTone(fulfillment.status)
    : order && isAwaitingPayment(order)
      ? 'pending'
      : order?.orderStatus === 'cancelled'
        ? 'error'
        : 'done';

  const detail = order
    ? {
        title: `PEDIDO #${order.orderNumber}`,
        subtitle: order.createdAt ? `Comprado el ${formatOrderDateTime(order.createdAt)}` : '',
        status: {
          overline: fulfillment?.method === 'delivery' ? 'Estado del envío' : 'Estado del pedido',
          title: (fulfillment
            ? getFulfillmentLabel(fulfillment.status)
            : getLegacyOrderLabel(order.orderStatus)
          ).toUpperCase(),
          description: fulfillment
            ? getStatusDescription(fulfillment.status)
            : isAwaitingPayment(order)
              ? getStatusDescription('awaiting_payment')
              : LEGACY_ORDER_DESCRIPTION,
          tone,
          method: fulfillment?.method ?? null,
          tracking:
            fulfillment?.trackingNumber
              ? { carrier: fulfillment.carrier ?? 'Paquetería', number: fulfillment.trackingNumber }
              : null,
        },
        timeline: fulfillment
          ? buildTimeline(fulfillment).map((step) => ({
              ...step,
              dateLabel: step.date ? formatOrderDateTime(step.date) : null,
            }))
          : [],
        delivery: fulfillment
          ? fulfillment.method === 'pickup'
            ? {
                kind: 'pickup' as const,
                title: fulfillment.pickup?.name ?? 'Titanium Sport Gym',
                lines: [
                  fulfillment.pickup?.address ?? '',
                  fulfillment.recipientName ? `Recoge: ${formatRecipient(fulfillment)}` : '',
                ].filter(Boolean),
              }
            : {
                kind: 'delivery' as const,
                title: formatRecipient(fulfillment) || 'Dirección de entrega',
                lines: [fulfillment.addressLine ?? 'Dirección no registrada'],
              }
          : null,
        items: order.items.map((item) => ({
          key: item.key,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: `Cantidad: ${item.quantity}`,
          total: formatOrderMoney(item.lineTotal),
        })),
        payment: order.payment
          ? {
              status: order.payment.status,
              date: formatOrderDateTime(order.payment.date),
            }
          : null,
        totals: getTotalsRows(order),
        total: formatOrderMoney(order.total),
        canCancel: canCancelOrder(order),
      }
    : null;

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos este pedido.')
      : null,
    detail,
    isCancelling,
    actionError,
    canContactGym: Boolean(gymPhone),
    retry: resource.retry,
    refresh: resource.refresh,
    async cancel() {
      if (!validId || isCancelling) return;
      setIsCancelling(true);
      setActionError(null);
      try {
        await ordersRepository.cancelOrder(validId);
      } catch (error) {
        setActionError(getApiErrorMessage(error, 'No pudimos cancelar el pedido. Inténtalo de nuevo.'));
      } finally {
        setIsCancelling(false);
      }
    },
    contactGym() {
      if (gymPhone) void Linking.openURL(`tel:${gymPhone.replace(/\s/g, '')}`);
    },
    openStore() {
      router.navigate('/store');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account/orders');
    },
  };
}
