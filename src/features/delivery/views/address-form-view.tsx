import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Overline } from '@/components/ui/overline';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { SubHeader } from '@/components/ui/sub-header';
import { MAX_REFERENCES } from '@/features/delivery/models/address';
import { useAddressFormViewModel } from '@/features/delivery/viewmodels/use-address-form-view-model';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantallas 32 y 60 · Nueva / Editar dirección. */
export function AddressFormView({ addressId }: { addressId?: string }) {
  const viewModel = useAddressFormViewModel(addressId);
  const { input, errors } = viewModel;

  function confirmRemove() {
    Alert.alert('¿Eliminar dirección?', 'Ya no podrás elegirla para tus envíos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void viewModel.remove() },
    ]);
  }

  const header = (
    <SubHeader
      subtitle={viewModel.isEditing ? 'Actualiza los datos de entrega' : 'Completa los datos de entrega'}
      title={viewModel.isEditing ? 'EDITAR DIRECCIÓN' : 'NUEVA DIRECCIÓN'}
      onBack={viewModel.cancel}
    />
  );

  if (viewModel.loadState !== 'ready') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          {header}
          {viewModel.loadState === 'loading' ? (
            <SkeletonGroup label="Cargando la dirección" style={styles.form}>
              {[0, 1, 2, 3, 4].map((key) => (
                <View key={key} style={styles.skeletonField}>
                  <SkeletonBlock height={12} width="35%" />
                  <SkeletonBlock height={56} radius={16} />
                </View>
              ))}
            </SkeletonGroup>
          ) : (
            <ErrorState message="No encontramos esta dirección." />
          )}
        </View>
      </SafeAreaView>
    );
  }

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
          {header}
          <View style={styles.form}>
            <Overline>Quién recibe</Overline>
            <FormField
              autoCapitalize="words"
              autoComplete="name"
              error={errors.recipientName}
              label="Nombre de quien recibe"
              placeholder="Nombre y apellido"
              value={input.recipientName}
              onChangeText={(value) => viewModel.setField('recipientName', value)}
            />
            <FormField
              autoComplete="tel"
              error={errors.phone}
              hint="10 dígitos."
              keyboardType="phone-pad"
              label="Teléfono"
              placeholder="7711234567"
              value={input.phone}
              onChangeText={(value) => viewModel.setField('phone', value)}
            />

            <Overline>Dirección</Overline>
            <FormField
              autoComplete="postal-code"
              error={errors.postalCode}
              hint="5 dígitos, por ejemplo 06000."
              keyboardType="number-pad"
              label="Código postal"
              placeholder="43000"
              value={input.postalCode}
              onChangeText={(value) => viewModel.setField('postalCode', value)}
            />
            <View style={styles.pair}>
              <View style={styles.flex}>
                <FormField
                  autoCapitalize="words"
                  error={errors.state}
                  label="Estado"
                  placeholder="Hidalgo"
                  value={input.state}
                  onChangeText={(value) => viewModel.setField('state', value)}
                />
              </View>
              <View style={styles.flex}>
                <FormField
                  autoCapitalize="words"
                  error={errors.municipality}
                  label="Municipio"
                  placeholder="Huejutla de Reyes"
                  value={input.municipality}
                  onChangeText={(value) => viewModel.setField('municipality', value)}
                />
              </View>
            </View>
            <FormField
              autoCapitalize="words"
              error={errors.neighborhood}
              label="Colonia"
              placeholder="Centro"
              value={input.neighborhood}
              onChangeText={(value) => viewModel.setField('neighborhood', value)}
            />
            <FormField
              autoCapitalize="words"
              autoComplete="street-address"
              error={errors.street}
              label="Calle"
              placeholder="Nombre de la calle"
              value={input.street}
              onChangeText={(value) => viewModel.setField('street', value)}
            />
            <View style={styles.pair}>
              <View style={styles.flex}>
                <FormField
                  error={errors.exteriorNumber}
                  label="No. exterior"
                  placeholder="12"
                  value={input.exteriorNumber}
                  onChangeText={(value) => viewModel.setField('exteriorNumber', value)}
                />
              </View>
              <View style={styles.flex}>
                <FormField
                  optional
                  label="No. interior"
                  placeholder="Ej. 3B"
                  value={input.interiorNumber}
                  onChangeText={(value) => viewModel.setField('interiorNumber', value)}
                />
              </View>
            </View>
            <FormField
              multiline
              error={errors.references}
              hint="Cómo reconocer el domicilio. Ayuda a la paquetería."
              label="Referencias"
              maxLength={MAX_REFERENCES}
              placeholder="Ej. Fachada blanca, portón negro, frente a la papelería"
              value={input.references}
              onChangeText={(value) => viewModel.setField('references', value)}
            />

            <View style={styles.defaultRow}>
              <View style={styles.flex}>
                <Text style={styles.defaultTitle}>Usar como predeterminada</Text>
                <Text style={styles.defaultText}>Se elegirá primero en tus compras.</Text>
              </View>
              <Switch
                accessibilityLabel="Usar como predeterminada"
                thumbColor={AppColors.neutral.white}
                trackColor={{ false: AppColors.border.default, true: AppColors.brand.primary }}
                value={input.isDefault}
                onValueChange={viewModel.setDefault}
              />
            </View>
          </View>
        </ScrollView>

        <ActionBar>
          {viewModel.saveError ? (
            <Text accessibilityRole="alert" style={styles.saveError}>
              {viewModel.saveError}
            </Text>
          ) : null}
          <AppButton
            loading={viewModel.isSaving}
            title={viewModel.isEditing ? 'Guardar cambios' : 'Guardar dirección'}
            onPress={() => void viewModel.save()}
          />
          <TextAction label="Cancelar" onPress={viewModel.cancel} />
          {viewModel.isEditing ? (
            <TextAction destructive label="Eliminar dirección" onPress={confirmRemove} />
          ) : null}
        </ActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextAction({ label, destructive = false, onPress }: { label: string; destructive?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={[styles.textActionLabel, destructive && styles.destructive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  form: { gap: 14 },
  skeletonField: { gap: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  defaultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    padding: 14,
  },
  defaultTitle: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  defaultText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  saveError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
  textAction: { alignItems: 'center', paddingVertical: 4 },
  textActionLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  destructive: { color: AppColors.feedback.error },
  pressed: { opacity: 0.7 },
});
