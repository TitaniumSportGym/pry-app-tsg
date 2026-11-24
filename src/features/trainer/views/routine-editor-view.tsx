import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/ui/action-bar';
import { AppButton } from '@/components/ui/app-button';
import { FilterChip } from '@/components/ui/filter-chip';
import { FormField } from '@/components/ui/form-field';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { Stepper } from '@/components/ui/stepper';
import { SubHeader } from '@/components/ui/sub-header';
import { UploadProgressModal } from '@/components/ui/upload-progress-modal';
import { CATEGORY_OPTIONS, LEVEL_OPTIONS } from '@/features/trainer/models/trainer-routine';
import { useRoutineEditorViewModel } from '@/features/trainer/viewmodels/use-routine-editor-view-model';
import { ICONS } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

type ViewModel = ReturnType<typeof useRoutineEditorViewModel>;

/** Pantallas 80–85 · Nueva / Editar rutina. */
export function RoutineEditorView({ routineId }: { routineId?: string }) {
  const viewModel = useRoutineEditorViewModel(routineId);

  if (viewModel.loadState !== 'ready') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <SubHeader title={viewModel.title} onBack={viewModel.back} />
          {viewModel.loadState === 'loading' ? (
            <SkeletonGroup label="Cargando la rutina" style={styles.form}>
              {[0, 1, 2, 3].map((key) => (
                <View key={key} style={styles.skeletonField}>
                  <SkeletonBlock height={12} width="35%" />
                  <SkeletonBlock height={56} radius={16} />
                </View>
              ))}
            </SkeletonGroup>
          ) : (
            <ErrorState message="No encontramos esta rutina." />
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.editor) return <ExerciseFormView viewModel={viewModel} />;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SubHeader subtitle={viewModel.subtitle} title={viewModel.title} onBack={viewModel.back} />
          <Stepper active={viewModel.step} steps={viewModel.steps} />
          {viewModel.step === 0 ? <DetailsStep viewModel={viewModel} /> : null}
          {viewModel.step === 1 ? <ExercisesStep viewModel={viewModel} /> : null}
          {viewModel.step === 2 ? <MediaStep viewModel={viewModel} /> : null}
        </ScrollView>
        <ActionBar>
          {viewModel.error ? (
            <Text accessibilityRole="alert" style={styles.barError}>
              {viewModel.error}
            </Text>
          ) : null}
          {viewModel.step < 2 ? (
            <>
              <AppButton
                loading={viewModel.saving === 'next'}
                title={viewModel.step === 0 ? 'Siguiente: ejercicios' : 'Guardar y seguir'}
                onPress={() => void viewModel.next()}
              />
              {viewModel.step === 1 ? <TextAction label="Atrás" onPress={viewModel.back} /> : null}
            </>
          ) : (
            <>
              <AppButton disabled={viewModel.isBusy} loading={viewModel.saving === 'submit'} title="Enviar a revisión" onPress={() => void viewModel.finish(true)} />
              <AppButton
                disabled={viewModel.isBusy}
                loading={viewModel.saving === 'draft'}
                title="Guardar como borrador"
                variant="outline"
                onPress={() => void viewModel.finish(false)}
              />
            </>
          )}
        </ActionBar>
      </KeyboardAvoidingView>
      <UploadProgressModal upload={viewModel.upload} onCancel={viewModel.cancelUpload} />
    </SafeAreaView>
  );
}

function DetailsStep({ viewModel }: { viewModel: ViewModel }) {
  const { draft, detailErrors: errors } = viewModel;
  return (
    <View style={styles.form}>
      <FormField error={errors.title} label="Nombre de la rutina" maxLength={120} placeholder="Ej. Fuerza tren inferior" required value={draft.title} onChangeText={(value) => viewModel.setField('title', value)} />
      <FormField error={errors.objective} label="Objetivo" maxLength={200} optional placeholder="Ej. Ganar fuerza en piernas" value={draft.objective} onChangeText={(value) => viewModel.setField('objective', value)} />
      <FormField label="Descripción" maxLength={600} multiline optional placeholder="Cómo se trabaja, calentamiento, recomendaciones…" value={draft.description} onChangeText={(value) => viewModel.setField('description', value)} />
      <ChipGroup label="Nivel" options={LEVEL_OPTIONS} value={draft.level} onChange={(value) => viewModel.setField('level', value)} />
      <ChipGroup label="Categoría" options={CATEGORY_OPTIONS} value={draft.category} onChange={(value) => viewModel.setField('category', value)} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField error={errors.durationWeeks} keyboardType="number-pad" label="Semanas" value={draft.durationWeeks} onChangeText={(value) => viewModel.setField('durationWeeks', value)} />
        </View>
        <View style={styles.flex}>
          <FormField error={errors.daysPerWeek} keyboardType="number-pad" label="Días/sem." value={draft.daysPerWeek} onChangeText={(value) => viewModel.setField('daysPerWeek', value)} />
        </View>
        <View style={styles.flex}>
          <FormField error={errors.estimatedMinutes} keyboardType="number-pad" label="Min/sesión" value={draft.estimatedMinutes} onChangeText={(value) => viewModel.setField('estimatedMinutes', value)} />
        </View>
      </View>
      <Text style={styles.caption}>La rutina se guarda como borrador hasta que la envíes a revisión.</Text>
    </View>
  );
}

