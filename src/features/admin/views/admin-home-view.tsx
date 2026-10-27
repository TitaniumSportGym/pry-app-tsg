import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { InfoListCard } from '@/components/ui/info-list-card';
import { useAdminHomeViewModel } from '@/features/admin/viewmodels/use-admin-home-view-model';

export function AdminHomeView() {
  const viewModel = useAdminHomeViewModel();

  return (
    <AppSectionScreen
      eyebrow="PANEL DE ADMINISTRACIÓN"
      title="HOLA, ADMINISTRADOR"
      description={viewModel.email}>
      <InfoListCard
        icon={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
        title="Usuarios"
        description="Consulta los clientes y entrenadores registrados."
      />
      <InfoListCard
        icon={{ ios: 'creditcard.fill', android: 'payments', web: 'payments' }}
        title="Pagos"
        description="Revisa los pagos de membresías."
      />
    </AppSectionScreen>
  );
}
