import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { InfoListCard } from '@/components/ui/info-list-card';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useTrainerHomeViewModel } from '@/features/trainer/viewmodels/use-trainer-home-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function TrainerHomeView() {
  const viewModel = useTrainerHomeViewModel();
  const summary = viewModel.summary;

  return (
    <AppSectionScreen
      eyebrow="PANEL DEL ENTRENADOR"
      title={summary?.fullName ? `HOLA, ${summary.fullName.toUpperCase()}` : 'HOLA, ENTRENADOR'}
      description={viewModel.email}
      refreshing={viewModel.isRefreshing}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        <LoadingState label="Cargando tu resumen…" />
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : summary ? (
        <>
          {summary.profileIncomplete ? (
            <InfoListCard
              icon={{ ios: 'person.text.rectangle', android: 'badge', web: 'badge' }}
              title="Completa tu perfil"
              description="Agrega tu nombre y especialidad para que tus clientes te identifiquen."
            />
          ) : null}

          <View style={styles.stats}>
            <StatCard
              label="Clientes"
              value={summary.clientCount}
              onPress={viewModel.openClients}
            />
            <StatCard
              label="Rutinas"
              value={summary.routineCount}
              detail={`${summary.publishedRoutineCount} publicadas`}
              onPress={viewModel.openRoutines}
            />
          </View>
        </>
      ) : null}
    </AppSectionScreen>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  detail?: string;
  onPress: () => void;
}

function StatCard({ label, value, detail, onPress }: StatCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={AppColors.neutral.muted}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: AppSpacing.three },
  statCard: {
    minHeight: 112,
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 8,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  statHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  statValue: {
    marginTop: AppSpacing.two,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  statDetail: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  pressed: { opacity: 0.7 },
});
