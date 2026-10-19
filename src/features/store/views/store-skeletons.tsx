import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppSpacing } from '@/theme/tokens';

const CHIP_WIDTHS = [72, 116, 110, 72];

function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={124} radius={14} />
      <View style={styles.lines}>
        <SkeletonBlock width="45%" height={10} radius={5} />
        <SkeletonBlock width="90%" height={12} />
        <SkeletonBlock width="65%" height={12} />
      </View>
      <SkeletonBlock width={64} height={14} />
    </View>
  );
}

/** Skeleton for screen 11 of the guide: search, categories and a 2-column grid. */
export function StoreSkeleton() {
  return (
    <SkeletonGroup label="Cargando productos" style={styles.group}>
      <SkeletonBlock height={50} radius={18} />
      <View style={styles.chips}>
        {CHIP_WIDTHS.map((width, index) => (
          <SkeletonBlock key={index} width={width} height={36} radius={18} />
        ))}
      </View>
      {[0, 1].map((row) => (
        <View key={row} style={styles.row}>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function ProductDetailSkeleton() {
  return (
    <SkeletonGroup label="Cargando producto" style={styles.group}>
      <SkeletonBlock height={300} radius={22} />
      <View style={styles.lines}>
        <SkeletonBlock width={90} height={10} radius={5} />
        <SkeletonBlock width="85%" height={26} radius={8} />
        <SkeletonBlock width={120} height={12} />
      </View>
      <SkeletonBlock width={140} height={30} radius={8} />
      <View style={styles.lines}>
        <SkeletonBlock width="95%" height={12} />
        <SkeletonBlock width="78%" height={12} />
      </View>
      <View style={styles.detailCard}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.specRow}>
            <SkeletonBlock width={90} height={12} />
            <SkeletonBlock width={110} height={12} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: AppSpacing.three },
  chips: { flexDirection: 'row', gap: AppSpacing.two, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: AppSpacing.three },
  card: {
    flex: 1,
    gap: AppSpacing.three,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: 10,
  },
  lines: { gap: AppSpacing.two },
  detailCard: {
    gap: AppSpacing.three,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.four,
  },
  specRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
