import type { AppTab, TabBarCenterAction } from '@/components/navigation/app-tab-bar';

// Every role reaches its account menu from the "Más" tab.
const MORE_ICON: AppTab['icon'] = {
  ios: 'square.grid.2x2.fill',
  android: 'apps',
  web: 'apps',
};

export const CLIENT_TABS = [
  {
    name: 'home',
    href: '/',
    label: 'Inicio',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'store',
    href: '/store',
    label: 'Tienda',
    icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  },
  // The cart sits in the middle so it is always within reach.
  {
    name: 'cart',
    href: '/cart',
    label: 'Carrito',
    icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
  },
  {
    name: 'memberships',
    href: '/memberships',
    label: 'Membresías',
    icon: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
  },
  {
    name: 'more',
    href: '/account',
    label: 'Más',
    icon: MORE_ICON,
  },
] as const satisfies readonly AppTab[];

export const TRAINER_TABS = [
  {
    name: 'home',
    href: '/trainer',
    label: 'Inicio',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'clients',
    href: '/trainer/clients',
    label: 'Clientes',
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
  },
  {
    name: 'routines',
    href: '/trainer/routines',
    label: 'Rutinas',
    icon: { ios: 'list.bullet.clipboard.fill', android: 'assignment', web: 'assignment' },
  },
  { name: 'more', href: '/trainer/account', label: 'Más', icon: MORE_ICON },
] as const satisfies readonly AppTab[];

// El botón central "Escanear" no es una pestaña: abre la cámara (ver AdminTabsLayout).
export const ADMIN_TABS = [
  {
    name: 'home',
    href: '/admin',
    label: 'Inicio',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'orders',
    href: '/admin/orders',
    label: 'Pedidos',
    icon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  },
  {
    name: 'users',
    href: '/admin/users',
    label: 'Socios',
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
  },
  { name: 'more', href: '/admin/account', label: 'Más', icon: MORE_ICON },
] as const satisfies readonly AppTab[];

export const ADMIN_SCAN_ACTION = {
  label: 'Escanear',
  icon: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
} as const satisfies Omit<TabBarCenterAction, 'onPress'>;