function ExercisesStep({ viewModel }: { viewModel: ViewModel }) {
  function confirmRemove(key: string, name: string) {
    Alert.alert('¿Quitar ejercicio?', `Se quitará "${name}" de la rutina.`, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => viewModel.removeExercise(key) },
    ]);
  }
  return (
    <View style={styles.form}>
      <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {viewModel.days.map((day) => (
          <FilterChip key={day.day} label={`Día ${day.day} · ${day.count}`} selected={viewModel.selectedDay === day.day} onPress={() => viewModel.selectDay(day.day)} />
        ))}
      </ScrollView>
      {viewModel.exerciseErrors ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {viewModel.exerciseErrors}
        </Text>
      ) : null}
      {viewModel.visibleExercises.length === 0 ? <Text style={styles.caption}>{`Aún no hay ejercicios para el día ${viewModel.selectedDay}.`}</Text> : null}
      {viewModel.visibleExercises.map((exercise) => (
        <View key={exercise.key} style={[styles.exercise, exercise.invalid && styles.exerciseInvalid]}>
          <View style={styles.exerciseTop}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{exercise.position}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.exerciseName}>{exercise.name || 'Ejercicio sin nombre'}</Text>
              {exercise.description ? <Text numberOfLines={2} style={styles.caption}>{exercise.description}</Text> : null}
            </View>
            <IconAction icon={ICONS.pencil} label={`Editar ${exercise.name}`} onPress={() => viewModel.editExercise(exercise.key)} />
            <IconAction destructive icon={ICONS.trash} label={`Quitar ${exercise.name}`} onPress={() => confirmRemove(exercise.key, exercise.name)} />
          </View>
          <View style={styles.stats}>
            <Stat label="Series" value={exercise.sets} />
            <Stat label="Reps" value={exercise.reps} />
            <Stat label="Descanso" value={`${exercise.restSeconds} s`} />
          </View>
          <View style={styles.videoState}>
            <SymbolView name={exercise.hasVideo ? ICONS.play : ICONS.video} size={14} tintColor={exercise.hasVideo ? AppColors.feedback.success : AppColors.neutral.muted} />
            <Text style={[styles.caption, exercise.hasVideo && styles.successText]}>
              {exercise.hasVideo ? (exercise.videoType === 'upload' ? 'Video subido' : 'Enlace de video') : 'Sin video · lo agregas en el paso 3'}
            </Text>
          </View>
        </View>
      ))}
      <Pressable accessibilityRole="button" style={({ pressed }) => [styles.dashed, pressed && styles.pressed]} onPress={viewModel.addExercise}>
        <SymbolView name={ICONS.plus} size={16} tintColor={AppColors.brand.primary} />
        <Text style={styles.dashedText}>{`AGREGAR EJERCICIO AL DÍA ${viewModel.selectedDay}`}</Text>
      </Pressable>
    </View>
  );
}

