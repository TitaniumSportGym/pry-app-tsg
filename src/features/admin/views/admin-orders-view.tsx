import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { FilterChip } from '@/components/ui/filter-chip';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { useAdminOrdersViewModel } from '@/features/admin/viewmodels/use-admin-orders-view-model';
import { ADMIN_BOTTOM_SPACE, AdminAvatar, AdminCard, AdminHeader } from '@/features/admin/views/admin-ui';
import { OrderStatusBadge } from '@/features/admin/views/order-status-badge';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

type OrderItem = ReturnType<typeof useAdminOrdersViewModel>['orders'][number];

/** Pantalla 47 · Admin — Pedidos. */
export function AdminOrdersView() {
  const viewModel = useAdminOrdersViewModel();
  const { pagination } = viewModel;
  const ready = !viewModel.isLoading && !viewModel.errorMessage;
  const listRef = useRef<FlatList<OrderItem>>(null);

  function changePage(page: number) {
    pagination.setPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const header = (
    <View style={styles.headerBlock}>
      <AdminHeader subtitle={viewModel.subtitle} title="PEDIDOS" />
      <SearchField
        maxLength={viewModel.searchMaxLength}
        placeholder="Buscar por pedido o cliente"
        value={viewModel.query}
        variant="outlined"
        onChangeText={viewModel.setQuery}
      />
      <ScrollView
        horizontal
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}>
        {viewModel.groups.map((group) => (
          <FilterChip
            key={group.value}
            label={group.label}
            selected={group.value === viewModel.selectedGroup}
            onPress={() => viewModel.selectGroup(group.value)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        contentContainerStyle={styles.content}
        data={ready ? viewModel.orders : []}
        keyExtractor={(order) => order.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          viewModel.showSkeleton ? (
            <OrdersSkeleton />
          ) : viewModel.errorMessage ? (
            <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
          ) : viewModel.isLoading ? undefined : (
            <EmptyState
              description={viewModel.emptyDescription}
              icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
              title={viewModel.emptyTitle}
            />
          )
        }
        ListFooterComponent={
          ready ? (
            <Pagination
              itemLabel="pedidos"
              page={pagination.page}
              pageCount={pagination.pageCount}
              rangeEnd={pagination.rangeEnd}
              rangeStart={pagination.rangeStart}
              totalItems={pagination.totalItems}
              onPageChange={changePage}
            />
          ) : undefined
        }
        ListHeaderComponent={header}
        ref={listRef}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onOpen={() => viewModel.openOrder(item.id)} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function OrderCard({ order, onOpen }: { order: OrderItem; onOpen: () => void }) {
  return (
    <AdminCard style={styles.card}>
      <Pressable
        accessibilityHint="Abre el detalle para actualizar la entrega"
        accessibilityRole="button"
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
        onPress={onOpen}>
        <View style={styles.rowBetween}>
          <View style={styles.flexCopy}>
            <Text numberOfLines={1} style={styles.orderTitle}>
              {order.title}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {order.paidLabel}
            </Text>
          </View>
          <OrderStatusBadge label={order.statusLabel} status={order.status} />
        </View>
        <View style={styles.customerRow}>
          <AdminAvatar initials={order.initials} size={36} />
          <View style={styles.flexCopy}>
            <Text numberOfLines={1} style={styles.customerName}>
              {order.customerName}
            </Text>
            <Text style={styles.caption}>{order.itemsLabel}</Text>
          </View>
          <Text style={styles.total}>{order.total}</Text>
        </View>
        <View style={styles.destination}>
          <SymbolView
            name={
              order.isPickup
                ? { ios: 'storefront', android: 'storefront', web: 'storefront' }
                : { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' }
            }
            size={16}
            tintColor={AppColors.brand.primary}
          />
          <Text style={styles.destinationText}>{order.destination}</Text>
        </View>
      </Pressable>
      {order.nextStepLabel ? (
        <AppButton title={order.nextStepLabel} variant={order.nextStepVariant} onPress={onOpen} />
      ) : null}
    </AdminCard>
  );
}

function OrdersSkeleton() {
  return (
    <SkeletonGroup label="Cargando pedidos" style={styles.skeleton}>
      {[0, 1].map((index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.rowBetween}>
            <SkeletonBlock height={20} radius={8} width="45%" />
            <SkeletonBlock height={26} radius={12} width={110} />
          </View>
          <View style={styles.customerRow}>
            <SkeletonBlock height={36} radius={18} width={36} />
            <SkeletonBlock height={14} width="40%" />
          </View>
          <SkeletonBlock height={34} radius={12} />
          <SkeletonBlock height={56} radius={18} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { gap: 14, paddingHorizontal: 20, paddingBottom: ADMIN_BOTTOM_SPACE },
  headerBlock: { gap: 12 },
  chipsScroll: { marginHorizontal: -20, marginBottom: 2 },
  chips: { gap: 8, paddingHorizontal: 20 },
  card: { gap: 12, padding: 16 },
  cardBody: { gap: 12 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flexCopy: { minWidth: 0, flex: 1, gap: 1 },
  orderTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  customerRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  customerName: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  total: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 16,
    lineHeight: 22,
  },
  destination: {
    borderRadius: 12,
    backgroundColor: AppColors.surface.soft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  destinationText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  skeleton: { gap: 14 },
  skeletonCard: {
    gap: 12,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: 16,
  },
  pressed: { opacity: 0.8 },
});
