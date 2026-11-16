import { StyleSheet, Text } from 'react-native';

import { AppColors, AppFonts } from '@/theme/tokens';

/** Text/Overline del sistema: SemiBold 11, MAYÚSCULAS, para títulos de grupo en formularios y menús. */
export function Overline({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.text}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
});
