import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppButton } from '@/components/ui/app-button';
import type { DeliveryAddress } from '@/features/cart/api/product-checkout-api';
import { useProductCheckout } from '@/features/cart/viewmodels/use-product-checkout';
import { formatProductPrice } from '@/features/store/models/product';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

function Currency({ amount }: { amount: string }) {
  return <Text style={styles.money}>{formatProductPrice(Number(amount))}</Text>;
}

function Field({
  label, value, onChange, keyboardType, maxLength,
}: {
  label: string; value: string; onChange: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad'; maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength ?? 160}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={AppColors.neutral.placeholder}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const ADDRESS_FIELDS: { field: keyof DeliveryAddress; label: string; max?: number }[] = [
  { field: 'recipientName', label: 'Nombre de quien recibe', max: 120 },
  { field: 'phone', label: 'Teléfono de contacto', max: 25 },
  { field: 'postalCode', label: 'Código postal (5 dígitos)', max: 5 },
  { field: 'state', label: 'Estado', max: 100 },
  { field: 'municipality', label: 'Municipio', max: 100 },
  { field: 'neighborhood', label: 'Colonia', max: 120 },
  { field: 'street', label: 'Calle', max: 160 },
  { field: 'exteriorNumber', label: 'Número exterior', max: 30 },
  { field: 'interiorNumber', label: 'Número interior (opcional)', max: 30 },
  { field: 'references', label: 'Referencias para la entrega', max: 500 },
];

/** Checkout de productos · reutiliza la paleta, fuentes y componentes Titanium. */
export function ProductCheckoutView() {
  const vm = useProductCheckout();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.back}>
          <IconButton icon={BACK_ICON} label="Regresar al carrito" onPress={vm.goBack} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>FINALIZAR COMPRA</Text>
        <Text style={styles.description}>Confirma la entrega y el importe antes de abrir Mercado Pago.</Text>

        {vm.isEmpty ? (
          <View style={styles.card}>
            <Text style={styles.text}>Tu carrito está vacío.</Text>
            <AppButton title="Volver al carrito" onPress={vm.goBack} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>RESUMEN DEL CARRITO</Text>
              {vm.items.map((item) => (
                <View key={item.productId} style={styles.item}>
                  <View style={styles.grow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.caption}>Cantidad: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName}>{formatProductPrice(item.price * item.quantity)}</Text>
                </View>
              ))}
              <Text style={styles.estimate}>Subtotal estimado: {vm.estimatedTotal}</Text>
              <Text style={styles.caption}>El servidor recalcula precios, descuentos, inventario y envío.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>¿CÓMO QUIERES RECIBIRLO?</Text>
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: vm.method === 'pickup' }}
                  onPress={() => vm.setMethod('pickup')}
                  style={[styles.choice, vm.method === 'pickup' && styles.choiceSelected]}>
                  <Text style={styles.choiceText}>Recoger en gimnasio</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: vm.method === 'delivery' }}
                  onPress={() => vm.setMethod('delivery')}
                  style={[styles.choice, vm.method === 'delivery' && styles.choiceSelected]}>
                  <Text style={styles.choiceText}>Envío a domicilio</Text>
                </Pressable>
              </View>

              {vm.method === 'pickup' ? (
                <>
                  <Text style={styles.label}>Recogida sin costo de envío</Text>
                  {vm.pickupLocation ? (
                    <View style={styles.pickup}>
                      <Text style={styles.itemName}>{vm.pickupLocation.name}</Text>
                      <Text style={styles.text}>{vm.pickupLocation.address}</Text>
                      <Text style={styles.caption}>{vm.pickupLocation.hours ?? ''}</Text>
                    </View>
                  ) : (
                    <Text style={styles.caption}>
                      {vm.optionsLoading ? 'Consultando ubicación del gimnasio…' : 'La ubicación se comprobará al cotizar.'}
                    </Text>
                  )}
                  <Field label="Nombre de quien recoge" value={vm.recipientName} onChange={vm.setRecipientName} maxLength={120} />
                  <Field label="Teléfono (10 a 15 dígitos)" value={vm.phone} onChange={vm.setPhone} keyboardType="phone-pad" maxLength={25} />
                </>
              ) : (
                <>
                  {vm.addresses.length > 0 ? (
                    <>
                      <Text style={styles.label}>Dirección guardada</Text>
                      {vm.addresses.map((saved) => (
                        <Pressable
                          key={saved.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: vm.selectedAddressId === saved.id }}
                          onPress={() => vm.setSelectedAddressId(saved.id)}
                          style={[styles.savedAddress, vm.selectedAddressId === saved.id && styles.choiceSelected]}>
                          <Text style={styles.itemName}>{saved.recipientName}</Text>
                          <Text style={styles.caption}>{saved.street} {saved.exteriorNumber}, {saved.neighborhood}, CP {saved.postalCode}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: vm.selectedAddressId === '' }}
                        onPress={() => vm.setSelectedAddressId('')}
                        style={[styles.savedAddress, vm.selectedAddressId === '' && styles.choiceSelected]}>
                        <Text style={styles.itemName}>Usar una dirección nueva</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={styles.caption}>Escribe la dirección de entrega. La cobertura y el costo se validan al cotizar.</Text>
                  )}

                  {!vm.selectedAddressId && ADDRESS_FIELDS.map(({ field, label, max }) => (
                    <Field
                      key={field}
                      label={label}
                      maxLength={max}
                      keyboardType={field === 'phone' ? 'phone-pad' : field === 'postalCode' ? 'number-pad' : 'default'}
                      value={vm.address[field] ?? ''}
                      onChange={(value) => vm.editAddress(field, value)}
                    />
                  ))}
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>COTIZACIÓN SEGURA</Text>
              <AppButton
                disabled={vm.quoting || vm.paying}
                loading={vm.quoting}
                title={vm.quote ? 'Actualizar cotización' : 'Calcular total'}
                variant="outline"
                onPress={() => void vm.requestQuote()}
              />
              {vm.quote && vm.validQuote ? (
                <View style={styles.quote}>
                  <View style={styles.item}><Text style={styles.text}>Productos</Text><Currency amount={vm.quote.subtotal} /></View>
                  <View style={styles.item}><Text style={styles.text}>Descuentos</Text><Currency amount={vm.quote.discountTotal} /></View>
                  <View style={styles.item}><Text style={styles.text}>Envío</Text><Currency amount={vm.quote.shippingTotal} /></View>
                  <View style={styles.item}><Text style={styles.total}>TOTAL A PAGAR</Text><Text style={styles.total}><Currency amount={vm.quote.total} /></Text></View>
                  <Text style={styles.caption}>Importe validado por el backend. Cotización vigente por tiempo limitado.</Text>
                </View>
              ) : vm.quote ? (
                <Text style={styles.warning}>La cotización venció o cambió el carrito. Solicita otra antes de pagar.</Text>
              ) : null}
              {vm.errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{vm.errorMessage}</Text> : null}
              <AppButton
                disabled={!vm.validQuote || vm.paying || vm.quoting}
                loading={vm.paying}
                title="Confirmar total y pagar"
                onPress={() => void vm.pay()}
              />
              <Text style={styles.caption}>El cobro se realiza en Mercado Pago. No ingreses datos bancarios en la app.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: AppSpacing.three },
  back: { alignSelf: 'flex-start', marginLeft: -8 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, lineHeight: 44 },
  description: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 22 },
  card: { padding: 18, gap: 12, borderRadius: 22, backgroundColor: AppColors.surface.default, borderWidth: 1, borderColor: AppColors.border.soft },
  cardTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: 23 },
  row: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemName: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  text: { color: AppColors.neutral.text, fontFamily: AppFonts.body, fontSize: AppFontSizes.label },
  caption: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 18 },
  estimate: { color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.body },
  choice: { flex: 1, minHeight: 58, borderWidth: 1, borderColor: AppColors.border.default, backgroundColor: AppColors.surface.default, borderRadius: 14, padding: 10, justifyContent: 'center' },
  choiceSelected: { borderColor: AppColors.brand.primary, backgroundColor: AppColors.surface.soft },
  choiceText: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, textAlign: 'center' },
  field: { gap: 6 },
  label: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  input: { backgroundColor: AppColors.surface.input, borderRadius: 14, paddingHorizontal: 14, minHeight: 48, color: AppColors.neutral.black, fontFamily: AppFonts.body, fontSize: AppFontSizes.label },
  pickup: { backgroundColor: AppColors.surface.muted, padding: 12, borderRadius: 14, gap: 4 },
  savedAddress: { minHeight: 58, borderWidth: 1, borderColor: AppColors.border.default, borderRadius: 14, padding: 12, gap: 4 },
  quote: { gap: 10, paddingVertical: 8 },
  total: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.body },
  money: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  warning: { color: AppColors.feedback.warning, fontFamily: AppFonts.body, fontSize: AppFontSizes.label },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
});
