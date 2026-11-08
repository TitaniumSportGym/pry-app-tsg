import type { Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';

import type { AdminCatalogCounts } from '@/features/admin/repositories/admin-repository';

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
  /** Dato a la derecha (contador o estado). */
  meta?: string;
  /** Sin ruta, la opción aún no tiene pantalla ni endpoint y se muestra como "Próximamente". */
  route?: Href;
}

export interface AdminMenuSection {
  title: string;
  items: AdminMenuItem[];
}

export interface AdminMenuCounts extends AdminCatalogCounts {
  plans: number;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Pantalla 50 · Admin — Más. Los contadores llegan del backend cuando ya cargaron. */
export function getAdminMenu(counts: AdminMenuCounts | null): AdminMenuSection[] {
  return [
    {
      title: 'TIENDA Y ENTREGAS',
      items: [
        {
          id: 'products',
          label: 'Productos',
          icon: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
          meta: counts ? String(counts.products) : undefined,
        },
        {
          id: 'shipping-rates',
          label: 'Tarifas de envío',
          icon: { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' },
          meta: counts ? plural(counts.activeShippingRates, 'activa', 'activas') : undefined,
          route: '/admin/shipping-rates',
        },
        {
          id: 'pickup',
          label: 'Punto de recogida',
          icon: { ios: 'storefront', android: 'storefront', web: 'storefront' },
          meta: 'Disponible',
          route: '/admin/pickup-point',
        },
      ],
    },
    {
      title: 'MEMBRESÍAS Y PAGOS',
      items: [
        {
          id: 'plans',
          label: 'Planes de membresía',
          icon: { ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' },
          meta: counts ? String(counts.plans) : undefined,
        },
        {
          id: 'payments',
          label: 'Pagos',
          icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
          route: '/admin/account/payments',
        },
        {
          id: 'receipts',
          label: 'Comprobantes',
          icon: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
        },
      ],
    },
    {
      title: 'ENTRENAMIENTO',
      items: [
        {
          id: 'routines',
          label: 'Rutinas',
          icon: { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' },
          meta: counts ? String(counts.routines) : undefined,
        },
        {
          id: 'classes',
          label: 'Clases y horarios',
          icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
        },
      ],
    },
    {
      title: 'REPORTES',
      items: [
        {
          id: 'sales',
          label: 'Ventas',
          icon: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
        },
        {
          id: 'access',
          label: 'Accesos',
          icon: { ios: 'person.2', android: 'group', web: 'group' },
        },
      ],
    },
  ];
}
