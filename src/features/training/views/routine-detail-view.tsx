import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/filter-chip';
import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { useRoutineDetailViewModel } from '@/features/training/viewmodels/use-routine-detail-view-model';
import { ExerciseVideoModal } from '@/features/training/views/exercise-video-modal';
import { RoutineExerciseCard } from '@/features/training/views/routine-exercise-card';
import { RoutineDetailSkeleton } from '@/features/training/views/routine-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppShadows, AppSpacing } from '@/theme/tokens';

const HERO_PLACEHOLDER = require('@/assets/images/routines/routine-hero.svg');

interface RoutineDetailViewProps {
  routineId: unknown;
}

/** Screen 23 · Rutinas — Detalle. */
export function RoutineDetailView({ routineId }: RoutineDetailViewProps) {
  const viewModel = useRoutineDetailViewModel(routineId);
  const insets = useSafeAreaInsets();
  const routine = viewModel.routine;

  return (
    <View style={styles.screen}>
      <StatusBar style={routine ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, !routine && { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            progressViewOffset={insets.top}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        {routine ? (
          <>
            <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
              <Image
                contentFit="cover"
                source={routine.imageUrl ? { uri: routine.imageUrl } : HERO_PLACEHOLDER}
                style={styles.heroImage}
                transition={150}
              />
              {routine.imageUrl ? (
                <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
              ) : null}
              <BackButton dark onPress={viewModel.goBack} />
              <View style={styles.heroSpacer} />
              <View style={styles.tags}>
                <Text style={[styles.tag, styles.tagAccent]}>{routine.categoryLabel}</Text>
                <Text style={[styles.tag, styles.tagDark]}>{routine.levelLabel}</Text>
              </View>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                {routine.title.toUpperCase()}
              </Text>
              {routine.objective ? (
                <Text style={styles.heroObjective}>{routine.objective}</Text>
              ) : null}
            </View>

            <View style={styles.body}>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryRow}>
                  <SummaryCard
                    hint="Intensidad sugerida"
                    icon={{ ios: 'square.stack.3d.up', android: 'layers', web: 'layers' }}
                    label="Nivel"
                    value={routine.levelLabel}
                  />
                  <SummaryCard
                    hint={routine.daysPerWeek}
                    icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                    label="Duración"
                    value={routine.weeks}
                  />
                </View>
                <View style={styles.summaryRow}>
                  <SummaryCard
                    hint="Por sesión"
                    icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                    label="Tiempo estimado"
                    value={routine.minutes}
                  />
                  <SummaryCard
                    hint="Organizados por día"
                    icon={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
                    label="Ejercicios"
                    value={String(routine.exerciseCount)}
                  />
                </View>
              </View>

              {routine.description ? (
                <View style={styles.descriptionCard}>
                  <View style={styles.descriptionIcon}>
                    <SymbolView
                      name={{
                        ios: 'list.bullet',
                        android: 'format_list_bulleted',
                        web: 'format_list_bulleted',
                      }}
                      size={18}
                      tintColor={AppColors.neutral.white}
                    />
                  </View>
                  <View style={styles.descriptionCopy}>
                    <Text style={styles.descriptionTitle}>Descripción</Text>
                    <Text style={styles.descriptionText}>{routine.description}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.sectionHeading}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Ejercicios por día
                </Text>
                <Text style={styles.sectionCaption}>Respeta técnica, series y descansos.</Text>
              </View>

              {viewModel.days.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    contentContainerStyle={styles.days}
                    showsHorizontalScrollIndicator={false}
                    style={styles.daysRow}>
                    {viewModel.days.map((day) => (
                      <FilterChip
                        key={day.dayNumber}
                        label={day.label}
                        selected={viewModel.selectedDay === day.dayNumber}
                        onPress={() => viewModel.selectDay(day.dayNumber)}
                      />
                    ))}
                  </ScrollView>
                  {viewModel.exercises.map((exercise) => (
                    <RoutineExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onOpenVideo={viewModel.openVideo}
                    />
                  ))}
                </>
              ) : (
                <EmptyState
                  description="El entrenador aún no agrega ejercicios a esta rutina."
                  icon={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
                  title="Sin ejercicios por ahora"
                />
              )}
            </View>
          </>
        ) : (
          <StateLayout onBack={viewModel.goBack}>
            {viewModel.isLoading ? (
              <RoutineDetailSkeleton />
            ) : viewModel.isLocked ? (
              <IllustratedEmptyState
                actionLabel="Ver membresías"
                description="Las rutinas del equipo Titanium se activan con tu membresía. Contrata o renueva tu plan para verlas aquí."
                icon={{ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }}
                title="AÚN NO HAY RUTINAS PARA TI"
                onAction={viewModel.openMemberships}
              />
            ) : (
              <ErrorState message={viewModel.errorMessage ?? ''} onRetry={viewModel.retry} />
            )}
          </StateLayout>
        )}
      </ScrollView>
      <ExerciseVideoModal
        activeVideo={viewModel.activeVideo}
        onClose={viewModel.closeVideo}
        onOpenExternally={viewModel.openVideoExternally}
      />
    </View>
  );
}

function StateLayout({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <View style={styles.stateLayout}>
      <BackButton onPress={onBack} />
      {children}
    </View>
  );
}

function BackButton({ dark = false, onPress }: { dark?: boolean; onPress: () => void }) {
  return (
    <IconButton
      color={dark ? AppColors.neutral.white : AppColors.neutral.text}
      icon={BACK_ICON}
      label="Regresar"
      style={styles.back}
      onPress={onPress}
    />
  );
}

interface SummaryCardProps {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  hint: string;
}

function SummaryCard({ icon, label, value, hint }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeading}>
        <SymbolView name={icon} size={16} tintColor={AppColors.brand.primary} />
        <Text numberOfLines={1} style={styles.summaryLabel}>
          {label}
        </Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.summaryHint}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { flexGrow: 1, paddingBottom: 112 },
  hero: {
    overflow: 'hidden',
    gap: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: AppColors.surface.dark,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  heroImage: { position: 'absolute', top: 0, right: 0, left: 0, height: 330 },
  heroShade: { backgroundColor: 'rgba(16, 16, 16, 0.55)' },
  heroSpacer: { height: 92 },
  tags: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  tag: {
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  tagAccent: { color: AppColors.brand.primary },
  tagDark: { color: AppColors.neutral.white },
  heroTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  heroObjective: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  back: { marginLeft: -10 },
  body: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryGrid: { gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    gap: 6,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  summaryHeading: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  summaryLabel: {
    flexShrink: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  summaryValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  summaryHint: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  descriptionCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  descriptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: AppColors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCopy: { flex: 1, gap: 2 },
  descriptionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  descriptionText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  sectionHeading: { gap: 2 },
  sectionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  sectionCaption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  daysRow: { marginHorizontal: -20 },
  days: { gap: AppSpacing.two, paddingHorizontal: 20 },
  stateLayout: { flex: 1, gap: AppSpacing.three, paddingHorizontal: 20 },
});
