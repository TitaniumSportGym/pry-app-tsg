import { StyleSheet, Text, View } from 'react-native';

import { BackScreen } from '@/components/layout/back-screen';
import { ErrorState } from '@/components/ui/screen-state';
import type { MembershipArea } from '@/features/memberships/models/membership-area';
import { useMembershipDetailViewModel } from '@/features/memberships/viewmodels/use-membership-detail-view-model';
import { BenefitsCard } from '@/features/memberships/views/benefits-card';
import { BuyMembershipButton } from '@/features/memberships/views/buy-membership-button';
import { MembershipDetailSkeleton } from '@/features/memberships/views/membership-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface MembershipDetailViewProps {
  area: MembershipArea;
  planId: unknown;
}

export function MembershipDetailView({ area, planId }: MembershipDetailViewProps) {
  const viewModel = useMembershipDetailViewModel(area, planId);
  const plan = viewModel.plan;

  return (
    <BackScreen
      refreshing={viewModel.isRefreshing}
      onBack={viewModel.goBack}
      onRefresh={viewModel.refresh}
    >
      {viewModel.isLoading ? (
        viewModel.showSkeleton ? (
          <MembershipDetailSkeleton />
        ) : null
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : plan ? (
        <>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{plan.typeLabel.toUpperCase()}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {plan.name.toUpperCase()}
            </Text>
            {plan.description ? <Text style={styles.description}>{plan.description}</Text> : null}
            {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Precio</Text>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.priceNote}>por {plan.duration}</Text>
            {plan.pricePerPerson ? (
              <Text style={styles.priceNote}>{plan.pricePerPerson} por persona</Text>
            ) : null}
          </View>

          <View style={styles.infoCard}>
            <InfoRow label="Duración" value={plan.duration} />
            <InfoRow label="Tipo" value={plan.typeLabel} />
            <InfoRow label="Cobertura" value={plan.people} />
            {plan.requirement ? <InfoRow label="Requisito" value={plan.requirement} /> : null}
          </View>

          <BenefitsCard benefits={plan.benefits} />

          {viewModel.canBuy ? (
            <BuyMembershipButton
              errorMessage={viewModel.purchaseError}
              isBuying={viewModel.isBuying}
              price={plan.price}
              onBuy={viewModel.buy}
            />
          ) : null}
        </>
      ) : null}
    </BackScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', gap: AppSpacing.two },
  eyebrow: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  description: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
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
  priceCard: {
    gap: AppSpacing.one,
    borderRadius: 22,
    backgroundColor: AppColors.neutral.black,
    padding: AppSpacing.four,
  },
  priceLabel: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  price: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: 48,
    lineHeight: 52,
  },
  priceNote: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  infoCard: {
    gap: AppSpacing.three,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 22,
    padding: AppSpacing.four,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: AppSpacing.three },
  infoLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  infoValue: {
    flexShrink: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'right',
  },
});
