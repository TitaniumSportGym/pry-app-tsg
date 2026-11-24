import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/theme/tokens';

/** Barra inferior fija con la acción principal de formularios y del checkout. */
export function ActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: 10,
    backgroundColor: AppColors.surface.default,
    paddingHorizontal: 20,
    paddingTop: 14,
    boxShadow: '0 -6px 20px rgba(15, 15, 15, 0.08)',
  },
});
