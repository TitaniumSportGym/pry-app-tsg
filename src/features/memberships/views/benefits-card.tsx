import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function BenefitsCard({ benefits }: { benefits: readonly string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Beneficios</Text>
      {benefits.length === 0 ? (
        <Text style={styles.empty}>Este plan aún no tiene beneficios registrados.</Text>
      ) : (
        benefits.map((benefit, index) => (
          <View key={`${index}-${benefit}`} style={styles.row}>
            <Text style={styles.benefit}>{benefit}</Text>
            <SymbolView
              accessibilityLabel="Incluido"
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={20}
              tintColor={AppColors.brand.primary}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: AppSpacing.three,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.four,
  },
  header: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  benefit: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  empty: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
});
