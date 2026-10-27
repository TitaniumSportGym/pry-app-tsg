import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useTrainerClientsViewModel } from '@/features/trainer/viewmodels/use-trainer-clients-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function TrainerClientsView() {
  const viewModel = useTrainerClientsViewModel();

  return (
    <AppSectionScreen
      title="CLIENTES"
      description="Clientes asignados a tu cuenta."
      refreshing={viewModel.isRefreshing}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        <LoadingState label="Cargando clientes…" />
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : viewModel.clients.length === 0 ? (
        <EmptyState
          icon={{ ios: 'person.2', android: 'group', web: 'group' }}
          title="Aún no tienes clientes asignados"
          description="Cuando un cliente se asigne contigo aparecerá en esta lista."
        />
      ) : (
        viewModel.clients.map((client) => (
          <View key={client.id} style={styles.card}>
            <View style={styles.avatar}>
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                size={22}
                tintColor={AppColors.neutral.white}
              />
            </View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.name}>
                {client.displayName}
              </Text>
              {client.displayName !== client.email ? (
                <Text numberOfLines={1} style={styles.email}>
                  {client.email}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </AppSectionScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 8,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.three,
    padding: AppSpacing.three,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { minWidth: 0, flex: 1 },
  name: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  email: {
    marginTop: AppSpacing.half,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
});
