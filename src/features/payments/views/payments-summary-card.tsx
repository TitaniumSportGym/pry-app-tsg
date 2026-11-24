import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

const DECORATION = require('@/assets/images/payments/total-decoration.svg');

interface PaymentsSummaryCardProps {
  total: string;
  currency: string;
  paidCount: number;
  pendingCount: number;
  receiptCount: number;
}

export function PaymentsSummaryCard({
  total,
  currency,
  paidCount,
  pendingCount,
  receiptCount,
}: PaymentsSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Image contentFit="contain" source={DECORATION} style={styles.decoration} />
      <Text style={styles.overline}>Total pagado</Text>
      <View accessible accessibilityLabel={`Total pagado ${total} ${currency}`} style={styles.totalRow}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.total}>
          {total}
        </Text>
        <Text style={styles.currency}>{currency}</Text>
      </View>
      <Text style={styles.caption}>Solo pagos confirmados</Text>
      <View style={styles.indicators}>
        <Indicator label="Exitosos" value={paidCount} />
        <Indicator bordered label="Pendientes" value={pendingCount} />
        <Indicator bordered label="Comprobantes" value={receiptCount} />
      </View>
    </View>
  );
}

function Indicator({
  label,
  value,
  bordered = false,
}: {
  label: string;
  value: number;
  bordered?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.indicator, bordered && styles.indicatorBordered]}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.indicatorValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    gap: 4,
    borderRadius: 24,
    backgroundColor: AppColors.surface.dark,
    padding: 20,
  },
  decoration: { position: 'absolute', top: -60, right: -40, width: 170, height: 170 },
  overline: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  totalRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
  total: {
    flexShrink: 1,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: 34,
    lineHeight: 40,
  },
  currency: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  caption: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  indicators: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: AppColors.surface.darkSelected,
    marginTop: 10,
    paddingTop: 14,
  },
  indicator: { flex: 1, gap: 2 },
  indicatorBordered: {
    borderLeftWidth: 1,
    borderLeftColor: AppColors.surface.darkSelected,
    paddingLeft: 14,
  },
  indicatorValue: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
});
