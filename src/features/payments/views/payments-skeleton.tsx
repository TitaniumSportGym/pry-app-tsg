import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppShadows } from '@/theme/tokens';

function PaymentRowSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <SkeletonBlock width={44} height={44} radius={14} />
        <View style={styles.copy}>
          <SkeletonBlock width={110} height={12} />
          <SkeletonBlock width={150} height={10} radius={5} />
        </View>
        <View style={styles.amount}>
          <SkeletonBlock width={64} height={14} />
          <SkeletonBlock width={70} height={22} radius={11} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.detail}>
        <SkeletonBlock width={110} height={10} radius={5} />
        <SkeletonBlock width={140} height={10} radius={5} />
      </View>
    </View>
  );
}

/** Screen 27 · Pagos — Cargando: dark total card, filters and three payments. */
export function PaymentsSkeleton() {
  return (
    <SkeletonGroup label="Cargando pagos" style={styles.group}>
      <View style={styles.total}>
        <SkeletonBlock width={90} height={10} radius={5} tone="dark" />
        <SkeletonBlock width={190} height={32} radius={8} tone="dark" />
        <SkeletonBlock width={140} height={10} radius={5} tone="dark" />
        <View style={styles.indicators}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.indicator}>
              <SkeletonBlock width={60} height={8} radius={4} tone="dark" />
              <SkeletonBlock width={30} height={18} tone="dark" />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.chips}>
        {[86, 100, 116].map((width) => (
          <SkeletonBlock key={width} width={width} height={38} radius={18} />
        ))}
      </View>
      <PaymentRowSkeleton />
      <PaymentRowSkeleton />
      <PaymentRowSkeleton />
    </SkeletonGroup>
  );
}

export function PaymentsSubtitleSkeleton() {
  return <SkeletonBlock width={150} height={10} radius={5} />;
}

const styles = StyleSheet.create({
  group: { gap: 14 },
  total: {
    gap: 10,
    borderRadius: 24,
    backgroundColor: AppColors.surface.dark,
    padding: 20,
  },
  indicators: { flexDirection: 'row', gap: 14, paddingTop: 8 },
  indicator: { flex: 1, gap: 6 },
  chips: { flexDirection: 'row', gap: 8, overflow: 'hidden' },
  card: {
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  main: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  copy: { flex: 1, gap: 8 },
  amount: { alignItems: 'flex-end', gap: 8 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  detail: { flexDirection: 'row', justifyContent: 'space-between' },
});
