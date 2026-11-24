import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/layout/page-header';
import { AppButton } from '@/components/ui/app-button';
import { FilterChip } from '@/components/ui/filter-chip';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import {
  useRoutinesViewModel,
  type RoutineFilterOption,
} from '@/features/training/viewmodels/use-routines-view-model';
import { RoutineCard, type RoutineCardItem } from '@/features/training/views/routine-card';
import {
  RoutinesSkeleton,
  RoutinesSubtitleSkeleton,
} from '@/features/training/views/routine-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const DUMBBELL_ICON = { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' } as const;

/** Screens 22, 24 and 25 · Rutinas: list, loading and empty states. */
export function RoutinesView() {
  const viewModel = useRoutinesViewModel();
  const isReady = viewModel.state === 'ready';
  const listRef = useRef<FlatList<RoutineCardItem>>(null);
  const { pagination } = viewModel;

  function changePage(page: number) {
    pagination.setPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const header = (
    <View style={styles.headerBlock}>
      <PageHeader
        action={
          isReady
            ? {
                icon: {
                  ios: 'line.3.horizontal.decrease',
                  android: 'filter_list',
                  web: 'filter_list',
                },
                label: viewModel.showLevels ? 'Ocultar filtro de nivel' : 'Filtrar por nivel',
                selected: viewModel.isFiltering,
                onPress: viewModel.toggleLevels,
              }
            : undefined
        }
        subtitle={
          viewModel.state === 'loading' ? <RoutinesSubtitleSkeleton /> : viewModel.subtitle
        }
        title="RUTINAS"
        onBack={viewModel.goBack}
      />
      {isReady ? (
        <>
          <SearchField
            maxLength={viewModel.maxQueryLength}
            placeholder="Nombre, objetivo o descripción"
            value={viewModel.query}
            variant="outlined"
            onChangeText={viewModel.setQuery}
          />
          <ChipRow
            options={viewModel.categories}
            selected={viewModel.selectedCategory}
            onSelect={viewModel.selectCategory}
          />
          {viewModel.showLevels ? (
            <ChipRow
              options={viewModel.levels}
              selected={viewModel.selectedLevel}
              onSelect={viewModel.selectLevel}
            />
          ) : null}
          <View style={styles.notice}>
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' }}
              size={16}
              tintColor={AppColors.neutral.muted}
            />
            <Text style={styles.noticeText}>
              Solo ves las rutinas disponibles para socios con membresía activa.
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.content}
        data={isReady ? viewModel.routines : []}
        initialNumToRender={4}
        keyExtractor={(routine) => routine.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<RoutinesEmpty viewModel={viewModel} />}
        ListFooterComponent={
          isReady ? (
            <Pagination
              itemLabel="rutinas"
              page={pagination.page}
              pageCount={pagination.pageCount}
              rangeEnd={pagination.rangeEnd}
              rangeStart={pagination.rangeStart}
              totalItems={pagination.totalItems}
              onPageChange={changePage}
            />
          ) : undefined
        }
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        renderItem={({ item, index }) => (
          <RoutineCard
            index={pagination.rangeStart - 1 + index}
            routine={item}
            onPress={viewModel.openRoutine}
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function RoutinesEmpty({ viewModel }: { viewModel: ReturnType<typeof useRoutinesViewModel> }) {
  switch (viewModel.state) {
    case 'loading':
      return viewModel.showSkeleton ? <RoutinesSkeleton /> : null;
    case 'error':
      return <ErrorState message={viewModel.errorMessage ?? ''} onRetry={viewModel.retry} />;
    case 'locked':
      return (
        <IllustratedEmptyState
          actionLabel="Ver membresías"
          description="Las rutinas del equipo Titanium se activan con tu membresía. Contrata o renueva tu plan para verlas aquí."
          icon={DUMBBELL_ICON}
          title="AÚN NO HAY RUTINAS PARA TI"
          onAction={viewModel.openMemberships}
          onRefresh={viewModel.retry}
        />
      );
    case 'empty':
      return (
        <IllustratedEmptyState
          description="El equipo Titanium aún no publica rutinas. Vuelve pronto para empezar a entrenar con ellas."
          icon={DUMBBELL_ICON}
          title="AÚN NO HAY RUTINAS PUBLICADAS"
          onRefresh={viewModel.retry}
        />
      );
    case 'ready':
      return (
        <View style={styles.noResults}>
          <EmptyState
            description="Prueba con otra búsqueda, categoría o nivel."
            icon={DUMBBELL_ICON}
            title="No encontramos rutinas con esos filtros."
          />
          <AppButton title="Quitar filtros" variant="outline" onPress={viewModel.clearFilters} />
        </View>
      );
  }
}

interface ChipRowProps {
  options: RoutineFilterOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

function ChipRow({ options, selected, onSelect }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.chips}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.chipRow}>
      {options.map((option) => (
        <FilterChip
          key={option.value ?? 'all'}
          label={option.label}
          selected={selected === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 680,
    flexGrow: 1,
    alignSelf: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  headerBlock: { gap: 12 },
  chipRow: { marginHorizontal: -20 },
  chips: { gap: AppSpacing.two, paddingHorizontal: 20 },
  notice: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingTop: AppSpacing.one },
  noticeText: {
    flex: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  noResults: { gap: AppSpacing.two },
});
