import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackScreen } from '@/components/layout/back-screen';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import type { MembershipArea } from '@/features/memberships/models/membership-area';
import { useMembershipsViewModel } from '@/features/memberships/viewmodels/use-memberships-view-model';
import { BenefitsCard } from '@/features/memberships/views/benefits-card';
import { MembershipsSkeleton } from '@/features/memberships/views/membership-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function MembershipsView({ area }: { area: MembershipArea }) {
  const viewModel = useMembershipsViewModel(area);
  const plan = viewModel.selectedPlan;

  return (
    <BackScreen
      refreshing={viewModel.isRefreshing}
      onBack={viewModel.goBack}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        viewModel.showSkeleton ? <MembershipsSkeleton /> : null
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : viewModel.isEmpty || !plan ? (
        <EmptyState
          icon={{ ios: 'creditcard', android: 'card_membership', web: 'card_membership' }}
          title="No hay membresías disponibles"
          description="Vuelve más tarde para consultar los planes del gimnasio."
        />
      ) : (
        <>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              ELIGE TU MEMBRESÍA
            </Text>
            <Text style={styles.subtitle}>Entrena con disciplina y alcanza tus objetivos.</Text>
          </View>

          <ScrollView
            horizontal
            accessibilityRole="tablist"
            contentContainerStyle={styles.selectorContent}
            showsHorizontalScrollIndicator={false}
            style={styles.selector}>
            {viewModel.planOptions.map((option) => {
              const selected = option.id === plan.id;

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => viewModel.selectPlan(option.id)}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.summaryRow}>
            <View style={styles.summaryText}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planSummary}>{plan.summary}</Text>
            </View>
            {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
          </View>

          <View>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.priceNote}>{plan.priceNote}</Text>
          </View>

          <BenefitsCard benefits={plan.benefits} />

          <Pressable
            accessibilityLabel={`Ver detalle de la membresía ${plan.name}`}
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [styles.detailLink, pressed && styles.pressed]}
            onPress={viewModel.openDetail}>
            <Text style={styles.detailLinkText}>VER DETALLE DE LA MEMBRESÍA</Text>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={16}
              tintColor={AppColors.brand.primary}
            />
          </Pressable>
        </>
      )}
    </BackScreen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: AppSpacing.two },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
    textAlign: 'center',
  },
  subtitle: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  selector: {
    flexGrow: 0,
    borderRadius: 26,
    backgroundColor: AppColors.surface.muted,
  },
  selectorContent: { gap: AppSpacing.one, padding: 6 },
  option: {
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.three,
  },
  optionSelected: {
    backgroundColor: AppColors.surface.default,
    boxShadow: '0 1px 4px rgba(16, 16, 16, 0.12)',
  },
  optionText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  optionTextSelected: { color: AppColors.neutral.text, fontFamily: AppFonts.button },
  summaryRow: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  summaryText: { flex: 1, minWidth: 0 },
  planName: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 22,
    lineHeight: 28,
  },
  planSummary: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: AppColors.surface.softSelected,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  priceNote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  detailLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: AppSpacing.one,
    paddingVertical: AppSpacing.two,
  },
  detailLinkText: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  pressed: { opacity: 0.7 },
});
