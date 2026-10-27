import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { InfoListCard } from '@/components/ui/info-list-card';

export function AdminUsersView() {
  return (
    <AppSectionScreen title="USUARIOS" description="Clientes y entrenadores registrados.">
      <InfoListCard
        icon={{ ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' }}
        title="Sección en preparación"
        description="Pronto podrás consultar aquí a los usuarios."
      />
    </AppSectionScreen>
  );
}
