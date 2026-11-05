import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { getFulfillmentTone, type FulfillmentStatus } from '@/features/admin/models/admin-order';
import { AppColors, AppFonts } from '@/theme/tokens';

const ICONS: Record<string, SymbolViewProps['name']> = {
  payment_confirmed: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  preparing: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  packed: { ios: 'archivebox', android: 'package_2', web: 'package_2' },
  ready_for_pickup: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  shipped: { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' },
  incident: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
};
const DEFAULT_ICON: SymbolViewProps['name'] = { ios: 'clock', android: 'schedule', web: 'schedule' };

const TONE = {
  pending: { background: AppColors.surface.input, text: AppColors.neutral.muted, icon: AppColors.neutral.muted },
  progress: { background: AppColors.surface.dark, text: AppColors.neutral.white, icon: AppColors.brand.primary },
  done: { background: AppColors.feedback.successSoft, text: AppColors.feedback.success, icon: AppColors.feedback.success },
  error: { background: AppColors.surface.softSelected, text: AppColors.feedback.error, icon: AppColors.feedback.error },
} as const;

/** Estado logístico del pedido (fulfillment.status), con el color que define el diseño. */
export function OrderStatusBadge({ status, label }: { status: FulfillmentStatus; label: string }) {
  const tone = TONE[getFulfillmentTone(status)];

  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <SymbolView name={ICONS[status] ?? DEFAULT_ICON} size={13} tintColor={tone.icon} />
      <Text numberOfLines={1} style={[styles.label, { color: tone.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingLeft: 9,
    paddingRight: 10,
    paddingVertical: 5,
  },
  label: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
});
