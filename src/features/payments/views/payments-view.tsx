import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/layout/page-header';
import { FilterChip } from '@/components/ui/filter-chip';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { usePaymentsViewModel } from '@/features/payments/viewmodels/use-payments-view-model';
import { PaymentRow } from '@/features/payments/views/payment-row';
import { PaymentsSkeleton, PaymentsSubtitleSkeleton } from '@/features/payments/views/payments-skeleton';
import { PaymentsSummaryCard } from '@/features/payments/views/payments-summary-card';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

/** Screens 26–28 · Mis pagos. */
export function PaymentsView() {
  const viewModel = usePaymentsViewModel();

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
        <PageHeader
          action={{
            icon: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
            label: 'Actualizar pagos',
            onPress: viewModel.refresh,
          }}
          subtitle={viewModel.isLoading ? <PaymentsSubtitleSkeleton /> : 'Pagos y comprobantes'}
          title="MIS PAGOS"
          onBack={viewModel.goBack}
        />

        {viewModel.isLoading ? (
          viewModel.showSkeleton ? (
            <PaymentsSkeleton />
          ) : null
        ) : viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : viewModel.isEmpty ? (
          <IllustratedEmptyState
            actionLabel="Ver membresías"
            description="Cuando pagues tu membresía, una visita o un pedido, aquí verás la fecha, el monto, el estado y tu comprobante."
            icon={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }}
            title="AÚN NO TIENES PAGOS"
            onAction={viewModel.openMemberships}
          />
        ) : (
          <>
            <PaymentsSummaryCard {...viewModel.summary} />
            <ScrollView
              horizontal
              contentContainerStyle={styles.chips}
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}>
              {viewModel.filters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  selected={viewModel.selectedFilter === filter.value}
                  onPress={() => viewModel.selectFilter(filter.value)}
                />
              ))}
            </ScrollView>
            {viewModel.months.length === 0 ? (
              <EmptyState
                description="Prueba con otro filtro."
                icon={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }}
                title="No hay pagos con este estado."
              />
            ) : (
              viewModel.months.map((month) => (
                <View key={month.key} style={styles.month}>
                  <Text accessibilityRole="header" style={styles.monthLabel}>
                    {month.label}
                  </Text>
                  {month.payments.map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 680,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  chipRow: { marginHorizontal: -20 },
  chips: { gap: AppSpacing.two, paddingHorizontal: 20 },
  month: { gap: 14 },
  monthLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    paddingTop: AppSpacing.one,
    textTransform: 'uppercase',
  },
});
