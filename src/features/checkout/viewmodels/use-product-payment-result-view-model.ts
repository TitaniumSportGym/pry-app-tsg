import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { formatMoney } from '@/features/admin/models/admin-format';
import { getDeliverySummary, getItemCountLabel, type ClientOrder } from '@/features/orders/models/order';
import { ordersRepository } from '@/features/orders/repositories/orders-repository';
import { paymentsRepository } from '@/features/payments/repositories/payments-repository';
import { useOrderPaymentPolling } from '@/features/payments/viewmodels/use-order-payment-polling';
import { useCart } from '@/hooks/use-cart';

/**
 * Pantallas 33, 34, 57, 58 y 59 · Verificando pago → resultado de la compra de productos.
 * El carrito solo se vacía cuando el servidor confirma el pago; si se rechaza, se conserva
 * para reintentar.
 */
export function useProductPaymentResultViewModel(orderId: string | undefined) {
  const cart = useCart();
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const { clear } = cart;

  const onApproved = useCallback(() => {
    clear();
    ordersRepository.invalidate();
    paymentsRepository.invalidate();
  }, [clear]);

  const polling = useOrderPaymentPolling(orderId, onApproved);
  const validId = polling.orderId;

  // Resumen del pedido para la pantalla final; es informativo, el pago ya está decidido.
  const settled = polling.status === 'approved' || polling.status === 'rejected' || polling.status === 'still-pending';
  useEffect(() => {
    if (!validId || !settled) return;
    let active = true;
    ordersRepository
      .getOrder(validId, { force: true })
      .then((loaded) => {
        if (active) setOrder(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [validId, settled]);

  const paymentOrder = polling.order;
  const method = order?.fulfillment?.method ?? null;

  return {
    status: polling.status,
    method,
    orderLabel: order?.orderNumber ?? paymentOrder?.orderNumber ?? null,
    total:
      order ? formatMoney(order.total) : paymentOrder?.total != null ? formatMoney(paymentOrder.total) : null,
    summary: order
      ? {
          itemsLabel: getItemCountLabel(order),
          names: order.items.map((item) => item.name).join(' · '),
          thumbs: order.items.slice(0, 3).map((item) => ({ key: item.key, imageUrl: item.imageUrl })),
          delivery: getDeliverySummary(order),
          deliveryDetail:
            order.fulfillment?.method === 'pickup'
              ? (order.fulfillment.pickup?.name ?? 'Titanium Sport Gym')
              : (order.fulfillment?.addressLine ?? null),
        }
      : null,
    checkAgain: polling.checkAgain,
    openOrder() {
      if (validId) router.replace({ pathname: '/account/orders/[id]', params: { id: validId } });
      else router.replace('/account/orders');
    },
    openOrders() {
      router.replace('/account/orders');
    },
    retryPayment() {
      router.replace('/cart/checkout');
    },
    keepShopping() {
      if (router.canDismiss()) router.dismissAll();
      router.navigate('/store');
    },
  };
}
