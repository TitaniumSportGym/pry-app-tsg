import { SymbolView } from 'expo-symbols';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { AppButton } from '@/components/ui/app-button';
import { InfoListCard } from '@/components/ui/info-list-card';
import { useAdminHomeViewModel } from '@/features/admin/viewmodels/use-admin-home-view-model';
import { AppColors } from '@/theme/tokens';

export function AdminHomeView() {
  const viewModel = useAdminHomeViewModel();

  return (
    <AppSectionScreen
      eyebrow="PANEL DE ADMINISTRACIÓN"
      title="HOLA, ADMINISTRADOR"
      description={viewModel.email}>
      <AppButton
        accessibilityHint="Abre la cámara para leer el código QR del socio"
        leftIcon={
          <SymbolView
            name={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
            size={20}
            tintColor={AppColors.neutral.white}
          />
        }
        title="Escanear acceso"
        onPress={viewModel.openScanner}
      />
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
