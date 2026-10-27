import { StyleSheet, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppSpacing } from '@/theme/tokens';

const BENEFIT_LINE_WIDTHS = ['62%', '68%', '78%', '62%', '74%'] as const;

/** Skeleton for screen 02 of the guide: same layout as the plans screen, without API data. */
export function MembershipsSkeleton() {
  return (
    <SkeletonGroup label="Cargando membresías" style={styles.group}>
      <View style={styles.centered}>
        <SkeletonBlock width={240} height={34} radius={8} />
        <SkeletonBlock width={260} height={14} />
      </View>

      <SkeletonBlock height={52} radius={18} />

      <View style={styles.summaryRow}>
        <View style={styles.summaryText}>
          <SkeletonBlock width={170} height={18} radius={8} />
          <SkeletonBlock width={100} height={10} radius={5} />
        </View>
        <SkeletonBlock width={92} height={22} radius={18} />
      </View>

      <SkeletonBlock width={150} height={30} radius={8} />

      <View style={styles.card}>
        <SkeletonBlock width={100} height={12} />
        {BENEFIT_LINE_WIDTHS.map((width, index) => (
          <View key={index} style={styles.benefitRow}>
            <SkeletonBlock width={width} height={12} />
            <SkeletonBlock width={20} height={20} radius={10} />
          </View>
        ))}
      </View>

      <View style={styles.centered}>
        <SkeletonBlock width={220} height={12} />
      </View>
    </SkeletonGroup>
  );
}

export function MembershipDetailSkeleton() {
  return (
    <SkeletonGroup label="Cargando membresía" style={styles.group}>
      <View style={styles.lines}>
        <SkeletonBlock width={90} height={10} radius={5} />
        <SkeletonBlock width={220} height={34} radius={8} />
        <SkeletonBlock width="85%" height={12} />
        <SkeletonBlock width="70%" height={12} />
      </View>

      <View style={[styles.darkCard, styles.lines]}>
        <SkeletonBlock width={90} height={10} radius={5} tone="dark" />
        <SkeletonBlock width={170} height={30} radius={8} tone="dark" />
        <SkeletonBlock width={120} height={12} tone="dark" />
      </View>

      <View style={styles.card}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.benefitRow}>
            <SkeletonBlock width={90} height={12} />
            <SkeletonBlock width={110} height={12} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SkeletonBlock width={100} height={12} />
        {BENEFIT_LINE_WIDTHS.slice(0, 3).map((width, index) => (
          <View key={index} style={styles.benefitRow}>
            <SkeletonBlock width={width} height={12} />
            <SkeletonBlock width={20} height={20} radius={10} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { gap: AppSpacing.four },
  centered: { alignItems: 'center', gap: AppSpacing.three },
  lines: { gap: AppSpacing.two },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { gap: AppSpacing.two },
  card: {
    gap: AppSpacing.four,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 22,
    padding: AppSpacing.four,
  },
  darkCard: {
    borderRadius: 22,
    backgroundColor: AppColors.neutral.black,
    padding: AppSpacing.four,
  },
  benefitRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
