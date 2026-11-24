import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SubHeader } from '@/components/ui/sub-header';
import { useAddressesViewModel } from '@/features/delivery/viewmodels/use-addresses-view-model';
import { AddressCard, PIN_ICON } from '@/features/delivery/views/address-card';
import { AddressesSkeleton } from '@/features/delivery/views/addresses-skeleton';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 31, 61 y 71 · Mis direcciones. */
export function AddressesView() {
  const viewModel = useAddressesViewModel();

  function confirmRemove(addressId: string) {
    Alert.alert('¿Eliminar dirección?', 'Ya no podrás elegirla para tus envíos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void viewModel.remove(addressId) },
    ]);
  }

  const hasList = !viewModel.isLoading && !viewModel.errorMessage && !viewModel.isEmpty;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <SubHeader subtitle="Para tus envíos a domicilio" title="MIS DIRECCIONES" onBack={viewModel.goBack} />

        {viewModel.showSkeleton ? <AddressesSkeleton /> : null}

        {viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : null}

        {viewModel.isEmpty ? (
          <IllustratedEmptyState
            actionLabel="Agregar dirección"
            description="Agrega una dirección para recibir tus productos en casa. También puedes recogerlos gratis en el gimnasio."
            icon={PIN_ICON}
            title="AÚN NO TIENES DIRECCIONES"
            onAction={viewModel.add}
          />
        ) : null}

        {hasList ? (
          <View style={styles.list}>
            {viewModel.actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {viewModel.actionError}
              </Text>
            ) : null}
            {viewModel.items.map((item) => (
              <AddressCard
                key={item.id}
                busy={viewModel.busyId === item.id}
                item={item}
                onEdit={viewModel.edit}
                onMakeDefault={(id) => void viewModel.makeDefault(id)}
                onRemove={confirmRemove}
              />
            ))}
            <View style={styles.note}>
              <SymbolView
                name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                size={16}
                tintColor={AppColors.neutral.muted}
              />
              <Text style={styles.noteText}>
                Las direcciones solo se usan para envíos de productos. Las membresías no requieren
                dirección.
              </Text>
            </View>
            <AppButton title="Agregar dirección" onPress={viewModel.add} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  list: { gap: 12 },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  note: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, paddingVertical: 4 },
  noteText: {
    flex: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
