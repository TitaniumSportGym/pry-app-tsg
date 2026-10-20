import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackScreen } from '@/components/layout/back-screen';
import { ErrorState } from '@/components/ui/screen-state';
import { useProductDetailViewModel } from '@/features/store/viewmodels/use-product-detail-view-model';
import { ProductDetailSkeleton } from '@/features/store/views/store-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function ProductDetailView({ productId }: { productId: unknown }) {
  const viewModel = useProductDetailViewModel(productId);
  const product = viewModel.product;

  return (
    <BackScreen
      background={AppColors.surface.soft}
      refreshing={viewModel.isRefreshing}
      onBack={viewModel.goBack}
      onRefresh={viewModel.refresh}>
      {viewModel.isLoading ? (
        viewModel.showSkeleton ? <ProductDetailSkeleton /> : null
      ) : viewModel.errorMessage ? (
        <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
      ) : product ? (
        <>
          <ProductGallery imageUrls={product.imageUrls} name={product.name} />

          <View style={styles.titleBlock}>
            <Text style={styles.category}>{product.category}</Text>
            <Text accessibilityRole="header" style={styles.name}>
              {product.name}
            </Text>
            {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.price, product.soldOut && styles.priceSoldOut]}>
              {product.price}
            </Text>
            <Text style={[styles.stock, product.soldOut ? styles.stockOut : styles.stockIn]}>
              {product.stockLabel}
            </Text>
          </View>

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {product.specs.length > 0 ? (
            <View style={styles.card}>
              {product.specs.map((spec) => (
                <View key={spec.label} style={styles.specRow}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {product.features.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Características</Text>
              {product.features.map((feature, index) => (
                <View key={`${index}-${feature}`} style={styles.featureRow}>
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={18}
                    tintColor={AppColors.brand.primary}
                  />
                  <Text style={styles.feature}>{feature}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </BackScreen>
  );
}

function ProductGallery({ imageUrls, name }: { imageUrls: string[]; name: string }) {
  // Which photo is shown is purely visual state, so it stays in the view.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedUrl = imageUrls[selectedIndex] ?? imageUrls[0];

  return (
    <View style={styles.gallery}>
      <View style={styles.mainImage}>
        {selectedUrl ? (
          <Image
            accessibilityLabel={name}
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: selectedUrl }}
            style={styles.image}
            transition={150}
          />
        ) : (
          <SymbolView
            name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
            size={56}
            tintColor={AppColors.brand.primary}
          />
        )}
      </View>

      {imageUrls.length > 1 ? (
        <View style={styles.thumbnails}>
          {imageUrls.map((url, index) => (
            <Pressable
              key={url}
              accessibilityLabel={`Ver foto ${index + 1} de ${imageUrls.length}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === selectedIndex }}
              style={[styles.thumbnail, index === selectedIndex && styles.thumbnailSelected]}
              onPress={() => setSelectedIndex(index)}>
              <Image contentFit="cover" source={{ uri: url }} style={styles.image} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: AppSpacing.two },
  mainImage: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  thumbnails: { flexDirection: 'row', gap: AppSpacing.two },
  thumbnail: {
    width: 60,
    height: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
  },
  thumbnailSelected: { borderColor: AppColors.brand.primary },
  titleBlock: { gap: AppSpacing.one },
  category: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  name: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 24,
    lineHeight: 30,
  },
  brand: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  priceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  priceSoldOut: { color: AppColors.neutral.placeholder },
  stock: {
    overflow: 'hidden',
    borderRadius: 14,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stockIn: { backgroundColor: AppColors.feedback.successSoft, color: AppColors.feedback.success },
  stockOut: { backgroundColor: AppColors.surface.darkSelected, color: AppColors.neutral.white },
  description: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  card: {
    gap: AppSpacing.three,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.four,
  },
  cardTitle: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: AppSpacing.three },
  specLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  specValue: {
    flexShrink: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'right',
  },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.two },
  feature: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
});
