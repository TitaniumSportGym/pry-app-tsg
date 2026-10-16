import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useTrainerRoutineDetailViewModel } from '@/features/trainer/viewmodels/use-trainer-routine-detail-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface TrainerRoutineDetailViewProps {
  routineId: unknown;
}

export function TrainerRoutineDetailView({ routineId }: TrainerRoutineDetailViewProps) {
  const viewModel = useTrainerRoutineDetailViewModel(routineId);
  const routine = viewModel.routine;

  return (
    <AppSectionScreen
      eyebrow="DETALLE DE RUTINA"
      title={routine ? routine.title.toUpperCase() : 'RUTINA'}
      description={routine ? routine.schedule : ''}
      refreshing={viewModel.isRefreshing}
      onBack={viewModel.goBack}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        <LoadingState label="Cargando rutina…" />
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : routine ? (
        <>
          {routine.imageUrl ? (
            <Image contentFit="cover" source={{ uri: routine.imageUrl }} style={styles.image} />
          ) : null}

          <View style={styles.card}>
            <InfoRow label="Objetivo" value={routine.objective} />
            <InfoRow label="Nivel" value={routine.level} />
            <InfoRow label="Categoría" value={routine.category} />
            <InfoRow label="Estado" value={routine.statusLabel} />
            {routine.description ? (
              <Text style={styles.description}>{routine.description}</Text>
            ) : null}
          </View>

          {routine.days.length === 0 ? (
            <EmptyState
              icon={{ ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' }}
              title="Esta rutina no tiene ejercicios"
              description="Agrega ejercicios a la rutina para verlos aquí."
            />
          ) : (
            routine.days.map((day) => (
              <View key={day.dayNumber} style={styles.day}>
                <Text style={styles.dayTitle}>DÍA {day.dayNumber}</Text>
                {day.exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.card}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.prescription}>{exercise.prescription}</Text>
                    {exercise.description ? (
                      <Text style={styles.description}>{exercise.description}</Text>
                    ) : null}
                    {exercise.notes ? (
                      <Text style={styles.notes}>Nota: {exercise.notes}</Text>
                    ) : null}
                    {exercise.videoUrl ? (
                      <AppButton
                        leftIcon={
                          <SymbolView
                            name={{ ios: 'play.rectangle.fill', android: 'smart_display', web: 'smart_display' }}
                            size={19}
                            tintColor={AppColors.neutral.text}
                          />
                        }
                        style={styles.videoButton}
                        title="Ver video"
                        variant="outline"
                        onPress={() => viewModel.openVideo(exercise.videoUrl)}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      ) : null}
    </AppSectionScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 180, borderRadius: 8 },
  card: {
    gap: AppSpacing.one,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 8,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: AppSpacing.three },
  infoLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 22,
  },
  infoValue: {
    flexShrink: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 22,
    textAlign: 'right',
  },
  day: { gap: AppSpacing.two },
  dayTitle: {
    marginTop: AppSpacing.two,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.display,
    fontSize: 24,
    lineHeight: 28,
  },
  exerciseName: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  prescription: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  description: {
    marginTop: AppSpacing.one,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  notes: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  videoButton: { marginTop: AppSpacing.two },
});
