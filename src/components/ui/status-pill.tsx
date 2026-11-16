import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts } from '@/theme/tokens';

export type PillTone = 'success' | 'error' | 'brand' | 'neutral';

/** Etiqueta corta de estado (Aprobado, Pendiente, Predeterminada…). */
export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <View style={[styles.pill, pillStyles[tone]]}>
      <Text numberOfLines={1} style={[styles.text, textStyles[tone]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
});

const pillStyles = StyleSheet.create({
  success: { backgroundColor: AppColors.feedback.successSoft },
  error: { backgroundColor: AppColors.surface.softSelected },
  brand: { backgroundColor: AppColors.surface.softSelected },
  neutral: { backgroundColor: AppColors.surface.input },
});

const textStyles = StyleSheet.create({
  success: { color: AppColors.feedback.success },
  error: { color: AppColors.feedback.error },
  brand: { color: AppColors.brand.primary },
  neutral: { color: AppColors.neutral.muted },
});
