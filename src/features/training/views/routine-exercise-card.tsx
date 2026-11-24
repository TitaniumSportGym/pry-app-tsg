import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExerciseVideo } from '@/features/training/models/exercise-video';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

export interface RoutineExerciseItem {
  id: string;
  position: number;
  name: string;
  description: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  video: ExerciseVideo | null;
}

interface RoutineExerciseCardProps {
  exercise: RoutineExerciseItem;
  onOpenVideo: (title: string, video: ExerciseVideo) => void;
}

export function RoutineExerciseCard({ exercise, onOpenVideo }: RoutineExerciseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.position}>
          <Text style={styles.positionText}>{exercise.position}</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.name}>{exercise.name}</Text>
          {exercise.description ? (
            <Text style={styles.description}>{exercise.description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.prescription}>
        <Stat label="Series" value={exercise.sets} />
        <Stat label="Reps" value={exercise.reps} />
        <Stat label="Descanso" value={exercise.rest} />
      </View>

      {exercise.notes ? (
        <View style={styles.tip}>
          <SymbolView
            name={{ ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' }}
            size={16}
            tintColor={AppColors.brand.primary}
          />
          <Text style={styles.tipText}>{exercise.notes}</Text>
        </View>
      ) : null}

      {exercise.video ? (
        <Pressable
          accessibilityHint={
            exercise.video.kind === 'link' ? 'Se abre en el navegador' : 'Se reproduce en la app'
          }
          accessibilityLabel={`Ver video de ${exercise.name}`}
          accessibilityRole="button"
          style={({ pressed }) => [styles.video, styles.videoAvailable, pressed && styles.pressed]}
          onPress={() => exercise.video && onOpenVideo(exercise.name, exercise.video)}>
          <SymbolView
            name={{ ios: 'play.circle.fill', android: 'play_circle', web: 'play_circle' }}
            size={20}
            tintColor={AppColors.brand.primary}
          />
          <Text style={styles.videoAvailableText}>Ver video del ejercicio</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor={AppColors.neutral.muted}
          />
        </Pressable>
      ) : (
        <View style={[styles.video, styles.videoPending]}>
          <SymbolView
            name={{ ios: 'play.circle', android: 'play_circle', web: 'play_circle' }}
            size={20}
            tintColor={AppColors.neutral.placeholder}
          />
          <Text style={styles.videoPendingText}>Video del ejercicio pendiente de actualización</Text>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  position: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: 22,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  headingCopy: { flex: 1, gap: 1 },
  name: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  description: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  prescription: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderRadius: 14,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  statValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  statLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  tip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipText: {
    flex: 1,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  video: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  videoPending: { borderColor: AppColors.border.default, borderStyle: 'dashed' },
  videoPendingText: {
    flex: 1,
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  videoAvailable: { borderColor: AppColors.border.default },
  videoAvailableText: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  pressed: { opacity: 0.7 },
});
