import { StatusBar } from 'expo-status-bar';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import { useStoreViewModel } from '@/features/store/viewmodels/use-store-view-model';
import { ProductCard } from '@/features/store/views/product-card';
import { StoreSkeleton } from '@/features/store/views/store-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function StoreView() {
  const viewModel = useStoreViewModel();
  const isReady = !viewModel.isLoading && !viewModel.errorMessage;

  const header = (
    <View style={styles.header}>
      <View>
        <Text accessibilityRole="header" style={styles.title}>
          TIENDA TITANIUM
        </Text>
        <Text style={styles.subtitle}>Complementa cada entrenamiento</Text>
      </View>

      {isReady ? (
        <>
          <SearchField
            maxLength={viewModel.maxQueryLength}
            placeholder="Buscar productos"
            value={viewModel.query}
            onChangeText={viewModel.setQuery}
          />
          <ScrollView
            horizontal
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}>
            <CategoryChip
              label="Todos"
              selected={viewModel.selectedCategoryId === null}
              onPress={() => viewModel.selectCategory(null)}
            />
            {viewModel.categories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.name}
                selected={viewModel.selectedCategoryId === category.id}
                onPress={() => viewModel.selectCategory(category.id)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
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
              <StoreSkeleton />
            ) : null
          ) : viewModel.errorMessage ? (
            <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
          ) : (
            <EmptyState
              icon={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
              title={viewModel.emptyMessage ?? 'Sin productos'}
              description="Prueba con otra búsqueda o categoría."
            />
          )
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

interface CategoryChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function CategoryChip({ label, selected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.soft },
  content: {
    width: '100%',
    maxWidth: 680,
    flexGrow: 1,
    alignSelf: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  header: { gap: AppSpacing.three },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  subtitle: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  chips: { gap: AppSpacing.two },
  chip: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.three,
  },
  chipSelected: {
    borderColor: AppColors.neutral.black,
    backgroundColor: AppColors.neutral.black,
  },
  chipText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  chipTextSelected: { color: AppColors.neutral.white },
  row: { gap: AppSpacing.three },
});
