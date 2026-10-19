import type { SymbolViewProps } from 'expo-symbols';

export type ServiceId = 'memberships';

export interface ServiceOption {
  id: ServiceId;
  description: string;
  icon: SymbolViewProps['name'];
  title: string;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'memberships',
    title: 'Membresías',
    description: 'Consulta los planes disponibles, sus precios y beneficios.',
    icon: { ios: 'creditcard.fill', android: 'card_membership', web: 'card_membership' },
  },
];
