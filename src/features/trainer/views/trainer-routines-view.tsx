import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useTrainerRoutinesViewModel } from '@/features/trainer/viewmodels/use-trainer-routines-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function TrainerRoutinesView() {
  const viewModel = useTrainerRoutinesViewModel();

  return (
    <AppSectionScreen
      title="RUTINAS"
      description="Rutinas creadas por ti."
      refreshing={viewModel.isRefreshing}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        <LoadingState label="Cargando rutinas…" />
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : viewModel.routines.length === 0 ? (
        <EmptyState
          icon={{ ios: 'list.bullet.clipboard', android: 'assignment', web: 'assignment' }}
          title="Aún no tienes rutinas"
          description="Las rutinas que crees aparecerán en esta lista."
        />
      ) : (
        viewModel.routines.map((routine) => (
          <Pressable
            key={routine.id}
            accessibilityLabel={`Ver rutina ${routine.title}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => viewModel.openRoutine(routine.id)}>
            {routine.imageUrl ? (
              <Image contentFit="cover" source={{ uri: routine.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <SymbolView
                  name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }}
                  size={28}
                  tintColor={AppColors.brand.primary}
                />
              </View>
            )}
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  {routine.title}
                </Text>
                <Text
                  style={[styles.status, routine.isPublished ? styles.published : styles.draft]}>
                  {routine.statusLabel}
                </Text>
              </View>
              {routine.objective ? (
                <Text numberOfLines={1} style={styles.objective}>
                  {routine.objective}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {routine.level} · {routine.exerciseCount}{' '}
                {routine.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
              <Text style={styles.meta}>{routine.schedule}</Text>
            </View>
          </Pressable>
        ))
      )}
    </AppSectionScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 8,
    backgroundColor: AppColors.surface.default,
  },
  image: { width: '100%', height: 132 },
  imagePlaceholder: {
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: AppSpacing.one, padding: AppSpacing.three },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.two },
  title: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  status: {
    overflow: 'hidden',
    borderRadius: 4,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
    paddingHorizontal: AppSpacing.two,
    paddingVertical: AppSpacing.half,
  },
  published: { backgroundColor: AppColors.feedback.successSoft, color: AppColors.feedback.success },
  draft: { backgroundColor: AppColors.surface.soft, color: AppColors.neutral.description },
  objective: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  meta: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  pressed: { opacity: 0.7 },
});
