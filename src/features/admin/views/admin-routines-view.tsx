import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/filter-chip';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SubHeader } from '@/components/ui/sub-header';
import { useAdminRoutinesViewModel } from '@/features/admin/viewmodels/use-admin-routines-view-model';
import { RoutineCard, RoutineCardsSkeleton } from '@/features/trainer/views/routine-card';
import { ICONS } from '@/features/trainer/views/trainer-ui';
import { AppColors } from '@/theme/tokens';

/** Pantalla 90 · Admin — Rutinas de los entrenadores. */
export function AdminRoutinesView() {
  const viewModel = useAdminRoutinesViewModel();
  const ready = !viewModel.isLoading && !viewModel.errorMessage;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl colors={[AppColors.brand.primary]} refreshing={viewModel.isRefreshing} tintColor={AppColors.brand.primary} onRefresh={viewModel.refresh} />
        }
        showsVerticalScrollIndicator={false}>
        <SubHeader subtitle={viewModel.subtitle} title="RUTINAS" onBack={viewModel.goBack} />
        {viewModel.showSkeleton ? <RoutineCardsSkeleton label="Cargando las rutinas" withSearch={false} /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
        {ready ? (
          <>
            <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {viewModel.filters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  selected={viewModel.selectedFilter === filter.value}
                  onPress={() => viewModel.selectFilter(filter.value)}
                />
              ))}
            </ScrollView>
            {viewModel.isEmpty ? (
              <IllustratedEmptyState description={viewModel.emptyCopy.description} icon={ICONS.clipboard} title={viewModel.emptyCopy.title} />
            ) : (
              viewModel.items.map((item, index) => <RoutineCard key={item.id} index={index} item={item} onOpen={viewModel.open} />)
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 32 },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
});
