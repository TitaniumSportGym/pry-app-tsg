import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { CurrentPlan } from '@/features/memberships/viewmodels/use-my-subscription';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Plan vigente del socio, arriba de la lista de planes. */
export function CurrentPlanCard({ plan }: { plan: CurrentPlan }) {
  return (
    <View
      accessible
      accessibilityLabel={`Tu plan actual: ${plan.name}. ${plan.validity}`}
      style={styles.card}>
      <View style={styles.icon}>
        <SymbolView
          name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }}
          size={20}
          tintColor={AppColors.neutral.white}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>TU PLAN ACTUAL</Text>
        <Text numberOfLines={1} style={styles.name}>
          {plan.name}
        </Text>
        <Text style={styles.validity}>{plan.validity}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>Activa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { minWidth: 0, flex: 1, gap: 1 },
  label: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 15,
  },
  name: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  validity: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  pill: {
    borderRadius: 10,
    backgroundColor: AppColors.feedback.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 16,
  },
});
