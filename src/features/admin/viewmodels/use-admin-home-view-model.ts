import { router, type Href } from 'expo-router';

import {
  SAMPLE_ACCESS,
  summarizeOrders,
  summarizePayments,
} from '@/features/admin/models/admin-dashboard';
import { formatMoneyShort, formatTodayLabel, getAvatarInitials } from '@/features/admin/models/admin-format';
import { ADMIN_KEYS, adminRepository } from '@/features/admin/repositories/admin-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getMemberId } from '@/features/home/models/home';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

async function loadDashboard({ force }: LoadOptions) {
  const [orders, payments] = await Promise.all([
    adminRepository.getOrders({ force }),
    adminRepository.getPayments({ force }),
  ]);
  return { orders, payments };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Pantalla 46 · Admin — Inicio. */
export function useAdminHomeViewModel() {
  const { user } = useAuth();
  const resource = useAuthorizedResource(loadDashboard, { reloadOn: [ADMIN_KEYS.all] });
  const now = new Date();
  const memberId = getMemberId(user?.email) ?? 'Administrador';

  const orders = resource.data ? summarizeOrders(resource.data.orders) : null;
  const payments = resource.data ? summarizePayments(resource.data.payments, now) : null;
  // Mientras carga se muestra un guion en lugar de un cero que parezca real.
  const value = (amount: number | undefined) => (amount === undefined ? '—' : String(amount));

  return {
    greeting: `Hola, ${capitalize(memberId)}`,
    roleLabel: 'Administrador · Recepción',
    initials: getAvatarInitials(memberId),
    todayLabel: formatTodayLabel(now),
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No pudimos cargar el resumen del día.')
      : null,
    stats: {
      accessToday: { value: String(SAMPLE_ACCESS.today), detail: SAMPLE_ACCESS.vsYesterday },
      salesToday: {
        value: payments ? formatMoneyShort(payments.salesToday) : '—',
        detail: payments
          ? `${payments.paidTodayCount} ${payments.paidTodayCount === 1 ? 'pago' : 'pagos'}`
          : 'Cargando…',
      },
      toPrepare: { value: value(orders?.toPrepare), detail: 'pedidos' },
      expiringSoon: { value: String(SAMPLE_ACCESS.expiringSoon), detail: 'en 7 días' },
    },
    accessChart: {
      peakHour: SAMPLE_ACCESS.peakHour,
      bars: SAMPLE_ACCESS.byHour.map((bar) => ({
        ...bar,
        isCurrent: bar.hour === SAMPLE_ACCESS.currentHour,
      })),
    },
    pending: [
      {
        id: 'to-prepare',
        title: 'Pedidos por preparar',
        detail: 'Pago confirmado',
        count: orders?.toPrepare ?? 0,
        tone: 'brand',
        icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
        route: '/admin/orders',
      },
      {
        id: 'ready',
        title: 'Listos para recoger',
        detail: 'Esperando al cliente',
        count: orders?.readyForPickup ?? 0,
        tone: 'success',
        icon: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
        route: '/admin/orders',
      },
      {
        id: 'no-tracking',
        title: 'Envíos sin guía',
        detail: 'Empaquetados',
        count: orders?.packedWithoutTracking ?? 0,
        tone: 'brand',
        icon: { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' },
        route: '/admin/orders',
      },
      {
        id: 'pending-payments',
        title: 'Pagos pendientes',
        detail: 'Mercado Pago',
        count: payments?.pendingCount ?? 0,
        tone: 'neutral',
        icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
        route: '/admin/account/payments',
      },
    ] as const,
    latestAccess: SAMPLE_ACCESS.latest,
    retry: resource.retry,
    refresh: resource.refresh,
    open(route: Href) {
      router.push(route);
    },
  };
}
