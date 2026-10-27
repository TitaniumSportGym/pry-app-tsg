import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const COVER_PLACEHOLDERS = [
  require('@/assets/images/routines/routine-cover-dark.svg'),
  require('@/assets/images/routines/routine-cover-red.svg'),
];

export interface RoutineCardItem {
  id: string;
  title: string;
  objective: string;
  categoryLabel: string;
  levelLabel: string;
  duration: string;
  days: string;
  trainerEmail: string;
  imageUrl: string | null;
}

interface RoutineCardProps {
  routine: RoutineCardItem;
  /** Alternates the placeholder cover of routines without a photo. */
  index: number;
  onPress: (routineId: string) => void;
}

export function RoutineCard({ routine, index, onPress }: RoutineCardProps) {
  return (
    <Pressable
      accessibilityHint="Abre los ejercicios de la rutina"
      accessibilityLabel={`Ver rutina ${routine.title}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(routine.id)}>
      <View style={styles.cover}>
        <Image
          contentFit="cover"
          source={
            routine.imageUrl
              ? { uri: routine.imageUrl }
              : COVER_PLACEHOLDERS[index % COVER_PLACEHOLDERS.length]
          }
          style={StyleSheet.absoluteFill}
          transition={150}
        />
        <View style={styles.tags}>
          {[routine.categoryLabel, routine.levelLabel].filter(Boolean).map((label) => (
            <Text key={label} style={styles.tag}>
              {label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.heading}>
          <Text style={styles.title}>{routine.title}</Text>
          {routine.objective ? <Text style={styles.objective}>{routine.objective}</Text> : null}
        </View>

        <View style={styles.metrics}>
          <Metric
            icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
            label="Duración"
            value={routine.duration}
          />
          <Metric
            icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            label="Semana"
            value={routine.days}
          />
          <Metric
            icon={{ ios: 'square.stack.3d.up', android: 'layers', web: 'layers' }}
            label="Nivel"
            value={routine.levelLabel}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.trainer}>
            <View style={styles.avatar}>
              <SymbolView
                name={{ ios: 'person', android: 'person', web: 'person' }}
                size={14}
                tintColor={AppColors.neutral.muted}
              />
            </View>
            <Text numberOfLines={1} style={styles.trainerEmail}>
              {routine.trainerEmail || 'Equipo Titanium'}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Ver rutina</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              size={14}
              tintColor={AppColors.neutral.white}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface MetricProps {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <View style={styles.metric}>
      <SymbolView name={icon} size={16} tintColor={AppColors.brand.primary} />
      <Text numberOfLines={1} style={styles.metricLabel}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
  pressed: { opacity: 0.9 },
  cover: { height: 132, backgroundColor: AppColors.surface.dark },
  tags: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 },
  tag: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: AppColors.surface.darkSelected,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  body: { gap: 12, padding: 16 },
  heading: { gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  objective: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    gap: 4,
    borderRadius: 14,
    backgroundColor: AppColors.surface.soft,
    padding: 10,
  },
  metricLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  trainer: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.surface.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerEmail: {
    flexShrink: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  cta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    letterSpacing: 0.6,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
});
