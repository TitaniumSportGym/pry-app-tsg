import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/filter-chip';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { SubHeader } from '@/components/ui/sub-header';
import { useOrdersViewModel } from '@/features/orders/viewmodels/use-orders-view-model';
import { OrderCard } from '@/features/orders/views/order-card';
import { OrdersSkeleton } from '@/features/orders/views/orders-skeletons';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

const BAG_ICON = { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' } as const;
const OFFLINE_ICON = { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } as const;

/** Pantallas 35, 38, 39 y 62 · Mis pedidos. */
export function OrdersView() {
  const viewModel = useOrdersViewModel();
  const hasData = !viewModel.isLoading && !viewModel.errorMessage && !viewModel.isEmpty;

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
        <SubHeader subtitle="Compras de productos" title="MIS PEDIDOS" onBack={viewModel.goBack} />

        {viewModel.showSkeleton ? <OrdersSkeleton /> : null}

        {viewModel.errorMessage ? (
          <IllustratedEmptyState
            actionLabel="Reintentar"
            description={viewModel.errorMessage}
            icon={OFFLINE_ICON}
            title="NO PUDIMOS CARGAR TUS PEDIDOS"
            onAction={viewModel.retry}
          />
        ) : null}

        {viewModel.isEmpty ? (
          <IllustratedEmptyState
            actionLabel="Ir a la tienda"
            description="Compra suplementos y accesorios en la tienda. Recógelos gratis en el gimnasio o pide envío a domicilio."
            icon={BAG_ICON}
            title="AÚN NO TIENES PEDIDOS"
            onAction={viewModel.openStore}
          />
        ) : null}

        {hasData ? (
          <>
            <ScrollView
              horizontal
              contentContainerStyle={styles.chips}
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}>
              {viewModel.filters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  selected={viewModel.selectedFilter === filter.value}
                  onPress={() => viewModel.selectFilter(filter.value)}
                />
              ))}
            </ScrollView>
            {viewModel.items.length === 0 ? (
              <Text style={styles.noMatches}>No tienes pedidos en esta categoría.</Text>
            ) : (
              <View style={styles.list}>
                {viewModel.items.map((item) => (
                  <OrderCard key={item.id} item={item} onOpen={viewModel.open} />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  list: { gap: 12 },
  noMatches: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
