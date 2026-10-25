import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppColors } from '@/theme/tokens';

export const GALLERY_HEIGHT = 330;

interface ProductGalleryProps {
  imageUrls: readonly string[];
  name: string;
}

/**
 * Full-width swipeable photos. The whole photo is shown (contain) over white,
 * so product shots with a white background blend with the screen.
 */
export function ProductGallery({ imageUrls, name }: ProductGalleryProps) {
  const { width } = useWindowDimensions();
  // The current page is purely visual state, so it stays in the view.
  const [page, setPage] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <View style={[styles.gallery, styles.empty]}>
        <SymbolView
          name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
          size={72}
          tintColor={AppColors.brand.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.gallery}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)))
        }
      >
        {imageUrls.map((url, index) => (
          <Image
            key={url}
            accessibilityLabel={`${name}, foto ${index + 1} de ${imageUrls.length}`}
            cachePolicy="memory-disk"
            contentFit="contain"
            source={{ uri: url }}
            style={{ width, height: GALLERY_HEIGHT }}
            transition={150}
          />
        ))}
      </ScrollView>
      {imageUrls.length > 1 ? (
        <View pointerEvents="none" style={styles.dots}>
          {imageUrls.map((url, index) => (
            <View key={url} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { height: GALLERY_HEIGHT, backgroundColor: AppColors.surface.default },
  empty: { alignItems: 'center', justifyContent: 'center' },
  dots: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.border.default },
  dotActive: { width: 24, backgroundColor: AppColors.brand.primary },
});
