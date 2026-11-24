import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { SubHeader } from '@/components/ui/sub-header';
import { UploadProgressModal } from '@/components/ui/upload-progress-modal';
import { useTrainerProfileViewModel } from '@/features/trainer/viewmodels/use-trainer-profile-view-model';
import { ICONS } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantalla 89 · Entrenador — Editar perfil. */
export function TrainerProfileView() {
  const viewModel = useTrainerProfileViewModel();
  const { draft, errors } = viewModel;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SubHeader subtitle="Así te ven los socios" title="MI PERFIL" onBack={viewModel.cancel} />
          {viewModel.isLoading ? (
            <SkeletonGroup label="Cargando tu perfil" style={styles.form}>
              <View style={styles.avatarBlock}>
                <SkeletonBlock height={104} radius={52} width={104} />
              </View>
              {[0, 1, 2, 3].map((key) => (
                <SkeletonBlock key={key} height={56} radius={16} />
              ))}
            </SkeletonGroup>
          ) : null}
          {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
          {draft ? (
            <View style={styles.form}>
              <View style={styles.avatarBlock}>
                <Pressable accessibilityHint="Abre tu galería" accessibilityLabel="Cambiar foto" accessibilityRole="button" onPress={() => void viewModel.pickPhoto()}>
                  <View style={styles.avatar}>
                    {viewModel.photoUri ? (
                      <Image contentFit="cover" source={{ uri: viewModel.photoUri }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.initials}>{viewModel.initials}</Text>
                    )}
                  </View>
                  <View style={styles.badge}>
                    <SymbolView name={ICONS.camera} size={16} tintColor={AppColors.neutral.white} />
                  </View>
                </Pressable>
                <Text style={styles.changePhoto}>Cambiar foto</Text>
                <Text style={styles.caption}>{viewModel.email}</Text>
                {viewModel.photoError ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {viewModel.photoError}
                  </Text>
                ) : (
                  <Text style={styles.caption}>JPG o PNG · máximo 5 MB</Text>
                )}
              </View>
              <FormField autoCapitalize="words" error={errors.fullName} label="Nombre completo" required value={draft.fullName} onChangeText={(value) => viewModel.setField('fullName', value)} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <FormField error={errors.phone} keyboardType="phone-pad" label="Teléfono" optional value={draft.phone} onChangeText={(value) => viewModel.setField('phone', value)} />
                </View>
                <View style={styles.years}>
                  <FormField error={errors.experienceYears} keyboardType="number-pad" label="Años de exp." value={draft.experienceYears} onChangeText={(value) => viewModel.setField('experienceYears', value)} />
                </View>
              </View>
              <FormField error={errors.specialty} label="Especialidad" placeholder="Ej. Fuerza e hipertrofia" required value={draft.specialty} onChangeText={(value) => viewModel.setField('specialty', value)} />
              <FormField label="Enfoque" optional placeholder="Ej. Técnica y progresión segura" value={draft.focus} onChangeText={(value) => viewModel.setField('focus', value)} />
              <FormField label="Certificaciones" multiline optional value={draft.certifications} onChangeText={(value) => viewModel.setField('certifications', value)} />
              <FormField error={errors.bio} label="Biografía" maxLength={600} multiline optional value={draft.bio} onChangeText={(value) => viewModel.setField('bio', value)} />
            </View>
          ) : null}
        </ScrollView>
        {draft ? (
          <ActionBar>
            {viewModel.saveError ? (
              <Text accessibilityRole="alert" style={styles.barError}>
                {viewModel.saveError}
              </Text>
            ) : null}
            <AppButton loading={viewModel.isSaving} title="Guardar cambios" onPress={() => void viewModel.save()} />
          </ActionBar>
        ) : null}
      </KeyboardAvoidingView>
      <UploadProgressModal upload={viewModel.upload} onCancel={viewModel.cancelUpload} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { minWidth: 0, flex: 1 },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 32 },
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  years: { width: 120 },
  avatarBlock: { alignItems: 'center', gap: 4 },
  avatar: { width: 104, height: 104, overflow: 'hidden', borderRadius: 52, backgroundColor: AppColors.surface.softSelected, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { color: AppColors.brand.primary, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, lineHeight: 44 },
  badge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: AppColors.surface.default, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  changePhoto: { marginTop: 6, color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  caption: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
  barError: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
});
