import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { PaymentConceptKind } from '@/features/payments/models/payment-history';
import type { PaymentStatus } from '@/features/payments/models/payment';
import type { PaymentRowItem } from '@/features/payments/viewmodels/use-payments-view-model';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const KIND_ICONS: Record<PaymentConceptKind, SymbolViewProps['name']> = {
  membership: { ios: 'ticket', android: 'confirmation_number', web: 'confirmation_number' },
  group: { ios: 'person.2', android: 'group', web: 'group' },
  product: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  other: { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' },
};

const METHOD_ICONS: Record<string, SymbolViewProps['name']> = {
  cash: { ios: 'banknote', android: 'payments', web: 'payments' },
  card_terminal: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  online_checkout: { ios: 'globe', android: 'language', web: 'language' },
};

const UNKNOWN_METHOD_ICON: SymbolViewProps['name'] = {
  ios: 'questionmark.circle',
  android: 'help',
  web: 'help',
};

const STATUS_STYLES: Partial<
  Record<PaymentStatus, { icon: SymbolViewProps['name']; background: string; color: string }>
> = {
  paid: {
    icon: { ios: 'checkmark', android: 'check', web: 'check' },
    background: AppColors.feedback.successSoft,
    color: AppColors.feedback.success,
  },
  pending: {
    icon: { ios: 'clock', android: 'schedule', web: 'schedule' },
    background: AppColors.surface.input,
    color: AppColors.neutral.description,
  },
};

const OTHER_STATUS_STYLE = {
  icon: { ios: 'xmark', android: 'close', web: 'close' },
  background: AppColors.surface.input,
  color: AppColors.feedback.error,
} satisfies { icon: SymbolViewProps['name']; background: string; color: string };

export function PaymentRow({ payment }: { payment: PaymentRowItem }) {
  const isPaid = payment.status === 'paid';
  const status = STATUS_STYLES[payment.status] ?? OTHER_STATUS_STYLE;

  return (
    <View
      accessible
      accessibilityLabel={`${payment.title}, ${payment.amount}, ${payment.statusLabel}, ${payment.dateLabel}`}
      style={styles.card}>
      <View style={styles.main}>
        <View style={[styles.iconBox, isPaid ? styles.iconBoxPaid : styles.iconBoxIdle]}>
          <SymbolView
            name={KIND_ICONS[payment.kind]}
            size={20}
            tintColor={isPaid ? AppColors.brand.primary : AppColors.neutral.muted}
          />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {payment.title}
          </Text>
          <Text style={styles.date}>{payment.dateLabel}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{payment.amount}</Text>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <SymbolView name={status.icon} size={11} tintColor={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{payment.statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detail}>
        <View style={styles.method}>
          <SymbolView
            name={METHOD_ICONS[payment.method] ?? UNKNOWN_METHOD_ICON}
            size={16}
            tintColor={AppColors.neutral.description}
          />
          <Text numberOfLines={1} style={styles.methodText}>
            {payment.methodLabel}
          </Text>
        </View>
        {payment.reference ? (
          <View style={styles.reference}>
            <SymbolView
              name={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }}
              size={14}
              tintColor={AppColors.brand.primary}
            />
            <Text style={styles.referenceText}>{payment.reference}</Text>
          </View>
        ) : (
          <Text style={styles.noReference}>Sin comprobante</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  main: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPaid: { backgroundColor: AppColors.surface.softSelected },
  iconBoxIdle: { backgroundColor: AppColors.surface.input },
  copy: { flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  date: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  amountBlock: { alignItems: 'flex-end', gap: 6 },
  amount: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  detail: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  method: { flexShrink: 1, alignItems: 'center', flexDirection: 'row', gap: 6 },
  methodText: {
    flexShrink: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  reference: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  referenceText: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  noReference: {
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
