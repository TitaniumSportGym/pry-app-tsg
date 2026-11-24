import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppColors, AppShadows } from '@/theme/tokens';

/** Tarjeta blanca del sistema: radio 22 y sombra de tarjeta. */
export function SurfaceCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
});
