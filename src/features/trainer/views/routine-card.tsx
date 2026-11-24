import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import type { RoutineCardItem } from '@/features/trainer/models/trainer-routine-presentation';
import { ICONS, MetricBox, RoutineCover } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

interface RoutineCardProps {
  item: RoutineCardItem;
  index: number;
  onOpen: (id: string) => void;
}

/** Tarjeta de rutina con portada, métricas y acción; la usan el entrenador (77) y el admin (90). */
export function RoutineCard({ item, index, onOpen }: RoutineCardProps) {
  return (
    <Pressable
      accessibilityHint={item.action}
      accessibilityLabel={`${item.title}, ${item.status.label}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onOpen(item.id)}>
      <RoutineCover imageUrl={item.imageUrl} index={index} status={item.status} tags={item.tags} />
      <View style={styles.body}>
        <Text style={styles.title}>{item.title}</Text>
        {item.objective ? <Text style={styles.objective}>{item.objective}</Text> : null}
        <View style={styles.metrics}>
          <MetricBox icon={ICONS.clock} label="Sesión" value={item.minutes} />
          <MetricBox icon={ICONS.calendar} label="Semana" value={item.days} />
          <MetricBox icon={ICONS.list} label="Ejercicios" value={item.exercises} />
        </View>
        <View style={styles.footer}>
          <Text numberOfLines={1} style={styles.meta}>
            {item.meta}
          </Text>
          <View style={styles.action}>
            <Text style={styles.actionText}>{item.action}</Text>
            <SymbolView name={ICONS.chevron} size={14} tintColor={AppColors.brand.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Pantallas 78 y 90 · cargando: buscador/filtros y tarjetas con portada oscura. */
export function RoutineCardsSkeleton({ label, withSearch = true }: { label: string; withSearch?: boolean }) {
  return (
    <SkeletonGroup label={label} style={styles.skeleton}>
      {withSearch ? <SkeletonBlock height={50} radius={16} /> : null}
      <View style={styles.chips}>
        {[70, 100, 104, 96].map((width) => (
          <SkeletonBlock key={width} height={36} radius={18} width={width} />
        ))}
      </View>
      {[0, 1].map((key) => (
        <View key={key} style={styles.card}>
          <View style={styles.skeletonCover}>
            <SkeletonBlock height={20} radius={6} tone="dark" width={130} />
          </View>
          <View style={styles.body}>
            <SkeletonBlock height={16} radius={8} width="60%" />
            <SkeletonBlock height={10} width="80%" />
            <View style={styles.metrics}>
              {[0, 1, 2].map((m) => (
                <SkeletonBlock key={m} height={58} radius={12} style={styles.flex} />
              ))}
            </View>
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { overflow: 'hidden', borderRadius: 20, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card },
  pressed: { opacity: 0.9 },
  body: { gap: 10, padding: 16 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  objective: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  metrics: { flexDirection: 'row', gap: 8 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  meta: { flex: 1, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  action: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionText: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  skeleton: { gap: 14 },
  chips: { flexDirection: 'row', gap: 8 },
  skeletonCover: { height: 112, backgroundColor: AppColors.surface.dark, padding: 14 },
});
