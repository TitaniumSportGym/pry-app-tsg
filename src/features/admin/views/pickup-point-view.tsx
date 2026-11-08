import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Fragment } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { usePickupPointViewModel } from '@/features/admin/viewmodels/use-pickup-point-view-model';
import {
  AdminActionBar,
  AdminField,
  AdminSubHeader,
  PendingSaveNote,
  SampleBadge,
} from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantalla 52 · Admin — Punto de recogida. */
export function PickupPointView() {
  const viewModel = usePickupPointViewModel();
  const { form } = viewModel;

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
            subtitle="Lo ve el cliente al elegir “Recoger”"
            title="PUNTO DE RECOGIDA"
            onBack={viewModel.goBack}
          />

          <View style={styles.available}>
            <View style={styles.flexCopy}>
              <Text style={styles.rowTitle}>Recogida disponible</Text>
              <Text style={styles.caption}>Si la desactivas, el checkout solo ofrecerá envío.</Text>
            </View>
            <Switch
              accessibilityLabel="Recogida disponible"
              thumbColor={AppColors.neutral.white}
              trackColor={{ false: AppColors.border.default, true: AppColors.brand.primary }}
              value={form.available}
              onValueChange={(value) => viewModel.update('available', value)}
            />
          </View>

          <AdminField
            label="Nombre"
            maxLength={80}
            value={form.name}
            onChangeText={(value) => viewModel.update('name', value)}
          />
          <AdminField
            label="Dirección"
            maxLength={120}
            value={form.address}
            onChangeText={(value) => viewModel.update('address', value)}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <AdminField
                label="Municipio"
                maxLength={60}
                value={form.municipality}
                onChangeText={(value) => viewModel.update('municipality', value)}
              />
            </View>
            <View style={styles.postalCode}>
              <AdminField
                keyboardType="number-pad"
                label="CP"
                maxLength={5}
                value={form.postalCode}
                onChangeText={(value) => viewModel.update('postalCode', value.replace(/\D/g, ''))}
              />
            </View>
          </View>
          <AdminField
            keyboardType="phone-pad"
            label="Teléfono"
            maxLength={15}
            value={form.phone}
            onChangeText={(value) => viewModel.update('phone', value)}
          />

          <View style={styles.titleWithBadge}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Horarios
            </Text>
            <SampleBadge />
          </View>
          <View style={styles.schedule}>
            {viewModel.schedule.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.scheduleRow}>
                  <SymbolView
                    name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                    size={16}
                    tintColor={AppColors.brand.primary}
                  />
                  <Text style={styles.scheduleDay}>{item.day}</Text>
                  <View style={styles.hours}>
                    <Text style={styles.hoursText}>{item.hours}</Text>
                  </View>
                </View>
              </Fragment>
            ))}
          </View>

          <AdminField
            label="Instrucciones para el cliente"
            maxLength={240}
            multiline
            value={form.instructions}
            onChangeText={(value) => viewModel.update('instructions', value)}
          />
        </ScrollView>

        <AdminActionBar>
          <AppButton disabled title="Guardar cambios" />
          <PendingSaveNote />
        </AdminActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { flex: 1 },
  content: { gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  available: {
    borderRadius: 16,
    backgroundColor: AppColors.surface.soft,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flexCopy: { minWidth: 0, flex: 1, gap: 2 },
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
  row: { flexDirection: 'row', gap: 10 },
  postalCode: { width: 110 },
  titleWithBadge: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  schedule: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 10 },
  scheduleDay: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  hours: {
    borderRadius: 10,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hoursText: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
