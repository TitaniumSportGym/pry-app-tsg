import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppShadows } from '@/theme/tokens';

/** Bloque de una tarjeta de dirección; se reutiliza en Mis direcciones (71) y el checkout (73). */
export function AddressCardSkeleton({ withActions = false }: { withActions?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock height={40} radius={12} width={40} />
        <View style={styles.copy}>
          <SkeletonBlock height={14} width="62%" />
          <SkeletonBlock height={10} width="80%" />
          <SkeletonBlock height={10} width="45%" />
          <SkeletonBlock height={10} width="70%" />
        </View>
      </View>
      {withActions ? (
        <View style={styles.actions}>
          <SkeletonBlock height={28} radius={12} width={78} />
          <SkeletonBlock height={28} radius={12} width={88} />
        </View>
      ) : null}
    </View>
  );
}

/** Pantalla 71 · Mis direcciones — Cargando. */
export function AddressesSkeleton() {
  return (
    <SkeletonGroup label="Cargando tus direcciones" style={styles.group}>
      <AddressCardSkeleton withActions />
      <AddressCardSkeleton withActions />
      <AddressCardSkeleton withActions />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  card: {
    gap: 14,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  copy: { flex: 1, gap: 7 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    paddingTop: 12,
  },
});
