import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AddressCardSkeleton } from '@/features/delivery/views/addresses-skeleton';
import { AppColors, AppShadows } from '@/theme/tokens';

/** Pantalla 73 · Checkout — Cargando (punto de recogida y direcciones). */
export function CheckoutSkeleton() {
  return (
    <SkeletonGroup label="Cargando opciones de entrega" style={styles.group}>
      <View style={styles.methods}>
        {[0, 1].map((key) => (
          <View key={key} style={styles.method}>
            <SkeletonBlock height={40} radius={12} width={40} />
            <SkeletonBlock height={14} width="80%" />
            <SkeletonBlock height={10} width="40%" />
          </View>
        ))}
      </View>
      <SkeletonBlock height={16} width="45%" />
      <AddressCardSkeleton />
      <AddressCardSkeleton />
      <SkeletonBlock height={16} width="35%" />
      <View style={styles.dark}>
        <SkeletonBlock height={44} radius={12} tone="dark" width={44} />
        <View style={styles.copy}>
          <SkeletonBlock height={12} tone="dark" width="60%" />
          <SkeletonBlock height={10} tone="dark" width="45%" />
        </View>
        <SkeletonBlock height={22} tone="dark" width={72} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: 14 },
  methods: { flexDirection: 'row', gap: 10 },
  method: {
    flex: 1,
    gap: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  dark: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.dark,
    padding: 16,
  },
  copy: { flex: 1, gap: 7 },
});
