import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { IconTile } from '@/components/ui/icon-tile';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { ProductThumb } from '@/components/ui/product-thumb';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { SubHeader } from '@/components/ui/sub-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  useProductCheckoutViewModel,
  type DeliveryChoice,
} from '@/features/checkout/viewmodels/use-product-checkout-view-model';
import { CheckoutSkeleton } from '@/features/checkout/views/checkout-skeleton';
import { AddressCard, PIN_ICON } from '@/features/delivery/views/address-card';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

const STORE_ICON: SymbolViewProps['name'] = { ios: 'building.2', android: 'storefront', web: 'storefront' };
const TRUCK_ICON: SymbolViewProps['name'] = { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' };
const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' };

/** Pantallas 29, 30, 53–56 y 73 · Finalizar compra. */
export function CheckoutView() {
  const viewModel = useProductCheckoutViewModel();
  const { quote } = viewModel;

  if (viewModel.isCartEmpty) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <SubHeader title="FINALIZAR COMPRA" onBack={viewModel.goBack} />
          <IllustratedEmptyState
            actionLabel="Ir a la tienda"
            description="Agrega productos a tu carrito para finalizar la compra."
            icon={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }}
            title="TU CARRITO ESTÁ VACÍO"
            onAction={viewModel.openStore}
          />
        </View>
      </SafeAreaView>
    );
  }

  const ready = !viewModel.isLoading && !viewModel.optionsError;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SubHeader subtitle="Elige cómo recibir tus productos" title="FINALIZAR COMPRA" onBack={viewModel.goBack} />
          <Steps />

          {viewModel.showSkeleton ? <CheckoutSkeleton /> : null}
          {viewModel.optionsError ? (
            <ErrorState message={viewModel.optionsError} onRetry={viewModel.retryOptions} />
          ) : null}

          {ready ? (
            <>
              <View accessibilityRole="radiogroup" style={styles.methods}>
                <MethodOption
                  caption={viewModel.pickupAvailable ? 'Gratis' : 'No disponible'}
                  disabled={!viewModel.pickupAvailable}
                  icon={STORE_ICON}
                  label="Recoger en gimnasio"
                  selected={viewModel.method === 'pickup'}
                  value="pickup"
                  onSelect={viewModel.selectMethod}
                />
                <MethodOption
                  caption="Se cotiza"
                  icon={TRUCK_ICON}
                  label="Envío a domicilio"
                  selected={viewModel.method === 'delivery'}
                  value="delivery"
                  onSelect={viewModel.selectMethod}
                />
              </View>

              {viewModel.method === 'pickup' && viewModel.pickup ? (
                <>
                  <SectionTitle>Punto de recogida</SectionTitle>
                  <SurfaceCard style={styles.pickupCard}>
                    <View style={styles.row}>
                      <IconTile icon={STORE_ICON} />
                      <View style={styles.copy}>
                        <Text style={styles.strong}>{viewModel.pickup.name}</Text>
                        <Text style={styles.muted}>
                          {[viewModel.pickup.address, viewModel.pickup.city].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    {viewModel.pickup.schedule.map((entry) => (
                      <Text key={entry.label} style={styles.muted}>
                        {entry.hours ? `${entry.label}: ${entry.hours}` : entry.label}
                      </Text>
                    ))}
                    {viewModel.pickup.phone ? <Text style={styles.muted}>{`Tel. ${viewModel.pickup.phone}`}</Text> : null}
                    <View style={styles.notice}>
                      <SymbolView
                        name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                        size={14}
                        tintColor={AppColors.brand.primary}
                      />
                      <Text style={styles.noticeText}>
                        {viewModel.pickup.instructions ??
                          'Presenta tu número de pedido en recepción. Te avisaremos cuando esté listo.'}
                      </Text>
                    </View>
                  </SurfaceCard>

                  <SectionTitle>¿Quién recoge?</SectionTitle>
                  <FormField
                    autoCapitalize="words"
                    autoComplete="name"
                    error={viewModel.recipientErrors.name}
                    label="Nombre completo"
                    placeholder="Nombre y apellido"
                    value={viewModel.recipient.name}
                    onBlur={() => viewModel.touchRecipient('name')}
                    onChangeText={viewModel.setRecipientName}
                  />
                  <FormField
                    autoComplete="tel"
                    error={viewModel.recipientErrors.phone}
                    keyboardType="phone-pad"
                    label="Teléfono"
                    placeholder="7711234567"
                    value={viewModel.recipient.phone}
                    onBlur={() => viewModel.touchRecipient('phone')}
                    onChangeText={viewModel.setRecipientPhone}
                  />
                </>
              ) : null}

              {viewModel.method === 'delivery' ? (
                <>
                  <SectionTitle>Dirección de entrega</SectionTitle>
                  {viewModel.addressesError ? (
                    <ErrorState message={viewModel.addressesError} onRetry={viewModel.retryAddresses} />
                  ) : (
                    <View accessibilityRole="radiogroup" style={styles.list}>
                      {viewModel.addresses.map((item) => (
                        <AddressCard
                          key={item.id}
                          item={item}
                          selected={item.id === viewModel.selectedAddressId}
                          onSelect={viewModel.selectAddress}
                        />
                      ))}
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.addAddress, pressed && styles.pressed]}
                    onPress={viewModel.addAddress}>
                    <SymbolView
                      name={{ ios: 'plus', android: 'add', web: 'add' }}
                      size={16}
                      tintColor={AppColors.brand.primary}
                    />
                    <Text style={styles.addAddressText}>AGREGAR DIRECCIÓN</Text>
                  </Pressable>

                  <SectionTitle>Costo de envío</SectionTitle>
                  <ShippingCard
                    amount={quote.shippingAmount}
                    label={quote.shippingLabel}
                    message={quote.message}
                    status={quote.status}
                    onRetry={viewModel.refreshQuote}
                  />
                  <QuoteValidity countdown={quote.countdown} status={quote.status} />
                </>
              ) : null}

              <SectionTitle>Resumen</SectionTitle>
              <SurfaceCard style={styles.summary}>
                <View style={styles.row}>
                  <View style={styles.thumbs}>
                    {viewModel.summary.thumbs.map((thumb) => (
                      <ProductThumb key={thumb.key} imageUrl={thumb.imageUrl} />
                    ))}
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.strong}>{viewModel.summary.countLabel}</Text>
                    <Text numberOfLines={1} style={styles.muted}>
                      {viewModel.summary.names}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                {quote.status === 'idle' ? (
                  <Text style={styles.muted}>
                    {viewModel.method === 'pickup'
                      ? 'Escribe quién recoge para calcular el total.'
                      : 'Elige o agrega una dirección para calcular el total.'}
                  </Text>
                ) : quote.status === 'loading' ? (
                  <SkeletonGroup label="Calculando el total" style={styles.rows}>
                    {[0, 1, 2].map((key) => (
                      <View key={key} style={styles.totalRow}>
                        <SkeletonBlock height={12} width={90} />
                        <SkeletonBlock height={12} width={60} />
                      </View>
                    ))}
                  </SkeletonGroup>
                ) : quote.status === 'error' && viewModel.method === 'pickup' ? (
                  <QuoteError message={quote.message} onRetry={viewModel.refreshQuote} />
                ) : (
                  <View style={styles.rows}>
                    {quote.rows.map((row) => (
                      <View key={row.label} style={styles.totalRow}>
                        <Text style={styles.muted}>{row.label}</Text>
                        <Text style={styles.rowValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {quote.total ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                      <Text style={styles.grandLabel}>Total</Text>
                      <Text style={styles.grandValue}>{quote.total}</Text>
                    </View>
                  </>
                ) : null}
              </SurfaceCard>
            </>
          ) : null}
        </ScrollView>

        {ready ? (
          <ActionBar>
            <View style={styles.payHeader}>
              <View>
                <Text style={styles.muted}>Total a pagar</Text>
                {quote.total ? (
                  <Text style={styles.payTotal}>{quote.total}</Text>
                ) : (
                  <SkeletonBlock height={24} style={styles.payTotalSkeleton} width={96} />
                )}
              </View>
              <View style={styles.securePill}>
                <SymbolView
                  name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                  size={12}
                  tintColor={AppColors.neutral.muted}
                />
                <Text style={styles.secureText}>Pago seguro con Mercado Pago</Text>
              </View>
            </View>
            {viewModel.payError ? (
              <Text accessibilityRole="alert" style={styles.payError}>
                {viewModel.payError}
              </Text>
            ) : null}
            <AppButton
              disabled={!viewModel.canPay && quote.status !== 'expired'}
              loading={viewModel.isPaying}
              title={viewModel.primaryLabel}
              onPress={() => void viewModel.primaryAction()}
            />
            <Text style={styles.caption}>
              {quote.status === 'expired'
                ? 'El costo puede cambiar si la tarifa se actualizó.'
                : 'Te llevaremos a Mercado Pago para completar el pago.'}
            </Text>
          </ActionBar>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Steps() {
  return (
    <View accessibilityLabel="Paso 1 de 3: Entrega" accessible style={styles.steps}>
      {['Entrega', 'Pago', 'Listo'].map((label, index) => (
        <View key={label} style={styles.stepGroup}>
          {index > 0 ? <View style={styles.stepLine} /> : null}
          <View style={[styles.stepNumber, index === 0 && styles.stepNumberActive]}>
            <Text style={[styles.stepNumberText, index === 0 && styles.stepNumberTextActive]}>{index + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, index === 0 && styles.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

interface MethodOptionProps {
  value: DeliveryChoice;
  label: string;
  caption: string;
  icon: SymbolViewProps['name'];
  selected: boolean;
  disabled?: boolean;
  onSelect: (value: DeliveryChoice) => void;
}

function MethodOption({ value, label, caption, icon, selected, disabled = false, onSelect }: MethodOptionProps) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${caption}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.method,
        selected && styles.methodSelected,
        disabled && styles.methodDisabled,
        pressed && styles.pressed,
      ]}
      onPress={() => onSelect(value)}>
      <View style={styles.methodTop}>
        <IconTile
          background={selected ? AppColors.brand.primary : AppColors.surface.input}
          color={selected ? AppColors.neutral.white : AppColors.neutral.muted}
          icon={icon}
        />
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <SymbolView name={CHECK_ICON} size={13} tintColor={AppColors.neutral.white} /> : null}
        </View>
      </View>
      <Text style={styles.methodLabel}>{label}</Text>
      <Text style={[styles.methodCaption, selected && styles.methodCaptionSelected]}>{caption}</Text>
    </Pressable>
  );
}

interface ShippingCardProps {
  status: 'idle' | 'loading' | 'ready' | 'expired' | 'error';
  label: string;
  amount: string | null;
  message: string | null;
  onRetry: () => void;
}

function ShippingCard({ status, label, amount, message, onRetry }: ShippingCardProps) {
  const isError = status === 'error';
  return (
    <View style={styles.shipping}>
      <IconTile
        background={isError ? AppColors.feedback.error : AppColors.brand.primary}
        color={AppColors.neutral.white}
        icon={isError ? PIN_ICON : TRUCK_ICON}
        iconSize={22}
        size={44}
      />
      <View style={styles.copy}>
        <Text style={styles.shippingLabel}>
          {status === 'loading' ? 'Calculando envío…' : isError ? 'No pudimos cotizar el envío' : label}
        </Text>
        {isError ? (
          <Text style={styles.shippingCaption}>{message}</Text>
        ) : status === 'idle' ? (
          <Text style={styles.shippingCaption}>Elige una dirección para calcularlo.</Text>
        ) : null}
        {isError ? (
          <Pressable accessibilityRole="button" hitSlop={6} onPress={onRetry}>
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        ) : null}
      </View>
      {status === 'loading' ? (
        <SkeletonGroup label="Calculando envío">
          <SkeletonBlock height={22} tone="dark" width={72} />
        </SkeletonGroup>
      ) : amount && !isError ? (
        <Text style={styles.shippingAmount}>{amount}</Text>
      ) : null}
    </View>
  );
}

function QuoteValidity({ status, countdown }: { status: string; countdown: string | null }) {
  if (status !== 'ready' && status !== 'expired') return null;
  const expired = status === 'expired';
  return (
    <View style={[styles.validity, expired && styles.validityExpired]}>
      <SymbolView
        name={{ ios: 'timer', android: 'timer', web: 'timer' }}
        size={14}
        tintColor={expired ? AppColors.feedback.error : AppColors.brand.primary}
      />
      <Text accessibilityLiveRegion="polite" style={[styles.validityText, expired && styles.validityTextExpired]}>
        {expired
          ? 'La cotización venció. Actualiza el costo de envío para continuar con el pago.'
          : countdown
            ? `Cotización válida por ${countdown} min. Si cambias la dirección o el carrito, se vuelve a calcular.`
            : 'Si cambias la dirección o el carrito, se vuelve a calcular.'}
      </Text>
    </View>
  );
}

function QuoteError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <View style={styles.quoteError}>
      <Text accessibilityRole="alert" style={styles.payError}>
        {message}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={6} onPress={onRetry}>
        <Text style={styles.retryDark}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  pressed: { opacity: 0.82 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  list: { gap: 12 },
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
  sectionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 6,
  },
  steps: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  stepGroup: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  stepLine: { width: 28, height: 2, borderRadius: 1, backgroundColor: AppColors.border.soft },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: AppColors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberActive: { borderWidth: 0, backgroundColor: AppColors.brand.primary },
  stepNumberText: { color: AppColors.neutral.muted, fontFamily: AppFonts.button, fontSize: 11, lineHeight: 14 },
  stepNumberTextActive: { color: AppColors.neutral.white },
  stepLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  stepLabelActive: { color: AppColors.neutral.black },
  methods: { flexDirection: 'row', gap: 10 },
  method: {
    flex: 1,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    padding: 14,
  },
  methodSelected: { borderColor: AppColors.brand.primary },
  methodDisabled: { opacity: 0.45 },
  methodTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  methodLabel: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  methodCaption: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  methodCaptionSelected: { color: AppColors.brand.primary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderWidth: 0, backgroundColor: AppColors.brand.primary },
  pickupCard: { gap: 10, padding: 16 },
  notice: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    backgroundColor: AppColors.surface.input,
    padding: 10,
  },
  noticeText: {
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  addAddress: {
    minHeight: 50,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AppColors.brand.primary,
    borderRadius: 18,
  },
  addAddressText: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 13, letterSpacing: 0.6 },
  shipping: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.dark,
    padding: 16,
  },
  shippingLabel: { color: AppColors.neutral.white, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  shippingCaption: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  shippingAmount: { color: AppColors.neutral.white, fontFamily: AppFonts.emphasis, fontSize: 20, lineHeight: 26 },
  retry: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, lineHeight: 18, marginTop: 4 },
  retryDark: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, lineHeight: 18 },
  validity: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    backgroundColor: AppColors.surface.default,
    padding: 12,
  },
  validityExpired: { backgroundColor: AppColors.surface.softSelected },
  validityText: { flex: 1, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  validityTextExpired: { color: AppColors.feedback.error, fontFamily: AppFonts.label },
  summary: { gap: 12, padding: 16 },
  thumbs: { flexDirection: 'row', gap: 6 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  rows: { gap: 8 },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rowValue: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  grandLabel: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  grandValue: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 20, lineHeight: 26 },
  quoteError: { gap: 4 },
  payHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  payTotal: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 20, lineHeight: 26 },
  payTotalSkeleton: { marginTop: 2 },
  securePill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    borderRadius: 10,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  secureText: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: 11, lineHeight: 14 },
  payError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
