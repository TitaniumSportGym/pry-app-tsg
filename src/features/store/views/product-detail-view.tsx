import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { ErrorState } from '@/components/ui/screen-state';
import { useProductDetailViewModel } from '@/features/store/viewmodels/use-product-detail-view-model';
import { useFlyToCart } from '@/features/store/views/fly-to-cart';
import { ProductGallery } from '@/features/store/views/product-gallery';
import { ProductDetailSkeleton } from '@/features/store/views/store-skeletons';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const ACTION_BAR_HEIGHT = 84;

const SPEC_ICONS: Record<string, SymbolViewProps['name']> = {
  Sabor: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  Presentación: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  Porciones: { ios: 'bolt', android: 'bolt', web: 'bolt' },
  Talla: { ios: 'tshirt', android: 'checkroom', web: 'checkroom' },
  Color: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  Material: { ios: 'leaf', android: 'eco', web: 'eco' },
};

/** Screen 11 · Producto — Detalle. */
export function ProductDetailView({ productId }: { productId: unknown }) {
  const viewModel = useProductDetailViewModel(productId);
  const insets = useSafeAreaInsets();
  const flyToCart = useFlyToCart();
  const product = viewModel.product;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: ACTION_BAR_HEIGHT + 64 + insets.bottom }}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            progressViewOffset={insets.top}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {viewModel.isLoading ? (
          viewModel.showSkeleton ? (
            <ProductDetailSkeleton />
          ) : null
        ) : viewModel.errorMessage ? (
          <View style={[styles.body, { paddingTop: insets.top + 72 }]}>
            <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
          </View>
        ) : product ? (
          <>
            <ProductGallery imageUrls={product.imageUrls} name={product.name} />

            <View style={styles.body}>
              <View style={styles.priceRow}>
                <Text style={[styles.price, product.soldOut && styles.priceSoldOut]}>
                  {product.price}
                </Text>
                <View style={[styles.stock, product.soldOut ? styles.stockOut : styles.stockIn]}>
                  <SymbolView
                    name={
                      product.soldOut
                        ? { ios: 'xmark', android: 'close', web: 'close' }
                        : { ios: 'checkmark', android: 'check', web: 'check' }
                    }
                    size={12}
                    tintColor={
                      product.soldOut ? AppColors.neutral.white : AppColors.feedback.success
                    }
                  />
                  <Text style={[styles.stockText, product.soldOut && styles.stockTextOut]}>
                    {product.stockLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.titleBlock}>
                <Text style={styles.category}>{product.category}</Text>
                <Text accessibilityRole="header" style={styles.name}>
                  {product.name}
                </Text>
                {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
                {product.description ? (
                  <Text style={styles.description}>{product.description}</Text>
                ) : null}
              </View>

              {product.specs.length > 0 ? (
                <View style={styles.chips}>
                  {product.specs.map((spec) => (
                    <View key={spec.label} accessible style={styles.chip}>
                      <SymbolView
                        name={
                          SPEC_ICONS[spec.label] ?? { ios: 'tag', android: 'sell', web: 'sell' }
                        }
                        size={16}
                        tintColor={AppColors.brand.primary}
                      />
                      <Text style={styles.chipText}>
                        {spec.label}: {spec.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {product.features.length > 0 ? (
                <View style={styles.features}>
                  <Text style={styles.subtitle}>Características</Text>
                  {product.features.map((feature, index) => (
                    <View key={`${index}-${feature}`} style={styles.feature}>
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={16}
                        tintColor={AppColors.brand.primary}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {viewModel.cartNote ? (
                <Text style={styles.cartNote}>{viewModel.cartNote}</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.topActions, { top: insets.top + 12 }]}>
        <IconButton
          icon={BACK_ICON}
          label="Regresar"
          onPress={viewModel.goBack}
        />
        {product ? (
          <IconButton
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            label="Compartir producto"
            onPress={viewModel.share}
          />
        ) : null}
      </View>

      {product ? (
        <View style={[styles.actionBar, { bottom: insets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !viewModel.canAdd, busy: flyToCart.isFlying }}
            disabled={!viewModel.canAdd || flyToCart.isFlying}
            style={({ pressed }) => [
              styles.action,
              styles.addAction,
              !viewModel.canAdd && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={(event) => {
              if (viewModel.willAddToCart) {
                // The item is added when the photo lands, so the badge bounces on arrival.
                flyToCart.launch(
                  { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY },
                  product.imageUrls[0] ?? null,
                  viewModel.addToCart,
                );
              } else {
                viewModel.addToCart();
              }
            }}
          >
            <Text style={styles.actionText}>
              {product.soldOut ? 'AGOTADO' : viewModel.justAdded ? 'AGREGADO' : 'AGREGAR'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: product.soldOut }}
            disabled={product.soldOut}
            style={({ pressed }) => [
              styles.action,
              styles.buyAction,
              product.soldOut && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={viewModel.buyNow}
          >
            <Text style={styles.actionText}>COMPRAR</Text>
          </Pressable>
        </View>
      ) : null}
      {flyToCart.flyer}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.surface.default },
  body: { gap: 12, paddingHorizontal: 20, paddingTop: 18 },
  priceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 28,
    lineHeight: 32,
  },
  priceSoldOut: { color: AppColors.neutral.placeholder },
  stock: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: AppSpacing.one,
    paddingHorizontal: 10,
    paddingVertical: AppSpacing.one,
  },
  stockIn: { backgroundColor: AppColors.feedback.successSoft },
  stockOut: { backgroundColor: AppColors.surface.darkSelected },
  stockText: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  stockTextOut: { color: AppColors.neutral.white },
  titleBlock: { gap: AppSpacing.one },
  category: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  name: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  brand: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  description: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: AppSpacing.two },
  chip: {
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppColors.surface.muted,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: AppSpacing.two,
  },
  chipText: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  features: { gap: AppSpacing.two },
  subtitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  feature: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.two },
  featureText: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  cartNote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  topActions: {
    position: 'absolute',
    right: 20,
    left: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBar: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: ACTION_BAR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  action: {
    height: 56,
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.two,
  },
  addAction: { backgroundColor: AppColors.neutral.black },
  buyAction: { backgroundColor: AppColors.brand.primary },
  actionText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    letterSpacing: 0.6,
    lineHeight: 20,
  },
  disabled: { opacity: 0.56 },
  pressed: { opacity: 0.82 },
});
