import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppButton } from '@/components/ui/app-button';
import { useMyProductOrders } from '@/features/cart/viewmodels/use-my-product-orders';
import { formatProductPrice } from '@/features/store/models/product';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const PAYMENT_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolso parcial',
  disputed: 'En disputa',
  charged_back: 'Contracargo',
};
const DELIVERY_LABELS: Record<string, string> = {
  awaiting_payment: 'Esperando pago',
  payment_confirmed: 'Pago confirmado',
  preparing: 'En preparación',
  ready_for_pickup: 'Listo para recoger',
  picked_up: 'Recogido',
  packed: 'Empaquetado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  delivery_failed: 'Entrega no realizada',
  incident: 'Incidencia',
  cancelled: 'Cancelado',
};

export function MyProductOrdersView() {
  const vm = useMyProductOrders();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={AppColors.brand.primary} />}>
        <View style={styles.header}>
          <IconButton icon={BACK_ICON} label="Regresar" onPress={vm.goBack} />
          <Text accessibilityRole="header" style={styles.title}>MIS PEDIDOS</Text>
        </View>
        <Text style={styles.description}>Compras de productos, recogidas y envíos.</Text>
        {vm.loading ? <Text style={styles.description}>Consultando tus pedidos…</Text> : null}
        {vm.errorMessage ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>{vm.errorMessage}</Text>
            <AppButton title="Reintentar" onPress={vm.refresh} />
          </View>
        ) : !vm.loading && vm.orders.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AÚN NO TIENES PEDIDOS</Text>
            <Text style={styles.description}>Cuando compres un producto, aquí aparecerá su pago y seguimiento.</Text>
            <AppButton title="Explorar tienda" onPress={vm.openStore} />
          </View>
        ) : (
          vm.orders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.number}>{order.orderNumber}</Text>
                <Text style={styles.amount}>{formatProductPrice(Number(order.total))}</Text>
              </View>
              <Text style={styles.description}>{new Date(order.createdAt).toLocaleDateString('es-MX')}</Text>
              <View style={styles.statusLine}>
                <Text style={styles.label}>Pago</Text>
                <Text style={styles.status}>{PAYMENT_LABELS[order.status] ?? order.status}</Text>
              </View>
              {order.fulfillment ? (
                <View style={styles.statusLine}>
                  <Text style={styles.label}>{order.fulfillment.method === 'pickup' ? 'Recogida' : 'Envío'}</Text>
                  <Text style={styles.status}>{DELIVERY_LABELS[order.fulfillment.status] ?? order.fulfillment.status}</Text>
                </View>
              ) : null}
              {order.items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.description}>{item.quantity} × {item.itemNameSnapshot}</Text>
                  <Text style={styles.description}>{formatProductPrice(Number(item.subtotal))}</Text>
                </View>
              ))}
              {order.fulfillment?.trackingNumber ? (
                <Text style={styles.description}>Guía: {order.fulfillment.trackingNumber} · {order.fulfillment.carrier ?? 'Paquetería'}</Text>
              ) : null}
              {order.fulfillment?.method === 'pickup' && order.fulfillment.pickupLocationSnapshot ? (
                <Text style={styles.description}>Recoger en: {order.fulfillment.pickupLocationSnapshot.name}, {order.fulfillment.pickupLocationSnapshot.address}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1, gap: AppSpacing.three, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 112 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero },
  description: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 20, flexShrink: 1 },
  card: { borderRadius: 22, borderWidth: 1, borderColor: AppColors.border.soft, padding: 18, gap: 12 },
  cardTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: 25 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  number: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: AppFontSizes.label },
  amount: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.body },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: AppColors.border.soft },
  label: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label },
  status: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
});
