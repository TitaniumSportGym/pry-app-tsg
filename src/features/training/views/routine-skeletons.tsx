import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppShadows } from '@/theme/tokens';

const CHIP_WIDTHS = [70, 104, 130, 72];

function RoutineCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={132} radius={0} />
      <View style={styles.body}>
        <SkeletonBlock width={200} height={18} radius={8} />
        <SkeletonBlock width="85%" height={12} />
        <View style={styles.metrics}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.metric}>
              <SkeletonBlock width={16} height={16} radius={5} />
              <SkeletonBlock width={50} height={8} radius={4} />
              <SkeletonBlock width={60} height={12} />
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.trainer}>
            <SkeletonBlock width={28} height={28} radius={14} />
            <SkeletonBlock width={130} height={10} radius={5} />
          </View>
          <SkeletonBlock width={110} height={34} radius={12} />
        </View>
      </View>
    </View>
  );
}

/** Screen 24 · Rutinas — Cargando: search, chips and two routine cards. */
export function RoutinesSkeleton() {
  return (
    <SkeletonGroup label="Cargando rutinas" style={styles.group}>
      <SkeletonBlock height={50} radius={18} />
      <View style={styles.chips}>
        {CHIP_WIDTHS.map((width, index) => (
          <SkeletonBlock key={index} width={width} height={38} radius={18} />
        ))}
      </View>
      <RoutineCardSkeleton />
      <RoutineCardSkeleton />
    </SkeletonGroup>
  );
}

export function RoutineDetailSkeleton() {
  return (
    <SkeletonGroup label="Cargando rutina" style={styles.group}>
      <SkeletonBlock height={330} radius={32} tone="dark" />
      <View style={styles.detailBody}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.metrics}>
            <SkeletonBlock height={124} radius={20} style={styles.summary} />
            <SkeletonBlock height={124} radius={20} style={styles.summary} />
          </View>
        ))}
        <SkeletonBlock height={66} radius={20} />
        <SkeletonBlock width={180} height={20} radius={8} />
        <SkeletonBlock height={180} radius={22} />
      </View>
    </SkeletonGroup>
  );
}

export function RoutinesSubtitleSkeleton() {
  return <SkeletonBlock width={150} height={10} radius={5} />;
}

const styles = StyleSheet.create({
  group: { gap: 16 },
  chips: { flexDirection: 'row', gap: 8, overflow: 'hidden' },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
  body: { gap: 10, padding: 16 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    gap: 6,
    borderRadius: 14,
    backgroundColor: AppColors.surface.soft,
    padding: 10,
  },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  trainer: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  detailBody: { gap: 16, paddingHorizontal: 20 },
  summary: { flex: 1 },
});
