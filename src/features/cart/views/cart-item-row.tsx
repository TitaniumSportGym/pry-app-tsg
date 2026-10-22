import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export interface CartRowItem {
  id: number;
  name: string;
  detail: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
  canIncrease: boolean;
  canDecrease: boolean;
}

interface CartItemRowProps {
  item: CartRowItem;
  onIncrease: (productId: number) => void;
  onDecrease: (productId: number) => void;
  onRemove: (productId: number) => void;
  onOpen: (productId: number) => void;
}

/** Figma "Producto en carrito": thumbnail with delete, name, variant, price and quantity. */
export function CartItemRow({ item, onIncrease, onDecrease, onRemove, onOpen }: CartItemRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`Ver ${item.name}`}
        accessibilityRole="button"
        style={styles.thumbnail}
        onPress={() => onOpen(item.id)}
      >
        {item.imageUrl ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: item.imageUrl }}
            style={styles.image}
          />
        ) : (
          <SymbolView
            name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
            size={32}
            tintColor={AppColors.brand.primary}
          />
        )}
        <Pressable
          accessibilityLabel={`Quitar ${item.name} del carrito`}
          accessibilityRole="button"
          hitSlop={6}
          style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
          onPress={() => onRemove(item.id)}
        >
          <SymbolView
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={15}
            tintColor={AppColors.brand.primary}
          />
        </Pressable>
      </Pressable>

      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        {item.detail ? (
          <Text numberOfLines={1} style={styles.detail}>
            {item.detail}
          </Text>
        ) : null}
        <View style={styles.spacer} />
        <View style={styles.bottom}>
          <Text style={styles.price}>{item.price}</Text>
          <View style={styles.stepper}>
            <StepButton
              disabled={!item.canDecrease}
              icon={{ ios: 'minus', android: 'remove', web: 'remove' }}
              label={`Quitar una unidad de ${item.name}`}
              onPress={() => onDecrease(item.id)}
            />
            <Text accessibilityLabel={`Cantidad: ${item.quantity}`} style={styles.quantity}>
              {item.quantity}
            </Text>
            <StepButton
              disabled={!item.canIncrease}
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              label={`Agregar una unidad de ${item.name}`}
              onPress={() => onIncrease(item.id)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

interface StepButtonProps {
  icon: SymbolViewProps['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.step, disabled && styles.disabled, pressed && styles.pressed]}
      onPress={onPress}
    >
      <SymbolView name={icon} size={14} tintColor={AppColors.brand.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  thumbnail: {
    width: 112,
    height: 104,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: AppColors.surface.default,
    borderRadius: 16,
    backgroundColor: AppColors.surface.softSelected,
    boxShadow: '0 5px 10px rgba(15, 15, 15, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: 11 },
  trash: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surface.default,
    boxShadow: '0 5px 10px rgba(15, 15, 15, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0, gap: AppSpacing.one, paddingVertical: AppSpacing.one },
  name: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  detail: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  spacer: { flex: 1 },
  bottom: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.two },
  step: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: AppColors.brand.primary,
    borderRadius: 16,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 38,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: AppColors.surface.softSelected,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 32,
    textAlign: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
