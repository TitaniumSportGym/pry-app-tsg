import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategorySummary } from '@/features/store/models/product';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

interface CategoryCardProps {
  category: CategorySummary;
  onPress: (categoryId: number) => void;
}

/** Figma "Categoría": 2×2 product thumbnails, name and product count. */
export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const slots = [0, 1, 2, 3].map((index) => category.imageUrls[index] ?? null);

  return (
    <Pressable
      accessibilityLabel={`${category.name}, ${category.count} productos`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(category.id)}
    >
      <View style={styles.grid}>
        {slots.map((url, index) => (
          <View key={index} style={styles.thumbnail}>
            {url ? (
              <Image
                cachePolicy="memory-disk"
                contentFit="cover"
                source={{ uri: url }}
                style={styles.image}
              />
            ) : (
              <SymbolView
                name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
                size={20}
                tintColor={AppColors.brand.primary}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.name}>
          {category.name}
        </Text>
        <Text style={styles.count}>{category.count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: AppSpacing.two,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: '0 5px 10px rgba(15, 15, 15, 0.1)',
    padding: AppSpacing.two,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbnail: {
    width: '47%',
    flexGrow: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: AppColors.surface.default,
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
    boxShadow: '0 5px 10px rgba(15, 15, 15, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: 8 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    justifyContent: 'space-between',
    paddingBottom: 2,
    paddingHorizontal: AppSpacing.one,
  },
  name: {
    flexShrink: 1,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  count: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: AppColors.surface.softSelected,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    paddingHorizontal: AppSpacing.two,
    paddingVertical: 3,
  },
  pressed: { opacity: 0.8 },
});
