import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { IconTile } from '@/components/ui/icon-tile';
import { ProductThumb } from '@/components/ui/product-thumb';
import { ErrorState } from '@/components/ui/screen-state';
import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import { SubHeader } from '@/components/ui/sub-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { FulfillmentTone } from '@/features/orders/models/fulfillment-status';
import { useOrderDetailViewModel } from '@/features/orders/viewmodels/use-order-detail-view-model';
import { OrderTimeline } from '@/features/orders/views/order-timeline';
import { OrderDetailSkeleton } from '@/features/orders/views/orders-skeletons';
import { getPaymentStatusLabel, type PaymentStatus } from '@/features/payments/models/payment';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

const STATUS_TILE: Record<FulfillmentTone, { background: string; icon: SymbolViewProps['name'] }> = {
  pending: { background: AppColors.surface.darkSelected, icon: { ios: 'clock', android: 'schedule', web: 'schedule' } },
  progress: { background: AppColors.brand.primary, icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' } },
  done: { background: AppColors.feedback.success, icon: { ios: 'checkmark', android: 'check', web: 'check' } },
  error: { background: AppColors.feedback.error, icon: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' } },
};
const TRUCK_ICON: SymbolViewProps['name'] = { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' };
const STORE_ICON: SymbolViewProps['name'] = { ios: 'building.2', android: 'storefront', web: 'storefront' };

const PAYMENT_TONE: Record<PaymentStatus, PillTone> = {
  paid: 'success',
  pending: 'neutral',
  unknown: 'neutral',
  cancelled: 'error',
  refunded: 'neutral',
  rejected: 'error',
};

/** Pantallas 36, 37, 63–66, 70 y 72 · Detalle y seguimiento del pedido. */
export function OrderDetailView({ orderId }: { orderId: string | undefined }) {
  const viewModel = useOrderDetailViewModel(orderId);
  const { detail } = viewModel;

  function confirmCancel() {
    Alert.alert('¿Cancelar pedido?', 'No se hará ningún cargo. Esta acción no se puede deshacer.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => void viewModel.cancel() },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <SubHeader subtitle={detail?.subtitle} title={detail?.title ?? 'PEDIDO'} onBack={viewModel.goBack} />

        {viewModel.showSkeleton ? <OrderDetailSkeleton /> : null}
        {viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : null}

        {detail ? (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <IconTile
                  background={STATUS_TILE[detail.status.tone].background}
                  color={AppColors.neutral.white}
                  icon={detail.status.method === 'delivery' && detail.status.tone === 'progress' ? TRUCK_ICON : STATUS_TILE[detail.status.tone].icon}
                  iconSize={24}
                  size={48}
                />
                <View style={styles.flex}>
                  <Text style={styles.statusOverline}>{detail.status.overline.toUpperCase()}</Text>
                  <Text accessibilityRole="header" style={styles.statusTitle}>
                    {detail.status.title}
                  </Text>
                </View>
              </View>
              <Text style={styles.statusText}>{detail.status.description}</Text>
              {detail.status.tracking ? (
                <View style={styles.tracking}>
                  <Text style={styles.trackingLabel}>{`${detail.status.tracking.carrier} · Número de guía`}</Text>
                  <Text selectable style={styles.trackingNumber}>
                    {detail.status.tracking.number}
                  </Text>
                  <Text style={styles.trackingHint}>Mantén presionado para copiarlo.</Text>
                </View>
              ) : null}
            </View>

            {detail.timeline.length > 0 ? (
              <Section title="Seguimiento">
                <OrderTimeline steps={detail.timeline} />
              </Section>
            ) : null}

            {detail.delivery ? (
              <Section title={detail.delivery.kind === 'pickup' ? 'Dónde recoger' : 'Dirección de entrega'}>
                <View style={styles.row}>
                  <IconTile icon={detail.delivery.kind === 'pickup' ? STORE_ICON : TRUCK_ICON} size={40} iconSize={20} />
                  <View style={styles.flex}>
                    <Text style={styles.strong}>{detail.delivery.title}</Text>
                    {detail.delivery.lines.map((line) => (
                      <Text key={line} style={styles.muted}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              </Section>
            ) : null}

            <Section title="Productos">
              {detail.items.map((item) => (
                <View key={item.key} style={styles.row}>
                  <ProductThumb imageUrl={item.imageUrl} size={52} />
                  <View style={styles.flex}>
                    <Text numberOfLines={2} style={styles.strong}>
                      {item.name}
                    </Text>
                    <Text style={styles.muted}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.price}>{item.total}</Text>
                </View>
              ))}
            </Section>

            <Section title="Resumen de pago">
              {detail.payment ? (
                <View style={styles.paymentRow}>
                  <SymbolView
                    name={{ ios: 'creditcard', android: 'credit_card', web: 'credit_card' }}
                    size={18}
                    tintColor={AppColors.neutral.text}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.strong}>Mercado Pago</Text>
                    <Text style={styles.muted}>{detail.payment.date}</Text>
                  </View>
                  <StatusPill
                    label={getPaymentStatusLabel(detail.payment.status)}
                    tone={PAYMENT_TONE[detail.payment.status]}
                  />
                </View>
              ) : null}
              {detail.totals.map((row) => (
                <View key={row.label} style={styles.totalRow}>
                  <Text style={styles.muted}>{row.label}</Text>
                  <Text style={styles.totalValue}>{row.value}</Text>
                </View>
              ))}
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{detail.total}</Text>
              </View>
            </Section>

            {viewModel.actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {viewModel.actionError}
              </Text>
            ) : null}
            {detail.canCancel ? (
              <AppButton
                loading={viewModel.isCancelling}
                title="Cancelar pedido"
                variant="outline"
                onPress={confirmCancel}
              />
            ) : null}
            {viewModel.canContactGym ? (
              <AppButton title="Contactar al gimnasio" variant="outline" onPress={viewModel.contactGym} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SurfaceCard style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  flex: { minWidth: 0, flex: 1, gap: 2 },
  statusCard: {
    gap: 12,
    borderRadius: 24,
    backgroundColor: AppColors.surface.dark,
    padding: 20,
  },
  statusHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  statusOverline: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  statusTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 42,
    letterSpacing: 0.5,
  },
  statusText: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  tracking: {
    gap: 2,
    borderRadius: 16,
    backgroundColor: AppColors.surface.darkElevated,
    padding: 14,
  },
  trackingLabel: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  trackingNumber: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  trackingHint: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: 11,
    lineHeight: 14,
  },
  section: { gap: 14, padding: 16 },
  sectionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  strong: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  muted: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  price: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    backgroundColor: AppColors.surface.input,
    padding: 12,
  },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  totalValue: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  grandTotal: { borderTopWidth: 1, borderTopColor: AppColors.border.soft, paddingTop: 12 },
  grandLabel: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  grandValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
