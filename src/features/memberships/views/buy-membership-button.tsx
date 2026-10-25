import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface BuyMembershipButtonProps {
  price: string;
  isBuying: boolean;
  errorMessage: string | null;
  onBuy: () => void;
}

export function BuyMembershipButton({
  price,
  isBuying,
  errorMessage,
  onBuy,
}: BuyMembershipButtonProps) {
  return (
    <View style={styles.container}>
      <AppButton
        accessibilityHint="Abre el pago seguro de Mercado Pago"
        loading={isBuying}
        title={`Comprar por ${price}`}
        onPress={onBuy}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
      <View style={styles.note}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          size={12}
          tintColor={AppColors.neutral.muted}
        />
        <Text style={styles.noteText}>Pago seguro con Mercado Pago</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: AppSpacing.two },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
    textAlign: 'center',
  },
  note: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.one,
    justifyContent: 'center',
  },
  noteText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
