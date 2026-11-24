import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/filter-chip';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { useTrainerRoutinesViewModel } from '@/features/trainer/viewmodels/use-trainer-routines-view-model';
import { RoutineCard, RoutineCardsSkeleton } from '@/features/trainer/views/routine-card';
import { ICONS } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 77–79 · Entrenador — Mis rutinas. */
export function TrainerRoutinesView() {
  const viewModel = useTrainerRoutinesViewModel();
  const showList = !viewModel.isLoading && !viewModel.errorMessage && !viewModel.isEmpty;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.title}>
              MIS RUTINAS
            </Text>
            <Text style={styles.subtitle}>{viewModel.subtitle}</Text>
          </View>
          <Pressable
            accessibilityLabel="Nueva rutina"
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={viewModel.create}>
            <SymbolView name={ICONS.plus} size={22} tintColor={AppColors.neutral.white} />
          </Pressable>
        </View>

        {viewModel.showSkeleton ? <RoutineCardsSkeleton label="Cargando tus rutinas" /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
        {viewModel.isEmpty ? (
          <IllustratedEmptyState
            actionLabel="Crear rutina"
            description="Crea tu primera rutina con ejercicios, portada y videos. El administrador la revisa antes de publicarla para los socios."
            icon={ICONS.clipboard}
            title="AÚN NO TIENES RUTINAS"
            onAction={viewModel.create}
          />
        ) : null}

        {showList ? (
          <>
            <View style={styles.search}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={19} tintColor={AppColors.neutral.muted} />
              <TextInput
                accessibilityLabel="Buscar rutinas"
                placeholder="Buscar por nombre u objetivo"
                placeholderTextColor={AppColors.neutral.placeholder}
                style={styles.searchInput}
                value={viewModel.query}
                onChangeText={viewModel.setQuery}
              />
            </View>
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
            <View style={styles.note}>
              <SymbolView name={ICONS.info} size={16} tintColor={AppColors.neutral.muted} />
              <Text style={styles.noteText}>Tus rutinas se publican para los socios cuando el administrador las aprueba.</Text>
            </View>
            {viewModel.items.length === 0 ? (
              <Text style={styles.noMatches}>No hay rutinas con este filtro.</Text>
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
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 124 },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  subtitle: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  search: { minHeight: 50, alignItems: 'center', flexDirection: 'row', gap: 10, borderRadius: 16, backgroundColor: AppColors.surface.input, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: AppColors.neutral.text, fontFamily: AppFonts.body, fontSize: AppFontSizes.body, paddingVertical: 12 },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  note: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  noteText: { flex: 1, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  noMatches: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20, textAlign: 'center', paddingVertical: 32 },
});
