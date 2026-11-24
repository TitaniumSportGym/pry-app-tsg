import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { useShippingRateFormViewModel } from '@/features/admin/viewmodels/use-shipping-rate-form-view-model';
import { AdminActionBar, AdminField, AdminSubHeader } from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 67 y 68 · Admin — Nueva / Editar tarifa. */
export function ShippingRateFormView({ rateId }: { rateId?: string }) {
  const viewModel = useShippingRateFormViewModel(rateId);
  const { input, errors } = viewModel;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AdminSubHeader
            subtitle="Envío por rango de código postal"
            title={viewModel.isEditing ? 'EDITAR TARIFA' : 'NUEVA TARIFA'}
            onBack={viewModel.cancel}
          />

          {viewModel.isLoading ? (
            <SkeletonGroup label="Cargando la tarifa" style={styles.content}>
              <SkeletonBlock height={72} radius={16} />
              <SkeletonBlock height={56} radius={16} />
              <SkeletonBlock height={56} radius={16} />
            </SkeletonGroup>
          ) : null}
          {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}

          {input ? (
            <>
              <View style={styles.active}>
                <View style={styles.flexCopy}>
                  <Text style={styles.rowTitle}>Tarifa activa</Text>
                  <Text style={styles.caption}>Si la desactivas, no se cobrará a los clientes de este rango.</Text>
                </View>
                <Switch
                  accessibilityLabel="Tarifa activa"
                  thumbColor={AppColors.neutral.white}
                  trackColor={{ false: AppColors.border.default, true: AppColors.brand.primary }}
                  value={input.active}
                  onValueChange={viewModel.setActive}
                />
              </View>
              <AdminField
                required
                error={errors.name}
                label="Nombre"
                maxLength={120}
                placeholder="Ej. Huejutla local"
                value={input.name}
                onChangeText={(value) => viewModel.setField('name', value)}
              />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AdminField
                    required
                    error={errors.postalCodeFrom}
                    keyboardType="number-pad"
                    label="CP inicial"
                    maxLength={5}
                    placeholder="43000"
                    value={input.postalCodeFrom}
                    onChangeText={(value) => viewModel.setField('postalCodeFrom', value)}
                  />
                </View>
                <View style={styles.flex}>
                  <AdminField
                    required
                    error={errors.postalCodeTo}
                    keyboardType="number-pad"
                    label="CP final"
                    maxLength={5}
                    placeholder="43099"
                    value={input.postalCodeTo}
                    onChangeText={(value) => viewModel.setField('postalCodeTo', value)}
                  />
                </View>
              </View>
              <AdminField
                required
                error={errors.amount}
                keyboardType="decimal-pad"
                label="Importe (MXN)"
                placeholder="149.00"
                value={input.amount}
                onChangeText={(value) => viewModel.setField('amount', value)}
              />
              {viewModel.overlapWarning ? (
                <View accessibilityRole="alert" style={[styles.notice, styles.noticeWarning]}>
                  <SymbolView
                    name={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
                    size={16}
                    tintColor={AppColors.feedback.error}
                  />
                  <Text style={[styles.noticeText, styles.noticeTextWarning]}>{viewModel.overlapWarning}</Text>
                </View>
              ) : (
                <View style={styles.notice}>
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={16}
                    tintColor={AppColors.neutral.muted}
                  />
                  <Text style={styles.noticeText}>
                    Usa CP de 5 dígitos. El rango no valida que el CP exista ni la cobertura de la paquetería.
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        {input ? (
          <AdminActionBar>
            {viewModel.saveError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {viewModel.saveError}
              </Text>
            ) : null}
            <AppButton
              loading={viewModel.isSaving}
              title={viewModel.isEditing ? 'Guardar cambios' : 'Guardar tarifa'}
              onPress={() => void viewModel.save()}
            />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={viewModel.cancel}>
              <Text style={styles.cancel}>Cancelar</Text>
            </Pressable>
          </AdminActionBar>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { flex: 1 },
  content: { gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  active: {
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flexCopy: { minWidth: 0, flex: 1, gap: 2 },
  rowTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  caption: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 10 },
  notice: {
    borderRadius: 14,
    backgroundColor: AppColors.surface.input,
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeWarning: { backgroundColor: AppColors.surface.softSelected },
  noticeText: { minWidth: 0, flex: 1, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  noticeTextWarning: { color: AppColors.feedback.error, fontFamily: AppFonts.label },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
  cancel: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20, textAlign: 'center' },
});
