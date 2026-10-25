import { StyleSheet, Text } from 'react-native';

import { AppColors, AppFonts } from '@/theme/tokens';

export function ComingSoonBadge({ label = 'PRÓXIMAMENTE' }: { label?: string }) {
  return <Text style={styles.badge}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: AppColors.surface.muted,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.button,
    fontSize: 10,
    lineHeight: 13,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
