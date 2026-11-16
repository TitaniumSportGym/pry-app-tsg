import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { ErrorState } from '@/components/ui/screen-state';
import { SubHeader } from '@/components/ui/sub-header';
import { ExerciseVideoModal } from '@/features/training/views/exercise-video-modal';
import { useTrainerRoutineDetailViewModel } from '@/features/trainer/viewmodels/use-trainer-routine-detail-view-model';
import { RoutineDetailContent, RoutineDetailSkeleton } from '@/features/trainer/views/routine-detail-content';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 86–88 · Entrenador — detalle de la rutina con las acciones de cada estado. */
export function TrainerRoutineDetailView({ routineId }: { routineId: string | undefined }) {
  const viewModel = useTrainerRoutineDetailViewModel(routineId);
  const { routine } = viewModel;

  function confirm(title: string, message: string, label: string, onConfirm: () => void, destructive = false) {
    Alert.alert(title, message, [
      { text: 'Volver', style: 'cancel' },
      { text: label, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  }

  const hasActions = Boolean(routine) && (viewModel.canSubmit || viewModel.canEdit || viewModel.canArchive);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl colors={[AppColors.brand.primary]} refreshing={viewModel.isRefreshing} tintColor={AppColors.brand.primary} onRefresh={viewModel.refresh} />
        }
        showsVerticalScrollIndicator={false}>
        <SubHeader subtitle={viewModel.edited || undefined} title="MI RUTINA" onBack={viewModel.goBack} />
        {viewModel.showSkeleton ? <RoutineDetailSkeleton /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
        {routine ? (
          <>
            <RoutineDetailContent notice={viewModel.notice} routine={routine} onOpenVideo={viewModel.openVideo} />
            {viewModel.canDelete ? (
              <Pressable
                accessibilityRole="button"
                disabled={viewModel.busy !== null}
                hitSlop={8}
                style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
                onPress={() =>
                  confirm('¿Eliminar rutina?', 'Se borrarán la rutina, sus ejercicios y videos. No se puede deshacer.', 'Eliminar', () => void viewModel.remove(), true)
                }>
                <Text style={styles.deleteText}>Eliminar rutina</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {hasActions ? (
        <ActionBar>
          {viewModel.actionError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {viewModel.actionError}
            </Text>
          ) : null}
          {viewModel.canSubmit ? (
            <AppButton
              loading={viewModel.busy === 'submit'}
              title={viewModel.isRejected ? 'Corregir y reenviar' : 'Enviar a revisión'}
              onPress={() =>
                viewModel.isRejected
                  ? viewModel.edit()
                  : confirm('¿Enviar a revisión?', 'El administrador la revisará antes de publicarla. Mientras tanto no podrás editarla.', 'Enviar', () => void viewModel.submit())
              }
            />
          ) : null}
          {viewModel.canEdit ? <AppButton title="Editar rutina" variant="outline" onPress={viewModel.edit} /> : null}
          {viewModel.canArchive && !viewModel.canSubmit ? (
            <AppButton
              loading={viewModel.busy === 'archive'}
              title="Archivar rutina"
              variant="outline"
              onPress={() => confirm('¿Archivar rutina?', 'Los socios dejarán de verla.', 'Archivar', () => void viewModel.archive())}
            />
          ) : null}
        </ActionBar>
      ) : null}

      <ExerciseVideoModal activeVideo={viewModel.activeVideo} onClose={viewModel.closeVideo} onOpenExternally={viewModel.openVideoExternally} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 32 },
  delete: { alignItems: 'center', paddingVertical: 8 },
  deleteText: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
});
