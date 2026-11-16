import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppShadows } from '@/theme/tokens';

function OrderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <SkeletonBlock height={14} width="55%" />
          <SkeletonBlock height={10} width="40%" />
        </View>
        <SkeletonBlock height={26} radius={13} width={96} />
      </View>
      <View style={styles.row}>
        <SkeletonBlock height={40} radius={12} width={40} />
        <SkeletonBlock height={40} radius={12} width={40} />
        <View style={styles.copy}>
          <SkeletonBlock height={12} width="45%" />
          <SkeletonBlock height={10} width="70%" />
        </View>
      </View>
      <View style={[styles.row, styles.footer]}>
        <SkeletonBlock height={18} width={84} />
        <SkeletonBlock height={12} width={96} />
      </View>
    </View>
  );
}

/** Pantalla 38 · Mis pedidos — Cargando. */
export function OrdersSkeleton() {
  return (
    <SkeletonGroup label="Cargando tus pedidos" style={styles.group}>
      <View style={styles.chips}>
        {[64, 82, 92, 96].map((width) => (
          <SkeletonBlock key={width} height={36} radius={18} width={width} />
        ))}
      </View>
      <OrderCardSkeleton />
      <OrderCardSkeleton />
      <OrderCardSkeleton />
    </SkeletonGroup>
  );
}

/** Pantalla 72 · Pedido — Cargando: tarjeta de estado oscura, seguimiento y resumen. */
export function OrderDetailSkeleton() {
  return (
    <SkeletonGroup label="Cargando el pedido" style={styles.group}>
      <View style={styles.darkCard}>
        <View style={styles.row}>
          <SkeletonBlock height={48} radius={14} tone="dark" width={48} />
          <View style={styles.copy}>
            <SkeletonBlock height={10} tone="dark" width="40%" />
            <SkeletonBlock height={26} radius={8} tone="dark" width="65%" />
          </View>
        </View>
        <SkeletonBlock height={10} tone="dark" />
        <SkeletonBlock height={10} tone="dark" width="70%" />
      </View>
      <View style={styles.card}>
        <SkeletonBlock height={16} width="35%" />
        {[0, 1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.row}>
            <SkeletonBlock height={26} radius={13} width={26} />
            <View style={styles.copy}>
              <SkeletonBlock height={12} width={`${50 + ((key * 13) % 30)}%`} />
              <SkeletonBlock height={10} width="30%" />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <SkeletonBlock height={16} width="30%" />
        {[0, 1].map((key) => (
          <View key={key} style={styles.row}>
            <SkeletonBlock height={52} radius={14} width={52} />
            <View style={styles.copy}>
              <SkeletonBlock height={12} width="70%" />
              <SkeletonBlock height={10} width="35%" />
            </View>
            <SkeletonBlock height={14} width={60} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  card: {
    gap: 14,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  darkCard: {
    gap: 12,
    borderRadius: 24,
    backgroundColor: AppColors.surface.dark,
    padding: 20,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  copy: { flex: 1, gap: 7 },
  footer: {
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    paddingTop: 12,
  },
});
