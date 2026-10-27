import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import type { PaymentStatus } from '@/features/payments/models/payment';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface LastPaymentCardProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  showSkeleton: boolean;
  errorMessage: string | null;
  item: {
    amount: string;
    detail: string;
    status: PaymentStatus;
    statusLabel: string;
  } | null;
  onRetry: () => void;
  onLogin: () => void;
}

export function LastPaymentCard({
  isAuthenticated,
  isLoading,
  showSkeleton,
  errorMessage,
  item,
  onRetry,
  onLogin,
}: LastPaymentCardProps) {
  if (isLoading) {
    if (!showSkeleton) return null;

    return (
      <SkeletonGroup label="Cargando último pago" style={styles.card}>
        <View style={styles.row}>
          <SkeletonBlock width={40} height={40} radius={12} />
          <View style={styles.copy}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width="50%" height={10} radius={5} />
          </View>
          <SkeletonBlock width={58} height={22} radius={11} />
        </View>
      </SkeletonGroup>
    );
  }

  return (
    <Pressable
      accessibilityRole={isAuthenticated && !errorMessage ? undefined : 'button'}
      disabled={isAuthenticated && !errorMessage}
      style={styles.card}
      onPress={isAuthenticated ? onRetry : onLogin}
    >
      <View style={styles.row}>
        <View style={styles.icon}>
          <SymbolView
            name={{ ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' }}
            size={20}
            tintColor={AppColors.brand.primary}
          />
        </View>
        <View style={styles.copy}>
          {!isAuthenticated ? (
            <>
              <Text style={styles.title}>Tus pagos</Text>
              <Text style={styles.detail}>Inicia sesión para consultar tu último pago.</Text>
            </>
          ) : errorMessage ? (
            <>
              <Text style={styles.title}>Último pago</Text>
              <Text style={styles.detail}>{errorMessage} Toca para reintentar.</Text>
            </>
          ) : item ? (
            <>
              <Text style={styles.title}>Último pago · {item.amount}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Último pago</Text>
              <Text style={styles.detail}>Aún no tienes pagos registrados.</Text>
            </>
          )}
        </View>
        {isAuthenticated && item && !errorMessage ? (
          <Text style={[styles.status, statusStyles[item.status]]}>{item.statusLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  detail: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  status: {
    overflow: 'hidden',
    borderRadius: 11,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

const statusStyles = StyleSheet.create<Record<PaymentStatus, object>>({
  paid: { backgroundColor: AppColors.feedback.successSoft, color: AppColors.feedback.success },
  pending: { backgroundColor: AppColors.feedback.warningSoft, color: AppColors.feedback.warning },
  cancelled: { backgroundColor: AppColors.surface.muted, color: AppColors.neutral.muted },
  refunded: { backgroundColor: AppColors.surface.muted, color: AppColors.neutral.muted },
  rejected: { backgroundColor: AppColors.surface.softSelected, color: AppColors.feedback.error },
  unknown: { backgroundColor: AppColors.surface.muted, color: AppColors.neutral.muted },
});
