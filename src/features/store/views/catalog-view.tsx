import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
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

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Regresar"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={viewModel.goBack}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={AppColors.neutral.text}
          />
        </Pressable>
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
          <Chip
            label="Todos"
            selected={viewModel.selectedCategoryId === null}
            onPress={() => viewModel.selectCategory(null)}
          />
          {viewModel.categories.map((item) => (
            <Chip
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

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
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
  header: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  chips: { gap: AppSpacing.two },
  chip: {
    height: 38,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  chipSelected: { borderColor: AppColors.neutral.black, backgroundColor: AppColors.neutral.black },
  chipText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  chipTextSelected: { color: AppColors.neutral.white },
  row: { gap: 20 },
  pressed: { opacity: 0.7 },
});
