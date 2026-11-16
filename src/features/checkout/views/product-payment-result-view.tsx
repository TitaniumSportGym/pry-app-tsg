import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { PaymentSpinner, PaymentStep, ResultBadge, TextLink } from '@/components/ui/payment-progress';
import { ProductThumb } from '@/components/ui/product-thumb';
import { useProductPaymentResultViewModel } from '@/features/checkout/viewmodels/use-product-payment-result-view-model';
import { AppColors, AppFonts, AppFontSizes, AppShadows, AppSpacing } from '@/theme/tokens';

const WAITING_COPY = {
  verifying: {
    title: 'CONFIRMANDO TU PAGO',
    text: 'Estamos verificando con Mercado Pago. No cierres la app; puede tardar unos segundos.',
  },
  error: {
    title: 'NO PUDIMOS VERIFICAR',
    text: 'No logramos consultar el estado de tu pago. Revisa tu conexión e inténtalo de nuevo.',
  },
} as const;

/** Pantallas 33, 34, 57, 58 y 59 · Resultado del pago de productos. */
export function ProductPaymentResultView({ orderId }: { orderId: string | undefined }) {
  const viewModel = useProductPaymentResultViewModel(orderId);
  const { status } = viewModel;

  if (status === 'verifying' || status === 'error') {
    const copy = WAITING_COPY[status];
    return (
      <Screen>
        <PaymentSpinner active={status === 'verifying'} />
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {copy.text}
        </Text>
        <View style={styles.steps}>
          <PaymentStep label="Pago enviado a Mercado Pago" state="done" />
          <PaymentStep label="Confirmación del pago" state="current" />
          <PaymentStep label="Pedido en preparación" state="pending" />
        </View>
        <OrderCard viewModel={viewModel} />
        <View style={styles.spacer} />
        {status === 'error' ? <AppButton title="Reintentar" onPress={viewModel.checkAgain} /> : null}
        <AppButton title="Ver mis pedidos" variant="outline" onPress={viewModel.openOrders} />
        <Text style={styles.footnote}>Solo damos un pago por aprobado cuando lo confirma el sistema.</Text>
      </Screen>
    );
  }

  if (status === 'approved') {
    const pickup = viewModel.method === 'pickup';
    return (
      <Screen>
        <ResultBadge tone="success" />
        <Text accessibilityRole="header" style={styles.title}>
          ¡PAGO CONFIRMADO!
        </Text>
        <Text style={styles.text}>
          {`Tu pedido${viewModel.orderLabel ? ` #${viewModel.orderLabel}` : ''} ya está en preparación. ${
            pickup ? 'Te avisaremos cuando esté listo para recoger en recepción.' : 'Te avisaremos cuando salga a envío.'
          }`}
        </Text>
        <OrderCard viewModel={viewModel} totalLabel="Total pagado" />
        <View style={styles.spacer} />
        <AppButton title="Ver seguimiento" onPress={viewModel.openOrder} />
        <TextLink label="Seguir comprando" onPress={viewModel.keepShopping} />
      </Screen>
    );
  }

  if (status === 'still-pending') {
    return (
      <Screen>
        <ResultBadge tone="pending" />
        <Text accessibilityRole="header" style={styles.title}>
          PAGO EN PROCESO
        </Text>
        <Text style={styles.text}>
          Mercado Pago aún no confirma tu pago. Si pagaste en efectivo, puede tardar hasta 48 h. Te
          avisaremos cuando se acredite.
        </Text>
        <OrderCard viewModel={viewModel} totalLabel="Total del pedido" />
        <View style={styles.spacer} />
        <AppButton title="Ver mis pedidos" onPress={viewModel.openOrders} />
        <TextLink label="Consultar de nuevo" onPress={viewModel.checkAgain} />
      </Screen>
    );
  }

  const rejected = status === 'rejected';
  return (
    <Screen>
      <ResultBadge tone="error" />
      <Text accessibilityRole="header" style={styles.title}>
        {rejected ? 'PAGO RECHAZADO' : 'PAGO NO ENCONTRADO'}
      </Text>
      <Text accessibilityRole="alert" style={styles.text}>
        {rejected
          ? 'Mercado Pago no aprobó el pago y no se hizo ningún cargo. Tu carrito sigue guardado: revisa tus datos o intenta con otro método de pago.'
          : 'No encontramos la compra que intentas consultar. Revisa tus pedidos.'}
      </Text>
      {rejected ? <OrderCard viewModel={viewModel} totalLabel="Total por pagar" /> : null}
      <View style={styles.spacer} />
      {rejected ? <AppButton title="Reintentar pago" onPress={viewModel.retryPayment} /> : null}
      <TextLink label="Ver mis pedidos" onPress={viewModel.openOrders} />
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type ResultViewModel = ReturnType<typeof useProductPaymentResultViewModel>;

function OrderCard({ viewModel, totalLabel = 'Total' }: { viewModel: ResultViewModel; totalLabel?: string }) {
  if (!viewModel.orderLabel && !viewModel.total) return null;
  const { summary } = viewModel;

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.cardLabel}>Pedido</Text>
        <Text style={styles.orderNumber}>{viewModel.orderLabel ? `#${viewModel.orderLabel}` : '—'}</Text>
      </View>
      {summary ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.thumbs}>
              {summary.thumbs.map((thumb) => (
                <ProductThumb key={thumb.key} imageUrl={thumb.imageUrl} size={40} />
              ))}
            </View>
            <View style={styles.copy}>
              <Text style={styles.strong}>{summary.itemsLabel}</Text>
              <Text numberOfLines={1} style={styles.muted}>
                {summary.names}
              </Text>
            </View>
          </View>
          <View style={styles.delivery}>
            <Text style={styles.strong}>{summary.delivery}</Text>
            {summary.deliveryDetail ? (
              <Text numberOfLines={2} style={styles.muted}>
                {summary.deliveryDetail}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
      {viewModel.total ? (
        <View style={styles.totalRow}>
          <Text style={styles.muted}>{totalLabel}</Text>
          <Text style={styles.total}>{viewModel.total}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 112,
  },
  spacer: { flexGrow: 1, minHeight: AppSpacing.three },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
    textAlign: 'center',
  },
  text: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  steps: {
    width: '100%',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  card: {
    width: '100%',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
  cardLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  orderNumber: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 18, lineHeight: 24 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  thumbs: { flexDirection: 'row', gap: 6 },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  strong: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  muted: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  delivery: { gap: 2, borderRadius: 14, backgroundColor: AppColors.surface.input, padding: 12 },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  total: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 20, lineHeight: 26 },
  footnote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
