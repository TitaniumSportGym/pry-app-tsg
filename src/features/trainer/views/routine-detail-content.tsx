import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/ui/icon-tile';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import type { ExerciseVideo } from '@/features/training/models/exercise-video';
import { RoutineExerciseCard } from '@/features/training/views/routine-exercise-card';
import type { RoutineDetail, RoutineNotice } from '@/features/trainer/models/routine-detail-presentation';
import type { StatusTone } from '@/features/trainer/models/trainer-routine';
import { ICONS, RoutineCover } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const METRIC_ICONS: Record<string, SymbolViewProps['name']> = {
  level: ICONS.layers,
  weeks: ICONS.calendar,
  minutes: ICONS.clock,
  exercises: ICONS.list,
};

const NOTICE_COLORS: Record<StatusTone, { background: string; color: string; icon: SymbolViewProps['name'] }> = {
  neutral: { background: AppColors.surface.input, color: AppColors.neutral.muted, icon: ICONS.info },
  warning: { background: AppColors.feedback.warningSoft, color: AppColors.feedback.warning, icon: ICONS.hourglass },
  success: { background: AppColors.feedback.successSoft, color: AppColors.feedback.success, icon: ICONS.check },
  error: { background: AppColors.surface.softSelected, color: AppColors.feedback.error, icon: ICONS.alert },
};

export function RoutineNoticeBanner({ notice }: { notice: RoutineNotice }) {
  const colors = NOTICE_COLORS[notice.tone];
  return (
    <View accessibilityRole="summary" style={[styles.notice, { backgroundColor: colors.background }]}>
      <SymbolView name={colors.icon} size={20} tintColor={colors.color} />
      <View style={styles.flex}>
        <Text style={[styles.noticeTitle, { color: colors.color }]}>{notice.title}</Text>
        <Text style={styles.noticeText}>{notice.text}</Text>
      </View>
    </View>
  );
}

interface RoutineDetailContentProps {
  routine: RoutineDetail;
  notice?: RoutineNotice | null;
  onOpenVideo: (title: string, video: ExerciseVideo) => void;
}

/** Portada, aviso del estado, métricas y ejercicios por día (pantallas 86–88 y 91). */
export function RoutineDetailContent({ routine, notice, onOpenVideo }: RoutineDetailContentProps) {
  return (
    <>
      <RoutineCover height={212} imageUrl={routine.imageUrl} status={routine.status} style={styles.hero} tags={routine.tags}>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {routine.title}
          </Text>
          {routine.objective ? <Text style={styles.heroText}>{routine.objective}</Text> : null}
        </View>
      </RoutineCover>

      {notice ? <RoutineNoticeBanner notice={notice} /> : null}

      <View style={styles.metrics}>
        {routine.metrics.map((metric) => (
          <View key={metric.key} style={styles.metric}>
            <IconTile icon={METRIC_ICONS[metric.key]} iconSize={16} size={30} />
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

      {routine.description ? (
        <View style={styles.description}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{routine.description}</Text>
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Ejercicios por día
      </Text>
      {routine.days.length === 0 ? <Text style={styles.empty}>Esta rutina todavía no tiene ejercicios.</Text> : null}
      {routine.days.map((day) => (
        <View key={day.dayNumber} style={styles.day}>
          <Text style={styles.dayLabel}>{`DÍA ${day.dayNumber} · ${day.exercises.length} ${day.exercises.length === 1 ? 'EJERCICIO' : 'EJERCICIOS'}`}</Text>
          {day.exercises.map((exercise) => (
            <RoutineExerciseCard key={exercise.id} exercise={exercise} onOpenVideo={onOpenVideo} />
          ))}
        </View>
      ))}
    </>
  );
}

/** Pantalla 72 · cargando: portada oscura, métricas y ejercicios. */
export function RoutineDetailSkeleton() {
  return (
    <SkeletonGroup label="Cargando la rutina" style={styles.skeleton}>
      <View style={styles.skeletonHero}>
        <SkeletonBlock height={20} radius={6} tone="dark" width={140} />
        <View style={styles.flex} />
        <SkeletonBlock height={30} radius={8} tone="dark" width="70%" />
        <SkeletonBlock height={12} tone="dark" width="55%" />
      </View>
      <View style={styles.metrics}>
        {[0, 1, 2, 3].map((key) => (
          <SkeletonBlock key={key} height={96} radius={16} style={styles.skeletonMetric} />
        ))}
      </View>
      <SkeletonBlock height={18} width="45%" />
      <SkeletonBlock height={150} radius={20} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  flex: { minWidth: 0, flex: 1 },
  hero: { borderRadius: 24, padding: 20 },
  heroCopy: { flex: 1, justifyContent: 'flex-end', gap: 4 },
  heroTitle: { color: AppColors.neutral.white, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  heroText: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  notice: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, borderRadius: 16, padding: 14 },
  noticeTitle: { fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  noticeText: { color: AppColors.neutral.text, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', flexGrow: 1, gap: 4, borderRadius: 16, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card, padding: 14 },
  metricLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  metricValue: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  description: { gap: 6, borderRadius: 16, backgroundColor: AppColors.surface.input, padding: 14 },
  descriptionText: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  sectionTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  empty: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  day: { gap: 12 },
  dayLabel: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: 11, letterSpacing: 0.8, lineHeight: 14 },
  skeleton: { gap: 14 },
  skeletonHero: { height: 212, gap: 10, borderRadius: 24, backgroundColor: AppColors.surface.dark, padding: 20 },
  skeletonMetric: { width: '48%', flexGrow: 1 },
});
