import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  getDeliverySummary,
  getItemCountLabel,
  isAwaitingPayment,
  matchesOrderFilter,
  type ClientOrder,
  type OrderFilter,
} from '@/features/orders/models/order';
import { formatOrderDateTime, formatOrderMoney } from '@/features/orders/models/order-presentation';
import { ORDER_KEYS, ordersRepository } from '@/features/orders/repositories/orders-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'En curso' },
  { value: 'completed', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
];

function toCardItem(order: ClientOrder) {
  return {
    id: order.id,
    title: `Pedido #${order.orderNumber}`,
    date: order.createdAt ? formatOrderDateTime(order.createdAt) : '',
    status: order.fulfillment?.status ?? (isAwaitingPayment(order) ? 'awaiting_payment' : null),
    itemsLabel: getItemCountLabel(order),
    products: order.items.slice(0, 3).map((item) => ({ key: item.key, name: item.name, imageUrl: item.imageUrl })),
    delivery: getDeliverySummary(order),
    total: formatOrderMoney(order.total),
    actionLabel: order.fulfillment ? 'Ver seguimiento' : 'Ver detalle',
  };
}

export type OrderCardItem = ReturnType<typeof toCardItem>;

/** Pantallas 35, 38, 39 y 62 · Mis pedidos: lista, cargando, vacío y error. */
export function useOrdersViewModel() {
  const resource = useAuthorizedResource(ordersRepository.getOrders, { reloadOn: [ORDER_KEYS.all] });
  const [filter, setFilter] = useState<OrderFilter>('all');
  const orders = resource.data ?? [];

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    isEmpty: !resource.isLoading && !resource.error && orders.length === 0,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos tus pedidos.')
      : null,
    filters: FILTERS,
    selectedFilter: filter,
    items: orders.filter((order) => matchesOrderFilter(order, filter)).map(toCardItem),
    selectFilter: setFilter,
    retry: resource.retry,
    refresh: resource.refresh,
    open(orderId: string) {
      router.push({ pathname: '/account/orders/[id]', params: { id: orderId } });
    },
    openStore() {
      router.navigate('/store');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    },
  };
}
