import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useShippingRatesViewModel } from '@/features/admin/viewmodels/use-shipping-rates-view-model';
import { AdminCard, AdminSubHeader, IconTile, PendingSaveNote } from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

const TRUCK = { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' } as const;

/** Pantalla 51 · Admin — Tarifas de envío. */
export function ShippingRatesView() {
  const viewModel = useShippingRatesViewModel();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
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
        <AdminSubHeader
          subtitle="Por rango de código postal · MXN"
          title="TARIFAS DE ENVÍO"
          onBack={viewModel.goBack}
        />

        <View style={styles.pickup}>
          <IconTile
            background={AppColors.surface.default}
            color={AppColors.feedback.success}
            icon={{ ios: 'storefront', android: 'storefront', web: 'storefront' }}
            iconSize={20}
          />
          <View style={styles.flexCopy}>
            <Text style={styles.rowTitle}>Recogida en gimnasio</Text>
            <Text style={styles.caption}>Siempre sin costo para el cliente</Text>
          </View>
          <Text style={styles.free}>Gratis</Text>
        </View>

        {viewModel.isLoading ? (
          <LoadingState label="Cargando tarifas…" />
        ) : viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : viewModel.isEmpty ? (
          <EmptyState
            description="Crea una tarifa para ofrecer envío a domicilio."
            icon={TRUCK}
            title="SIN TARIFAS"
          />
        ) : (
          viewModel.rates.map((rate) => (
            <AdminCard key={rate.id} style={styles.rateCard}>
              <View style={styles.rateHeader}>
                <IconTile icon={TRUCK} iconSize={20} />
                <View style={styles.flexCopy}>
                  <Text numberOfLines={2} style={styles.rateName}>
                    {rate.name}
                  </Text>
                  <Text style={[styles.status, !rate.active && styles.statusInactive]}>
                    {rate.statusLabel}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`${rate.name}, ${rate.statusLabel}. Cambiar estado, próximamente`}
                  disabled
                  thumbColor={AppColors.neutral.white}
                  trackColor={{ false: AppColors.border.default, true: AppColors.brand.primary }}
                  value={rate.active}
                />
              </View>
              <View style={styles.range}>
                <RangeBox label="CP inicial" value={rate.from} />
                <RangeBox label="CP final" value={rate.to} />
                <RangeBox dark label="Importe" value={rate.amount} />
              </View>
              <View
                accessibilityLabel="Editar tarifa, próximamente"
                accessible
                style={styles.editRow}>
                <SymbolView
                  name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                  size={14}
                  tintColor={AppColors.neutral.placeholder}
                />
                <Text style={styles.editText}>Editar tarifa</Text>
              </View>
            </AdminCard>
          ))
        )}

        <View style={styles.notice}>
          <SymbolView
            name={{ ios: 'info.circle', android: 'info', web: 'info' }}
            size={16}
            tintColor={AppColors.neutral.muted}
          />
          <Text style={styles.noticeText}>
            El rango acepta cualquier CP de 5 dígitos; no valida que exista ni la cobertura de la
            paquetería.
          </Text>
        </View>

        <AppButton disabled title="Nueva tarifa" />
        <PendingSaveNote />
      </ScrollView>
    </SafeAreaView>
  );
}

function RangeBox({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={[styles.rangeBox, dark && styles.rangeBoxDark]}>
      <Text style={[styles.caption, dark && styles.textOnDark]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.rangeValue, dark && styles.textWhite]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { gap: 14, paddingHorizontal: 20, paddingBottom: 24 },
  pickup: {
    borderRadius: 18,
    backgroundColor: AppColors.feedback.successSoft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  flexCopy: { minWidth: 0, flex: 1, gap: 1 },
  rowTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  free: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  rateCard: { gap: 12, padding: 16 },
  rateHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rateName: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  status: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  statusInactive: { color: AppColors.neutral.muted },
  range: { flexDirection: 'row', gap: 8 },
  rangeBox: {
    minWidth: 0,
    flex: 1,
    gap: 1,
    borderRadius: 12,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rangeBoxDark: { backgroundColor: AppColors.surface.dark },
  rangeValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  textOnDark: { color: AppColors.neutral.mutedOnDark },
  textWhite: { color: AppColors.neutral.white },
  editRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  editText: {
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 20,
  },
  notice: {
    borderRadius: 14,
    backgroundColor: AppColors.surface.input,
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
