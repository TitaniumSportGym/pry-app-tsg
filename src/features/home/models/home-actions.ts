import type { SymbolViewProps } from 'expo-symbols';

export type HomeActionId = 'memberships' | 'payments' | 'store' | 'reserve';

export interface HomeAction {
  id: HomeActionId;
  label: string;
  icon: SymbolViewProps['name'];
  /** False while the backend has no endpoint for it; shown as "Próximamente". */
  available: boolean;
}

export const HOME_ACTIONS: readonly HomeAction[] = [
  {
    id: 'memberships',
    label: 'Membresía',
    icon: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
    available: true,
  },
  {
    id: 'payments',
    label: 'Mis pagos',
    icon: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
    available: false,
  },
  {
    id: 'store',
    label: 'Tienda',
    icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
    available: true,
  },
  {
    id: 'reserve',
    label: 'Reservar',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    available: false,
  },
];
