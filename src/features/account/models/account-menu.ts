import type { Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';

import type { UserRole } from '@/features/authorization/models/user-role';
import { getLegalRoutes } from '@/features/legal/models/legal-area';

export interface AccountMenuItem {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
  /** Without a route the option has no screen or endpoint yet and is shown as "Próximamente". */
  route?: Href;
}

export interface AccountMenuSection {
  title: string;
  items: AccountMenuItem[];
}

export interface RoleShortcut {
  title: string;
  description: string;
  route: Href;
}

const PROFILE: AccountMenuItem = {
  id: 'profile',
  label: 'Mi perfil',
  icon: { ios: 'person', android: 'person', web: 'person' },
};

const GYM_SECTION: AccountMenuSection = {
  title: 'TITANIUM SPORT GYM',
  items: [
    {
      id: 'schedule',
      label: 'Horarios y sucursal',
      icon: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
    },
    {
      id: 'support',
      label: 'Ayuda y soporte',
      icon: { ios: 'questionmark.circle', android: 'help', web: 'help' },
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
    },
  ],
};

function getPreferencesSection(role: UserRole): AccountMenuSection {
  const legal = getLegalRoutes(role);

  return {
    title: 'PREFERENCIAS',
    items: [
      {
        id: 'settings',
        label: 'Configuración',
        icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
      },
      {
        id: 'privacy',
        label: 'Privacidad y seguridad',
        icon: { ios: 'shield', android: 'shield', web: 'shield' },
        route: legal.privacy,
      },
      {
        id: 'terms',
        label: 'Términos y condiciones',
        icon: { ios: 'doc.text', android: 'description', web: 'description' },
        route: legal.terms,
      },
    ],
  };
}

const ROLE_SECTIONS: Record<UserRole, AccountMenuSection[]> = {
  cliente: [
    {
      title: 'MI CUENTA',
      items: [
        PROFILE,
        {
          id: 'membership',
          label: 'Mi membresía',
          icon: { ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' },
          route: '/memberships',
        },
        {
          id: 'payments',
          label: 'Pagos y comprobantes',
          icon: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
          route: '/account/payments',
        },
        {
          id: 'orders',
          label: 'Mis pedidos',
          icon: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
        },
        {
          id: 'payment-methods',
          label: 'Métodos de pago',
          icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
        },
      ],
    },
    {
      title: 'ENTRENAMIENTO',
      items: [
        {
          id: 'reservations',
          label: 'Reservas de clases',
          icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
        },
        {
          id: 'routines',
          label: 'Mis rutinas',
          icon: { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' },
          route: '/account/routines',
        },
        {
          id: 'progress',
          label: 'Mi progreso',
          icon: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
        },
        {
          id: 'favorites',
          label: 'Favoritos',
          icon: { ios: 'heart', android: 'favorite', web: 'favorite' },
        },
      ],
    },
    GYM_SECTION,
    getPreferencesSection('cliente'),
  ],
  entrenador: [
    {
      title: 'MI CUENTA',
      items: [
        PROFILE,
        {
          id: 'memberships',
          label: 'Membresías del gimnasio',
          icon: { ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' },
          route: '/trainer/account/memberships',
        },
      ],
    },
    {
      title: 'ENTRENAMIENTO',
      items: [
        {
          id: 'clients',
          label: 'Mis clientes',
          icon: { ios: 'person.2', android: 'group', web: 'group' },
          route: '/trainer/clients',
        },
        {
          id: 'routines',
          label: 'Mis rutinas',
          icon: { ios: 'list.bullet.clipboard', android: 'assignment', web: 'assignment' },
          route: '/trainer/routines',
        },
        {
          id: 'agenda',
          label: 'Agenda de clases',
          icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
        },
      ],
    },
    GYM_SECTION,
    getPreferencesSection('entrenador'),
  ],
  administrador: [
    { title: 'MI CUENTA', items: [PROFILE] },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        {
          id: 'users',
          label: 'Usuarios',
          icon: { ios: 'person.3', android: 'groups', web: 'groups' },
          route: '/admin/users',
        },
        {
          id: 'payments',
          label: 'Pagos',
          icon: { ios: 'creditcard', android: 'payments', web: 'payments' },
          route: '/admin/payments',
        },
      ],
    },
    GYM_SECTION,
    getPreferencesSection('administrador'),
  ],
};

const ROLE_SHORTCUTS: Record<UserRole, RoleShortcut> = {
  cliente: {
    title: 'Membresías Titanium',
    description: 'Consulta los planes y sus beneficios',
    route: '/memberships',
  },
  entrenador: {
    title: 'Panel del entrenador',
    description: 'Tus clientes y rutinas',
    route: '/trainer',
  },
  administrador: {
    title: 'Panel de administración',
    description: 'Usuarios y pagos del gimnasio',
    route: '/admin',
  },
};

const ROLE_LABELS: Record<UserRole, string> = {
  cliente: 'Cliente',
  entrenador: 'Entrenador',
  administrador: 'Administrador',
};

export function getAccountMenu(role: UserRole) {
  return ROLE_SECTIONS[role];
}

export function getRoleShortcut(role: UserRole) {
  return ROLE_SHORTCUTS[role];
}

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}
