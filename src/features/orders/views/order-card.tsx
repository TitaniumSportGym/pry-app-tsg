import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductThumb } from '@/components/ui/product-thumb';
import type { OrderCardItem } from '@/features/orders/viewmodels/use-orders-view-model';
import { FulfillmentBadge } from '@/features/orders/views/fulfillment-badge';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

/** Tarjeta de la pantalla 35 · Mis pedidos. */
export function OrderCard({ item, onOpen }: { item: OrderCardItem; onOpen: (orderId: string) => void }) {
  return (
    <Pressable
      accessibilityHint={item.actionLabel}
      accessibilityLabel={`${item.title}, ${item.total}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onOpen(item.id)}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          {item.date ? <Text style={styles.date}>{item.date}</Text> : null}
        </View>
        {item.status ? <FulfillmentBadge status={item.status} /> : null}
      </View>

      <View style={styles.products}>
        <View style={styles.thumbs}>
          {item.products.map((product) => (
            <ProductThumb key={product.key} imageUrl={product.imageUrl} size={40} />
          ))}
        </View>
        <View style={styles.copy}>
          <Text style={styles.itemsLabel}>{item.itemsLabel}</Text>
          <Text numberOfLines={1} style={styles.delivery}>
            {item.delivery}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{item.total}</Text>
        </View>
        <View style={styles.action}>
          <Text style={styles.actionText}>{item.actionLabel}</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor={AppColors.brand.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  pressed: { opacity: 0.82 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 15,
    lineHeight: 20,
  },
  date: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  products: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  thumbs: { flexDirection: 'row', gap: 6 },
  itemsLabel: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  delivery: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    paddingTop: 12,
  },
  totalLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  total: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 16,
    lineHeight: 22,
  },
  action: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionText: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
