import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/theme/tokens';

/** Miniatura de producto del sistema: fondo #FDE5E2, foto o ícono de bolsa como respaldo. */
export function ProductThumb({ imageUrl, size = 48 }: { imageUrl: string | null; size?: number }) {
  return (
    <View
      accessible={false}
      style={[styles.thumb, { width: size, height: size, borderRadius: size >= 48 ? 14 : 12 }]}>
      {imageUrl ? (
        <Image cachePolicy="memory-disk" contentFit="cover" source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <SymbolView
          name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
          size={Math.round(size * 0.45)}
          tintColor={AppColors.brand.primary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    overflow: 'hidden',
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
});
