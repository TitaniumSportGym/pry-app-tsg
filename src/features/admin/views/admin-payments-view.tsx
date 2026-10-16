import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { InfoListCard } from '@/components/ui/info-list-card';

export function AdminPaymentsView() {
  return (
    <AppSectionScreen title="PAGOS" description="Pagos de membresías registrados.">
      <InfoListCard
        icon={{ ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' }}
        title="Sección en preparación"
        description="Pronto podrás consultar aquí los pagos."
      />
    </AppSectionScreen>
  );
}
