import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/theme/tokens';

interface IconTileProps {
  icon: SymbolViewProps['name'];
  size?: number;
  iconSize?: number;
  background?: string;
  color?: string;
}

/** Ícono rojo dentro de un mosaico rosa (radio 12), como en los menús y tarjetas del diseño. */
export function IconTile({
  icon,
  size = 40,
  iconSize = 19,
  background = AppColors.surface.softSelected,
  color = AppColors.brand.primary,
}: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size >= 38 ? 12 : 10, backgroundColor: background },
      ]}>
      <SymbolView name={icon} size={iconSize} tintColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
