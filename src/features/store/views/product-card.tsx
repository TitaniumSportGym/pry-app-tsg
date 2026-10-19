import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export interface ProductCardItem {
  id: number;
  name: string;
  category: string;
  price: string;
  imageUrl: string | null;
  soldOut: boolean;
}

interface ProductCardProps {
  product: ProductCardItem;
  onPress: (productId: number) => void;
}

export const ProductCard = memo(function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable
      accessibilityHint="Abre el detalle del producto"
      accessibilityLabel={`${product.name}, ${product.price}${product.soldOut ? ', agotado' : ''}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(product.id)}>
      <View style={styles.imageContainer}>
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
            size={36}
            tintColor={AppColors.brand.primary}
          />
        )}
        {product.soldOut ? <Text style={styles.soldOut}>AGOTADO</Text> : null}
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.category}>
          {product.category}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
      </View>
      <Text style={[styles.price, product.soldOut && styles.priceSoldOut]}>{product.price}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: '50%',
    gap: AppSpacing.two,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: 10,
  },
  imageContainer: {
    height: 124,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  soldOut: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  copy: { gap: 2 },
  category: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 15,
  },
  name: {
    minHeight: 40,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  price: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  priceSoldOut: { color: AppColors.neutral.placeholder },
  pressed: { opacity: 0.75 },
});
