import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pasos de un flujo (checkout, nueva rutina): completados con ✓, actual en rojo, siguientes en gris. */
export function Stepper({ steps, active }: { steps: readonly string[]; active: number }) {
  return (
    <View accessibilityLabel={`Paso ${active + 1} de ${steps.length}: ${steps[active]}`} accessible style={styles.row}>
      {steps.map((label, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <View key={label} style={styles.group}>
            {index > 0 ? <View style={[styles.line, index <= active && styles.lineActive]} /> : null}
            <View style={[styles.number, (done || current) && styles.numberActive]}>
              {done ? (
                <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={11} tintColor={AppColors.neutral.white} />
              ) : (
                <Text style={[styles.numberText, current && styles.numberTextActive]}>{index + 1}</Text>
              )}
            </View>
            <Text style={[styles.label, current && styles.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  line: { width: 20, height: 2, borderRadius: 1, backgroundColor: AppColors.border.soft },
  lineActive: { backgroundColor: AppColors.brand.primary },
  number: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: AppColors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberActive: { borderWidth: 0, backgroundColor: AppColors.brand.primary },
  numberText: { color: AppColors.neutral.muted, fontFamily: AppFonts.button, fontSize: 11, lineHeight: 14 },
  numberTextActive: { color: AppColors.neutral.white },
  label: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  labelActive: { color: AppColors.neutral.black },
});
