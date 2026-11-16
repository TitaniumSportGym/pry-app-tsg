import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { useProductPaymentResult } from '@/features/cart/viewmodels/use-product-payment-result';
import { formatProductPrice } from '@/features/store/models/product';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function ProductPaymentResultView({ orderId }: { orderId: string | undefined }) {
  const vm = useProductPaymentResult(orderId);
  const approved = vm.kind === 'approved';
  const rejected = vm.kind === 'rejected';
  const verifying = vm.kind === 'verifying';

  const title = approved
    ? '¡COMPRA CONFIRMADA!'
    : rejected
      ? 'PAGO NO APROBADO'
      : vm.kind === 'invalid'
        ? 'PEDIDO NO ENCONTRADO'
        : vm.kind === 'error'
          ? 'NO PUDIMOS VERIFICAR'
          : vm.kind === 'pending'
            ? 'PAGO EN PROCESO'
            : 'CONFIRMANDO TU PAGO';

  const message = approved
    ? 'Mercado Pago confirmó tu pago. El gimnasio preparará tu pedido según el método de entrega seleccionado.'
    : rejected
      ? 'El pago no fue aprobado. Puedes volver a intentar tu compra.'
      : vm.kind === 'invalid'
        ? 'El identificador del pedido es inválido. Consulta tus pagos desde la cuenta.'
        : vm.kind === 'error'
          ? 'No pudimos consultar el estado de tu pedido. Vuelve a intentarlo.'
          : vm.kind === 'pending'
            ? 'El pago todavía no se confirma. Si pagaste en efectivo puede tardar más. Consulta de nuevo después.'
            : 'Consultamos el pago directamente con el backend. No se considera aprobado hasta recibir su confirmación.';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.icon, approved ? styles.approved : rejected ? styles.rejected : styles.waiting]}>
          <SymbolView
            name={approved
              ? { ios: 'checkmark', android: 'check', web: 'check' }
              : rejected
                ? { ios: 'xmark', android: 'close', web: 'close' }
                : { ios: 'clock', android: 'schedule', web: 'schedule' }}
            size={36}
            tintColor={AppColors.neutral.white}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {(vm.orderNumber || vm.total !== null) && (
          <View style={styles.order}>
            <Text style={styles.label}>PEDIDO</Text>
            {vm.orderNumber && <Text style={styles.orderNumber}>{vm.orderNumber}</Text>}
            {vm.total !== null && <Text style={styles.amount}>{formatProductPrice(vm.total)}</Text>}
          </View>
        )}

        {verifying && <Text accessibilityLiveRegion="polite" style={styles.note}>Verificando con el servidor…</Text>}
        {approved && <Text style={styles.note}>Conserva el número de pedido para cualquier consulta de recogida o envío.</Text>}
        {(vm.kind === 'pending' || vm.kind === 'error') && <AppButton title="Consultar de nuevo" onPress={vm.retry} />}
        <AppButton title={approved ? 'Seguir comprando' : 'Volver a la tienda'} variant={approved ? 'primary' : 'outline'} onPress={vm.openStore} />
        <AppButton title="Ver mis pagos" variant="outline" onPress={vm.openPayments} />
        <Text style={styles.footer}>El resultado se comprueba en el backend; no se confía en los parámetros de retorno del navegador.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', alignItems: 'center', gap: AppSpacing.three, paddingHorizontal: 24, paddingTop: 74, paddingBottom: 112 },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  approved: { backgroundColor: AppColors.feedback.success },
  rejected: { backgroundColor: AppColors.feedback.error },
  waiting: { backgroundColor: AppColors.brand.primary },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, lineHeight: 46, textAlign: 'center' },
  message: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 23, textAlign: 'center' },
  order: { alignSelf: 'stretch', borderRadius: 20, borderWidth: 1, borderColor: AppColors.border.soft, padding: 18, alignItems: 'center', gap: 8 },
  label: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption },
  orderNumber: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: AppFontSizes.body },
  amount: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 26 },
  note: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20, textAlign: 'center' },
  footer: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 18, textAlign: 'center' },
});
