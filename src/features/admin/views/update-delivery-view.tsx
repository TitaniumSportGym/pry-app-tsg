import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { FilterChip } from '@/components/ui/filter-chip';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useUpdateDeliveryViewModel } from '@/features/admin/viewmodels/use-update-delivery-view-model';
import {
  AdminActionBar,
  AdminField,
  AdminSubHeader,
  PendingSaveNote,
} from '@/features/admin/views/admin-ui';
import { OrderStatusBadge } from '@/features/admin/views/order-status-badge';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const OPTION_ICONS: Record<string, SymbolViewProps['name']> = {
  shipped: { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' },
  incident: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  cancelled: { ios: 'xmark.circle', android: 'cancel', web: 'cancel' },
};
const DEFAULT_OPTION_ICON: SymbolViewProps['name'] = {
  ios: 'shippingbox',
  android: 'inventory_2',
  web: 'inventory_2',
};

/** Pantalla 48 · Admin — Actualizar entrega. */
export function UpdateDeliveryView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewModel = useUpdateDeliveryViewModel(id);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AdminSubHeader
            subtitle={viewModel.subtitle}
            title="ACTUALIZAR ENTREGA"
            onBack={viewModel.goBack}
          />

          {viewModel.isLoading ? (
            <LoadingState label="Cargando pedido…" />
          ) : viewModel.errorMessage || !viewModel.currentStatus ? (
            <ErrorState
              message={viewModel.errorMessage ?? 'No encontramos el pedido.'}
              onRetry={viewModel.retry}
            />
          ) : (
            <>
              <View style={styles.current}>
                <View style={styles.currentIcon}>
                  <SymbolView name={DEFAULT_OPTION_ICON} size={20} tintColor={AppColors.brand.primary} />
                </View>
                <View style={styles.currentCopy}>
                  <Text style={styles.caption}>Estado actual</Text>
                  <OrderStatusBadge
                    label={viewModel.currentStatusLabel}
                    status={viewModel.currentStatus}
                  />
                </View>
              </View>

              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Nuevo estado
              </Text>
              {viewModel.options.length === 0 ? (
                <Text style={styles.caption}>Este pedido ya no tiene cambios de estado disponibles.</Text>
              ) : (
                <View accessibilityRole="radiogroup" style={styles.options}>
                  {viewModel.options.map((option) => {
                    const selected = option.status === viewModel.selectedStatus;
                    return (
                      <Pressable
                        key={option.status}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={({ pressed }) => [
                          styles.option,
                          selected && styles.optionSelected,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => viewModel.select(option.status)}>
                        <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                          <SymbolView
                            name={OPTION_ICONS[option.status] ?? DEFAULT_OPTION_ICON}
                            size={19}
                            tintColor={selected ? AppColors.neutral.white : AppColors.brand.primary}
                          />
                        </View>
                        <View style={styles.currentCopy}>
                          <Text style={styles.optionLabel}>{option.label}</Text>
                          {option.description ? (
                            <Text style={styles.caption}>{option.description}</Text>
                          ) : null}
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected ? (
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                              size={13}
                              tintColor={AppColors.neutral.white}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {viewModel.needsShippingData ? (
                <>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Datos del envío
                  </Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      Paquetería <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.chips}>
                      {viewModel.carriers.map((carrier) => (
                        <FilterChip
                          key={carrier}
                          label={carrier}
                          selected={carrier === viewModel.carrier}
                          onPress={() => viewModel.setCarrier(carrier)}
                        />
                      ))}
                    </View>
                  </View>
                  <AdminField
                    autoCapitalize="characters"
                    label="Número de guía"
                    maxLength={viewModel.trackingMaxLength}
                    placeholder="Ej. 7012 3456 7890"
                    required
                    value={viewModel.trackingNumber}
                    onChangeText={viewModel.setTrackingNumber}
                  />
                </>
              ) : null}

              <AdminField
                label="Nota interna"
                maxLength={viewModel.noteMaxLength}
                multiline
                optional
                placeholder="Ej. Se entregó en sucursal a las 13:10"
                value={viewModel.note}
                onChangeText={viewModel.setNote}
              />

              <View style={styles.notice}>
                <SymbolView
                  name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
                  size={16}
                  tintColor={AppColors.brand.primary}
                />
                <Text style={styles.noticeText}>
                  El cliente verá el nuevo estado y la guía en su seguimiento.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <AdminActionBar>
          <AppButton disabled title="Guardar estado" />
          <PendingSaveNote />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={viewModel.goBack}>
            <Text style={styles.cancel}>Cancelar</Text>
          </Pressable>
        </AdminActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 20, paddingBottom: 20 },
  current: {
    borderRadius: 18,
    backgroundColor: AppColors.surface.soft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCopy: { minWidth: 0, flex: 1, alignItems: 'flex-start', gap: 4 },
  caption: {
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
  },
  options: { gap: 10 },
  option: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: AppColors.brand.primary,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: AppColors.brand.primary },
  optionLabel: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 11,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: AppColors.brand.primary, backgroundColor: AppColors.brand.primary },
  field: { gap: 6 },
  fieldLabel: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 20,
  },
  required: { color: AppColors.brand.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: {
    borderRadius: 14,
    backgroundColor: AppColors.surface.soft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  cancel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: { opacity: 0.8 },
});
