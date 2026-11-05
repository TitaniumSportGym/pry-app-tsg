import { router } from 'expo-router';
import { useState } from 'react';

import { formatMoney, formatRelativeDateTime } from '@/features/admin/models/admin-format';
import {
  getFulfillmentLabel,
  getFulfillmentTone,
  getNextStep,
  isInGroup,
  ORDER_GROUPS,
  searchOrders,
  type OrderGroup,
} from '@/features/admin/models/admin-order';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { usePagination } from '@/hooks/use-pagination';

const SKELETON_DELAY_MS = 300;
const SEARCH_MAX_LENGTH = 60;
/** Las tarjetas de pedido son altas (traen botón): 10 por página. */
const ORDERS_PER_PAGE = 10;

/** Pantalla 47 · Admin — Pedidos (solo compras de productos, que son las que tienen entrega). */
export function useAdminOrdersViewModel() {
  const resource = useAuthorizedResource(adminRepository.getOrders, {
    reloadOn: [ADMIN_KEYS.orders],
  });
  const [group, setGroup] = useState<OrderGroup>('to_prepare');
  const [query, setQuery] = useState('');

  const orders = resource.data ?? [];
  const now = new Date();
  const activeCount = orders.filter((order) =>
    ORDER_GROUPS.some((item) => isInGroup(order, item.value)),
  ).length;
  const visible = searchOrders(
    orders.filter((order) => isInGroup(order, group)),
    query,
  );
  // Cambiar de estado o buscar regresa a la primera página.
  const pagination = usePagination(visible, ORDERS_PER_PAGE, `${group}|${query.trim()}`);

  return {
    subtitle: resource.data
      ? `Compras de productos · ${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}`
      : 'Compras de productos',
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No pudimos cargar los pedidos.')
      : null,
    query,
    searchMaxLength: SEARCH_MAX_LENGTH,
    setQuery,
    groups: ORDER_GROUPS.map((item) => ({
      value: item.value,
      label: `${item.label} · ${orders.filter((order) => isInGroup(order, item.value)).length}`,
    })),
    selectedGroup: group,
    selectGroup: setGroup,
    emptyTitle: query.trim() ? 'SIN RESULTADOS' : 'TODO AL DÍA',
    emptyDescription: query.trim()
      ? 'Ningún pedido coincide con tu búsqueda.'
      : 'No hay pedidos en este estado.',
    pagination,
    orders: pagination.pageItems.map((order) => {
      const next = getNextStep(order);
      return {
        id: order.id,
        title: `Pedido #${order.orderNumber}`,
        paidLabel: order.paidAt ? `Pagado ${formatRelativeDateTime(order.paidAt, now)}` : 'Sin pago',
        statusLabel: getFulfillmentLabel(order.status),
        statusTone: getFulfillmentTone(order.status),
        status: order.status,
        customerName: order.customerName,
        initials: order.initials,
        itemsLabel: `${order.itemCount} ${order.itemCount === 1 ? 'producto' : 'productos'}`,
        total: formatMoney(order.total),
        isPickup: order.method === 'pickup',
        destination: `${order.method === 'pickup' ? 'Recoger en gimnasio' : 'Envío a domicilio'} · ${order.destination}`,
        nextStepLabel: next?.label ?? null,
        // El primer paso del flujo va en negro; los siguientes, en rojo (como en el diseño).
        nextStepVariant: order.status === 'payment_confirmed' ? ('dark' as const) : ('primary' as const),
      };
    }),
    retry: resource.retry,
    refresh: resource.refresh,
    openOrder(orderId: string) {
      router.push({ pathname: '/admin/delivery/[id]', params: { id: orderId } });
    },
  };
}
