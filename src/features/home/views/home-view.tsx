import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHomeViewModel } from '@/features/home/viewmodels/use-home-view-model';
import { ClassesComingSoon } from '@/features/home/views/classes-coming-soon';
import { HomeHeader } from '@/features/home/views/home-header';
import { LastPaymentCard } from '@/features/home/views/last-payment-card';
import { MembershipCard } from '@/features/home/views/membership-card';
import { QuickActions } from '@/features/home/views/quick-actions';
import { RecommendedProducts } from '@/features/home/views/recommended-products';
import { AppColors, AppSpacing } from '@/theme/tokens';

export function HomeView() {
  const viewModel = useHomeViewModel();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <HomeHeader
          eyebrow={viewModel.eyebrow}
          greeting={viewModel.greeting}
          initials={viewModel.initials}
        />

        <MembershipCard
          isAuthenticated={viewModel.isAuthenticated}
          onLogin={viewModel.openLogin}
          onOpenMemberships={viewModel.openMemberships}
        />

        <QuickActions actions={viewModel.actions} onPress={viewModel.openAction} />

        <ClassesComingSoon />

        <RecommendedProducts
          errorMessage={viewModel.recommended.errorMessage}
          isLoading={viewModel.recommended.isLoading}
          showSkeleton={viewModel.recommended.showSkeleton}
          items={viewModel.recommended.items}
          onOpenProduct={viewModel.openProduct}
          onRetry={viewModel.recommended.retry}
          onSeeAll={viewModel.openStore}
        />

        <LastPaymentCard
          errorMessage={viewModel.lastPayment.errorMessage}
          isAuthenticated={viewModel.isAuthenticated}
          isLoading={viewModel.lastPayment.isLoading}
          showSkeleton={viewModel.lastPayment.showSkeleton}
          item={viewModel.lastPayment.item}
          onLogin={viewModel.openLogin}
          onRetry={viewModel.lastPayment.retry}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: AppSpacing.four,
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
});
