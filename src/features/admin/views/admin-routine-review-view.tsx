import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { ErrorState } from '@/components/ui/screen-state';
import { SubHeader } from '@/components/ui/sub-header';
import type { AdminRoutineDecision } from '@/features/admin/models/admin-routine';
import { useAdminRoutineReviewViewModel } from '@/features/admin/viewmodels/use-admin-routine-review-view-model';
import { ExerciseVideoModal } from '@/features/training/views/exercise-video-modal';
import { RoutineDetailContent, RoutineDetailSkeleton } from '@/features/trainer/views/routine-detail-content';
import { ICONS } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantalla 91 · Admin — Revisar rutina. */
export function AdminRoutineReviewView({ routineId }: { routineId: string | undefined }) {
  const viewModel = useAdminRoutineReviewViewModel(routineId);
  const { routine } = viewModel;

  function confirm(decision: AdminRoutineDecision) {
    const copy = viewModel.copy[decision];
    Alert.alert(copy.title, copy.message, [
      { text: 'Volver', style: 'cancel' },
      { text: copy.confirm, style: decision === 'approve' ? 'default' : 'destructive', onPress: () => void viewModel.decide(decision) },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl colors={[AppColors.brand.primary]} refreshing={viewModel.isRefreshing} tintColor={AppColors.brand.primary} onRefresh={viewModel.refresh} />
        }
        showsVerticalScrollIndicator={false}>
        <SubHeader subtitle={viewModel.edited || undefined} title="REVISAR RUTINA" onBack={viewModel.goBack} />
        {viewModel.showSkeleton ? <RoutineDetailSkeleton /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
        {routine ? (
          <>
            <View style={styles.trainer}>
              <SymbolView name={ICONS.person} size={16} tintColor={AppColors.brand.primary} />
              <Text numberOfLines={1} style={styles.trainerText}>{`Creada por ${viewModel.trainerName}`}</Text>
            </View>
            <RoutineDetailContent notice={viewModel.notice} routine={routine} onOpenVideo={viewModel.openVideo} />
          </>
        ) : null}
      </ScrollView>

      {viewModel.hasActions ? (
        <ActionBar>
          {viewModel.actionError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {viewModel.actionError}
            </Text>
          ) : null}
          {viewModel.canApprove ? (
            <AppButton disabled={viewModel.busy !== null} loading={viewModel.busy === 'approve'} title="Aprobar y publicar" onPress={() => confirm('approve')} />
          ) : null}
          {viewModel.canReject ? (
            <AppButton disabled={viewModel.busy !== null} loading={viewModel.busy === 'reject'} title="Rechazar" variant="outline" onPress={() => confirm('reject')} />
          ) : null}
          {viewModel.canArchive ? (
            <AppButton disabled={viewModel.busy !== null} loading={viewModel.busy === 'archive'} title="Archivar" variant="outline" onPress={() => confirm('archive')} />
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
  trainer: { alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 6, borderRadius: 10, backgroundColor: AppColors.surface.softSelected, paddingHorizontal: 10, paddingVertical: 5 },
  trainerText: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
});
