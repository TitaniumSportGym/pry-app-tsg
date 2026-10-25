import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface RecommendedItem {
  id: number;
  name: string;
  price: string;
  imageUrl: string | undefined;
}

interface RecommendedProductsProps {
  isLoading: boolean;
  showSkeleton: boolean;
  errorMessage: string | null;
  items: RecommendedItem[];
  onRetry: () => void;
  onSeeAll: () => void;
  onOpenProduct: (productId: number) => void;
}

export function RecommendedProducts({
  isLoading,
  showSkeleton,
  errorMessage,
  items,
  onRetry,
  onSeeAll,
  onOpenProduct,
}: RecommendedProductsProps) {
  // Nothing to recommend and nothing pending: the section is hidden.
  if (!isLoading && !errorMessage && items.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Recomendado para ti" actionLabel="Ver todo" onAction={onSeeAll} />

      {isLoading ? (
        showSkeleton ? (
          <SkeletonGroup label="Cargando productos recomendados" style={styles.row}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.card}>
                <SkeletonBlock height={130} radius={16} />
                <SkeletonBlock width="85%" height={12} />
                <SkeletonBlock width={64} height={14} />
              </View>
            ))}
          </SkeletonGroup>
        ) : null
      ) : errorMessage ? (
        <Pressable accessibilityRole="button" style={styles.error} onPress={onRetry}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.retry}>Reintentar</Text>
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={styles.row}
          showsHorizontalScrollIndicator={false}
        >
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`${item.name}, ${item.price}`}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => onOpenProduct(item.id)}
            >
              <View style={styles.imageContainer}>
                <Image
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  source={{ uri: item.imageUrl }}
                  style={styles.image}
                  transition={150}
                />
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.price}>{item.price}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppSpacing.three },
  row: { flexDirection: 'row', gap: AppSpacing.three },
  card: { width: 150, gap: AppSpacing.one },
  imageContainer: {
    height: 130,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: AppColors.surface.softSelected,
  },
  image: { width: '100%', height: '100%' },
  name: {
    marginTop: AppSpacing.one,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  price: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  error: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 16,
    backgroundColor: AppColors.surface.default,
    gap: AppSpacing.one,
    padding: AppSpacing.three,
  },
  errorText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  retry: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
  },
  pressed: { opacity: 0.75 },
});
