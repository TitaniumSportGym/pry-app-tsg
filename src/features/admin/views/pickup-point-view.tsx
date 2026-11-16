import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { usePickupPointViewModel } from '@/features/admin/viewmodels/use-pickup-point-view-model';
import { AdminActionBar, AdminField, AdminSubHeader } from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 52 y 76 · Admin — Punto de recogida. */
export function PickupPointView() {
  const viewModel = usePickupPointViewModel();
  const { form, errors, limits } = viewModel;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AdminSubHeader
            subtitle="Lo ve el cliente al elegir “Recoger”"
            title="PUNTO DE RECOGIDA"
            onBack={viewModel.goBack}
          />

          {viewModel.isLoading ? (
            <SkeletonGroup label="Cargando el punto de recogida" style={styles.content}>
              <SkeletonBlock height={72} radius={16} />
              {[0, 1, 2, 3, 4].map((key) => (
                <View key={key} style={styles.skeletonField}>
                  <SkeletonBlock height={12} width="30%" />
                  <SkeletonBlock height={56} radius={16} />
                </View>
              ))}
            </SkeletonGroup>
          ) : null}

          {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}

          {form ? (
            <>
              <View style={styles.available}>
                <View style={styles.flexCopy}>
                  <Text style={styles.rowTitle}>Recogida disponible</Text>
                  <Text style={styles.caption}>Si la desactivas, el checkout solo ofrecerá envío.</Text>
                </View>
                <Switch
                  accessibilityLabel="Recogida disponible"
                  thumbColor={AppColors.neutral.white}
                  trackColor={{ false: AppColors.border.default, true: AppColors.brand.primary }}
                  value={form.enabled}
                  onValueChange={(value) => viewModel.update('enabled', value)}
                />
              </View>

              <AdminField
                required
                error={errors.name}
                label="Nombre"
                maxLength={limits.name}
                value={form.name}
                onChangeText={(value) => viewModel.update('name', value)}
              />
              <AdminField
                required
                error={errors.address}
                label="Dirección"
                maxLength={limits.address}
                value={form.address}
                onChangeText={(value) => viewModel.update('address', value)}
              />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AdminField
                    error={errors.municipality}
                    label="Municipio"
                    maxLength={limits.municipality}
                    value={form.municipality}
                    onChangeText={(value) => viewModel.update('municipality', value)}
                  />
                </View>
                <View style={styles.postalCode}>
                  <AdminField
                    required
                    error={errors.postalCode}
                    keyboardType="number-pad"
                    label="CP"
                    maxLength={limits.postalCode}
                    value={form.postalCode}
                    onChangeText={(value) => viewModel.update('postalCode', value)}
                  />
                </View>
              </View>
              <AdminField
                error={errors.state}
                label="Estado"
                maxLength={limits.state}
                value={form.state}
                onChangeText={(value) => viewModel.update('state', value)}
              />
              <AdminField
                required
                error={errors.phone}
                keyboardType="phone-pad"
                label="Teléfono"
                maxLength={limits.phone}
                value={form.phone}
                onChangeText={(value) => viewModel.update('phone', value)}
              />
              <AdminField
                multiline
                optional
                error={errors.hours}
                hint="Ej. Lunes a viernes 6:00–23:00 · Sábado y domingo 8:00–16:00"
                label="Horarios"
                maxLength={limits.hours}
                value={form.hours}
                onChangeText={(value) => viewModel.update('hours', value)}
              />
              <AdminField
                multiline
                optional
                error={errors.instructions}
                label="Instrucciones para el cliente"
                maxLength={limits.instructions}
                placeholder="Ej. Presenta tu número de pedido en recepción."
                value={form.instructions}
                onChangeText={(value) => viewModel.update('instructions', value)}
              />
            </>
          ) : null}
        </ScrollView>

        {form ? (
          <AdminActionBar>
            {viewModel.saveError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {viewModel.saveError}
              </Text>
            ) : viewModel.saved ? (
              <Text accessibilityLiveRegion="polite" style={styles.success}>
                Cambios guardados. El cliente ya ve la nueva información.
              </Text>
            ) : null}
            <AppButton loading={viewModel.isSaving} title="Guardar cambios" onPress={() => void viewModel.save()} />
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
  skeletonField: { gap: 8 },
  available: {
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
  postalCode: { width: 110 },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
  success: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
