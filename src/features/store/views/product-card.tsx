import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import type { ProductCardItem } from '@/features/store/models/product-card-item';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface ProductCardProps {
  product: ProductCardItem;
  /** Fixed width for horizontal lists; grids let the card fill its column. */
  width?: DimensionValue;
  onPress: (productId: number) => void;
}

/** Figma "Product card": image box with a white frame, name on one line and price. */
export const ProductCard = memo(function ProductCard({
  product,
  width,
  onPress,
}: ProductCardProps) {
  return (
    <Pressable
      accessibilityHint="Abre el detalle del producto"
      accessibilityLabel={`${product.name}, ${product.price}${product.soldOut ? ', agotado' : ''}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        width ? { width } : styles.fill,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(product.id)}
    >
      <View style={styles.imageBox}>
        {product.imageUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={String(product.id)}
            source={{ uri: product.imageUrl }}
            style={styles.image}
            transition={150}
          />
        ) : (
          <SymbolView
            name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
            size={40}
            tintColor={AppColors.brand.primary}
          />
        )}
        {product.soldOut ? <Text style={styles.soldOut}>AGOTADO</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {product.name}
      </Text>
      <Text style={[styles.price, product.soldOut && styles.priceSoldOut]}>{product.price}</Text>
    </Pressable>
  );
});

export const PRODUCT_IMAGE_HEIGHT = 180;

const styles = StyleSheet.create({
  card: { gap: AppSpacing.two },
  fill: { flex: 1, maxWidth: '50%' },
  imageBox: {
    height: PRODUCT_IMAGE_HEIGHT,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: AppColors.surface.default,
    borderRadius: 20,
    backgroundColor: AppColors.surface.softSelected,
    boxShadow: '0 5px 10px rgba(15, 15, 15, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: 15 },
  soldOut: {
    position: 'absolute',
    top: 6,
    left: 6,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: AppColors.surface.darkSelected,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  name: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  priceSoldOut: { color: AppColors.neutral.placeholder },
  pressed: { opacity: 0.75 },
});