function MediaStep({ viewModel }: { viewModel: ViewModel }) {
  return (
    <View style={styles.form}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Portada
      </Text>
      <View style={styles.cover}>
        {viewModel.coverUri ? (
          <Image contentFit="cover" source={{ uri: viewModel.coverUri }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.coverEmpty}>
            <SymbolView name={ICONS.image} size={30} tintColor={AppColors.neutral.mutedOnDark} />
            <Text style={styles.coverEmptyText}>Sin portada · se usará la imagen del gimnasio</Text>
          </View>
        )}
        <View style={styles.coverActions}>
          <SmallAction icon={ICONS.image} label={viewModel.coverUri ? 'Cambiar' : 'Elegir imagen'} onPress={() => void viewModel.pickCover()} />
          {viewModel.hasPendingCover ? <SmallAction destructive icon={ICONS.trash} label="Quitar" onPress={viewModel.removeCover} /> : null}
        </View>
      </View>
      {viewModel.coverError ? <Text accessibilityRole="alert" style={styles.error}>{viewModel.coverError}</Text> : null}
      <Text style={styles.caption}>{viewModel.hasPendingCover ? 'La portada se sube al guardar.' : 'JPG o PNG · máximo 5 MB.'}</Text>

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Videos de los ejercicios
      </Text>
      <View style={styles.note}>
        <SymbolView name={ICONS.info} size={16} tintColor={AppColors.neutral.muted} />
        <Text style={styles.noteText}>Sube un video desde tu galería (MP4, WEBM o MOV, máximo 100 MB) o pega un enlace de YouTube. Es opcional.</Text>
      </View>
      {viewModel.exercisesForVideo.map((exercise) => (
        <View key={exercise.key} style={[styles.videoCard, exercise.error ? styles.exerciseInvalid : null]}>
          <View style={styles.exerciseTop}>
            <View style={[styles.videoThumb, exercise.videoType !== 'none' && styles.videoThumbOn]}>
              <SymbolView name={ICONS.play} size={16} tintColor={AppColors.neutral.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={[styles.caption, exercise.videoType !== 'none' && styles.successText]}>
                {`Día ${exercise.day} · ${exercise.videoType === 'upload' ? 'Video subido' : exercise.videoType !== 'none' ? 'Enlace de video' : 'Sin video'}`}
              </Text>
            </View>
            {exercise.videoType !== 'none' ? (
              <IconAction destructive icon={ICONS.trash} label={`Quitar video de ${exercise.name}`} onPress={() => void viewModel.removeVideo(exercise.key)} />
            ) : null}
          </View>
          {exercise.error ? (
            <View style={styles.errorRow}>
              <SymbolView name={ICONS.alert} size={14} tintColor={AppColors.feedback.error} />
              <Text accessibilityRole="alert" style={[styles.error, styles.flex]}>
                {exercise.error}
              </Text>
            </View>
          ) : null}
          {exercise.videoType === 'none' ? (
            <>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <FormField
                    autoCapitalize="none"
                    keyboardType="url"
                    label="Enlace de YouTube"
                    placeholder="https://youtube.com/…"
                    value={exercise.link}
                    onChangeText={(value) => viewModel.setLink(exercise.key, value)}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <SmallAction icon={ICONS.link} label="Guardar enlace" light onPress={() => void viewModel.saveLink(exercise.key)} />
                <SmallAction icon={ICONS.upload} label="Subir video" light onPress={() => void viewModel.uploadVideo(exercise.key)} />
              </View>
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ExerciseFormView({ viewModel }: { viewModel: ViewModel }) {
  const editor = viewModel.editor!;
  const { exercise, errors } = editor;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SubHeader subtitle={`Día ${exercise.dayNumber} · ${viewModel.draft.title || 'Nueva rutina'}`} title={editor.isNew ? 'NUEVO EJERCICIO' : 'EDITAR EJERCICIO'} onBack={viewModel.cancelExercise} />
          <View style={styles.form}>
            <FormField error={errors.name} label="Nombre del ejercicio" maxLength={120} placeholder="Ej. Sentadilla con barra" required value={exercise.name} onChangeText={(value) => viewModel.setExerciseField('name', value)} />
            <FormField label="Descripción" maxLength={300} multiline optional value={exercise.description} onChangeText={(value) => viewModel.setExerciseField('description', value)} />
            <View style={styles.chipGroup}>
              <Text style={styles.groupLabel}>Día</Text>
              <View style={styles.wrap}>
                {Array.from({ length: viewModel.maxDay }, (_, index) => index + 1).map((day) => (
                  <FilterChip key={day} label={`Día ${day}`} selected={exercise.dayNumber === day} onPress={() => viewModel.setExerciseField('dayNumber', day)} />
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <FormField error={errors.sets} keyboardType="number-pad" label="Series" value={exercise.sets} onChangeText={(value) => viewModel.setExerciseField('sets', value)} />
              </View>
              <View style={styles.flex}>
                <FormField error={errors.reps} label="Reps" maxLength={20} value={exercise.reps} onChangeText={(value) => viewModel.setExerciseField('reps', value)} />
              </View>
              <View style={styles.flex}>
                <FormField error={errors.restSeconds} keyboardType="number-pad" label="Descanso (s)" value={exercise.restSeconds} onChangeText={(value) => viewModel.setExerciseField('restSeconds', value)} />
              </View>
            </View>
            <FormField label="Notas de técnica" maxLength={300} multiline optional value={exercise.notes} onChangeText={(value) => viewModel.setExerciseField('notes', value)} />
            {exercise.videoType !== 'upload' ? (
              <FormField
                autoCapitalize="none"
                error={errors.videoUrl}
                hint="YouTube u otro enlace https. También puedes subir un video en el paso 3."
                keyboardType="url"
                label="Enlace del video"
                optional
                value={exercise.videoUrl ?? ''}
                onChangeText={(value) => viewModel.setExerciseField('videoUrl', value)}
              />
            ) : (
              <Text style={styles.caption}>Este ejercicio tiene un video subido. Puedes cambiarlo en el paso 3.</Text>
            )}
          </View>
        </ScrollView>
        <ActionBar>
          <AppButton title="Guardar ejercicio" onPress={viewModel.saveExercise} />
          <TextAction label="Cancelar" onPress={viewModel.cancelExercise} />
        </ActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: readonly { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.chipGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => (
          <FilterChip key={option.value} label={option.label} selected={value === option.value} onPress={() => onChange(option.value)} />
        ))}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

function IconAction({ icon, label, destructive = false, onPress }: { icon: SymbolViewProps['name']; label: string; destructive?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.iconAction, destructive && styles.iconActionDanger, pressed && styles.pressed]} onPress={onPress}>
      <SymbolView name={icon} size={16} tintColor={destructive ? AppColors.feedback.error : AppColors.neutral.text} />
    </Pressable>
  );
}

function SmallAction({ icon, label, destructive = false, light = false, onPress }: { icon: SymbolViewProps['name']; label: string; destructive?: boolean; light?: boolean; onPress: () => void }) {
  const color = destructive ? AppColors.feedback.error : light ? AppColors.brand.primary : AppColors.neutral.text;
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.smallAction, light && styles.smallActionLight, pressed && styles.pressed]} onPress={onPress}>
      <SymbolView name={icon} size={14} tintColor={color} />
      <Text style={[styles.smallActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={6} style={styles.textAction} onPress={onPress}>
      <Text style={styles.textActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  flex: { minWidth: 0, flex: 1 },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 32 },
  form: { gap: 14 },
  skeletonField: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipGroup: { gap: 8 },
  groupLabel: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: 13, lineHeight: 20 },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  caption: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  successText: { color: AppColors.feedback.success },
  error: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  barError: { color: AppColors.feedback.error, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
  sectionTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  exercise: { gap: 12, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 20, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card, padding: 16 },
  exerciseInvalid: { borderColor: AppColors.feedback.error },
  exerciseTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  number: { width: 30, height: 30, borderRadius: 10, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: AppColors.neutral.white, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  exerciseName: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', borderRadius: 12, backgroundColor: AppColors.surface.input, paddingVertical: 8 },
  statValue: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  videoState: { alignItems: 'center', flexDirection: 'row', gap: 8, borderRadius: 12, backgroundColor: AppColors.surface.input, paddingHorizontal: 10, paddingVertical: 8 },
  iconAction: { width: 34, height: 34, borderRadius: 12, backgroundColor: AppColors.surface.input, alignItems: 'center', justifyContent: 'center' },
  iconActionDanger: { backgroundColor: AppColors.surface.softSelected },
  dashed: { minHeight: 52, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: AppColors.brand.primary, borderRadius: 18 },
  dashedText: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 13, letterSpacing: 0.6 },
  cover: { height: 170, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 20, backgroundColor: AppColors.surface.dark, padding: 14 },
  coverEmpty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  coverEmptyText: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16, textAlign: 'center' },
  coverActions: { flexDirection: 'row', gap: 8 },
  smallAction: { alignItems: 'center', flexDirection: 'row', gap: 6, borderRadius: 12, backgroundColor: AppColors.surface.default, paddingHorizontal: 10, paddingVertical: 8 },
  smallActionLight: { flex: 1, justifyContent: 'center', backgroundColor: AppColors.surface.softSelected },
  smallActionText: { fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  note: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, borderRadius: 12, backgroundColor: AppColors.surface.input, padding: 12 },
  noteText: { flex: 1, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  videoCard: { gap: 12, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 20, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card, padding: 14 },
  videoThumb: { width: 56, height: 42, borderRadius: 12, backgroundColor: AppColors.surface.darkSelected, alignItems: 'center', justifyContent: 'center' },
  videoThumbOn: { backgroundColor: AppColors.brand.primary },
  textAction: { alignItems: 'center', paddingVertical: 4 },
  textActionLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
