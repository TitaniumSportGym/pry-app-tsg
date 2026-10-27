import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppSpacing } from '@/theme/tokens';

const CHIP_WIDTHS = [72, 116, 110, 72];

function ProductCardSkeleton() {
  return (
    <View style={styles.product}>
      <SkeletonBlock height={180} radius={20} />
      <SkeletonBlock width="85%" height={12} />
      <SkeletonBlock width={64} height={14} />
    </View>
  );
}

function CategoryCardSkeleton() {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.thumbnails}>
        {[0, 1, 2, 3].map((index) => (
          <SkeletonBlock key={index} height={66} radius={12} style={styles.thumbnail} />
        ))}
      </View>
      <SkeletonBlock width="60%" height={14} />
    </View>
  );
}

/** Store home while products load: categories and the "Nuevos" row. */
export function StoreSkeleton() {
  return (
    <SkeletonGroup label="Cargando productos" style={styles.group}>
      <SkeletonBlock width={120} height={20} radius={8} />
      <View style={styles.row}>
        <CategoryCardSkeleton />
        <CategoryCardSkeleton />
      </View>
      <SkeletonBlock width={90} height={20} radius={8} />
      <View style={styles.row}>
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </View>
    </SkeletonGroup>
  );
}

/** Catalog grid while products load (screen 11 of the skeleton guide). */
export function CatalogSkeleton() {
  return (
    <SkeletonGroup label="Cargando productos" style={styles.group}>
      <View style={styles.chips}>
        {CHIP_WIDTHS.map((width, index) => (
          <SkeletonBlock key={index} width={width} height={38} radius={18} />
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
      <SkeletonBlock height={330} radius={0} />
      <View style={styles.detailBody}>
        <View style={styles.priceRow}>
          <SkeletonBlock width={140} height={28} radius={8} />
          <SkeletonBlock width={84} height={24} radius={10} />
        </View>
        <SkeletonBlock width="80%" height={18} radius={8} />
        <SkeletonBlock width="95%" height={12} />
        <SkeletonBlock width="70%" height={12} />
        <View style={styles.chips}>
          {[110, 96, 104].map((width, index) => (
            <SkeletonBlock key={index} width={width} height={32} radius={12} />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: AppSpacing.three },
  chips: { flexDirection: 'row', gap: AppSpacing.two, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 12 },
  product: { flex: 1, gap: AppSpacing.two },
  categoryCard: {
    flex: 1,
    gap: AppSpacing.two,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 20,
    padding: AppSpacing.two,
  },
  thumbnails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbnail: { width: '47%', flexGrow: 1 },
  detailBody: { gap: 12, paddingHorizontal: 20 },
  priceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
