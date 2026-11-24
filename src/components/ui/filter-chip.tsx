import { Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  chipSelected: { borderColor: AppColors.neutral.black, backgroundColor: AppColors.neutral.black },
  text: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  textSelected: { color: AppColors.neutral.white },
});
