import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/filter-chip';
import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import type { ProductCardItem } from '@/features/store/models/product-card-item';
import { useCatalogViewModel } from '@/features/store/viewmodels/use-catalog-view-model';
import { ProductCard } from '@/features/store/views/product-card';
import { CatalogSkeleton } from '@/features/store/views/store-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface CatalogViewProps {
  category?: unknown;
  query?: unknown;
}

/** Screen 10 · Catálogo: category title, search, chips and a 2-column grid. */
export function CatalogView({ category, query }: CatalogViewProps) {
  const viewModel = useCatalogViewModel({ category, q: query });
  const isReady = !viewModel.isLoading && !viewModel.errorMessage;
  const listRef = useRef<FlatList<ProductCardItem>>(null);
  const { pagination } = viewModel;

  function changePage(page: number) {
    pagination.setPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <IconButton
          icon={BACK_ICON}
          label="Regresar"
          style={styles.back}
          onPress={viewModel.goBack}
        />
        <Text
          accessibilityRole="header"
          adjustsFontSizeToFit
          numberOfLines={1}
          style={styles.title}
        >
          {viewModel.title}
        </Text>
      </View>
      <SearchField
        maxLength={viewModel.maxQueryLength}
        placeholder="Buscar"
        value={viewModel.query}
        onChangeText={viewModel.setQuery}
      />
      {isReady ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
        >
          <FilterChip
            label="Todos"
            selected={viewModel.selectedCategoryId === null}
            onPress={() => viewModel.selectCategory(null)}
          />
          {viewModel.categories.map((item) => (
            <FilterChip
              key={item.id}
              label={item.name}
              selected={viewModel.selectedCategoryId === item.id}
              onPress={() => viewModel.selectCategory(item.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        ref={listRef}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        data={isReady ? viewModel.products : []}
        initialNumToRender={6}
        keyExtractor={(product) => String(product.id)}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          viewModel.isLoading ? (
            viewModel.showSkeleton ? (
              <CatalogSkeleton />
            ) : undefined
          ) : viewModel.errorMessage ? (
            <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
          ) : (
            <EmptyState
              icon={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
              title={viewModel.emptyMessage}
              description="Prueba con otra búsqueda o categoría."
            />
          )
        }
        ListFooterComponent={
          isReady ? (
            <Pagination
              itemLabel="productos"
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
        numColumns={2}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        renderItem={({ item }) => <ProductCard product={item} onPress={viewModel.openProduct} />}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
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
    gap: AppSpacing.three,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  headerBlock: { gap: 14 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  back: { marginLeft: -10 },
  title: {
    flex: 1,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  chips: { gap: AppSpacing.two },
  row: { gap: 20 },
});
