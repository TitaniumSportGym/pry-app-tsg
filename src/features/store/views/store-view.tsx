import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import { SectionHeader } from '@/components/ui/section-header';
import { useStoreViewModel } from '@/features/store/viewmodels/use-store-view-model';
import { CategoryCard } from '@/features/store/views/category-card';
import { ProductCard } from '@/features/store/views/product-card';
import { StoreSkeleton } from '@/features/store/views/store-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

/** Screen 09 · Tienda — Inicio (without promotions: the gym has no discounts). */
export function StoreView() {
  const viewModel = useStoreViewModel();
  const rows = chunk(viewModel.categories, 2);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, styles.padded]}>
          <Text accessibilityRole="header" style={styles.title}>
            TIENDA
          </Text>
          <View style={styles.search}>
            <SearchField
              maxLength={viewModel.maxQueryLength}
              placeholder="Buscar"
              value={viewModel.query}
              onChangeText={viewModel.setQuery}
              onSubmit={viewModel.submitSearch}
            />
          </View>
        </View>

        {viewModel.isLoading ? (
          viewModel.showSkeleton ? (
            <View style={styles.padded}>
              <StoreSkeleton />
            </View>
          ) : null
        ) : viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : viewModel.isEmpty ? (
          <EmptyState
            icon={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
            title="Aún no hay productos en la tienda"
            description="Vuelve pronto para ver suplementos, ropa y accesorios."
          />
        ) : (
          <>
            <View style={[styles.section, styles.padded]}>
              <SectionHeader
                title="Categorías"
                actionLabel="Ver todo"
                onAction={viewModel.openCatalog}
              />
              {rows.map((row, index) => (
                <View key={index} style={styles.row}>
                  {row.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onPress={viewModel.openCategory}
                    />
                  ))}
                  {row.length === 1 ? <View style={styles.placeholder} /> : null}
                </View>
              ))}
            </View>

            {viewModel.newest.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.padded}>
                  <SectionHeader
                    title="Nuevos"
                    actionLabel="Ver todo"
                    onAction={viewModel.openCatalog}
                  />
                </View>
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.carousel}
                  showsHorizontalScrollIndicator={false}
                >
                  {viewModel.newest.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      width={165}
                      onPress={viewModel.openProduct}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function chunk<T>(items: readonly T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 28,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  padded: { paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  search: { flex: 1 },
  section: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  placeholder: { flex: 1 },
  carousel: { gap: 12, paddingHorizontal: 20, paddingBottom: AppSpacing.two },
});
