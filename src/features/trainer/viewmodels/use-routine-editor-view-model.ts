import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import type { TrainerRoutine } from '@/features/trainer/models/trainer';
import {
  emptyExerciseDraft,
  emptyRoutineDraft,
  isSafeVideoLink,
  toRoutineDraft,
  validateExercise,
  validateRoutineDetails,
  validateRoutineDraft,
  type ExerciseDraft,
  type ExerciseField,
  type RoutineDraft,
  type RoutineStatus,
} from '@/features/trainer/models/trainer-routine';
import { trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { trainerRoutinesRepository } from '@/features/trainer/repositories/trainer-routines-repository';
import { pickImage, pickVideo, type PickedFile } from '@/services/media-picker';
import { isUploadCancelled } from '@/services/upload-client';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

export const EDITOR_STEPS = ['Datos', 'Ejercicios', 'Portada y videos'] as const;
const STEP_SUBTITLES = ['Datos generales', 'Ejercicios', 'Portada y videos'];
type DetailField = 'title' | 'objective' | 'description' | 'level' | 'category' | 'durationWeeks' | 'daysPerWeek' | 'estimatedMinutes';
const NUMERIC: readonly string[] = ['durationWeeks', 'daysPerWeek', 'estimatedMinutes'];

export interface UploadState {
  label: string;
  /** 0 a 1; null mientras se prepara el envío. */
  fraction: number | null;
  sizeLabel: string | null;
}

/**
 * Pantallas 80–85 · Nueva / Editar rutina. Igual que la web: los videos se suben a ejercicios
 * que ya existen, así que al terminar el paso 2 la rutina se guarda como borrador.
 */
export function useRoutineEditorViewModel(routineId?: string) {
  const editingId = isUuid(routineId) ? routineId : null;
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'not-found'>(editingId ? 'loading' : 'ready');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RoutineDraft>(emptyRoutineDraft);
  const [routine, setRoutine] = useState<TrainerRoutine | null>(null);
  const [cover, setCover] = useState<PickedFile | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [exercisesSubmitted, setExercisesSubmitted] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [editor, setEditor] = useState<{ exercise: ExerciseDraft; isNew: boolean; submitted: boolean } | null>(null);
  const [saving, setSaving] = useState<'next' | 'draft' | 'submit' | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    trainerRepository
      .getRoutine(editingId, { force: true })
      .then((loaded) => {
        if (!active) return;
        setRoutine(loaded);
        setDraft(toRoutineDraft(loaded));
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('not-found');
      });
    return () => {
      active = false;
    };
  }, [editingId]);

  const maxDay = Math.max(1, Math.min(7, Number(draft.daysPerWeek) || 1));
  const detailErrors = detailsSubmitted ? validateRoutineDetails(draft) : {};
  const exerciseErrors = exercisesSubmitted ? validateRoutineDraft(draft).exercises ?? null : null;

  /** Estado al guardar: lo nuevo o rechazado vuelve a borrador; lo demás conserva su estado (como la web). */
  const saveStatus: RoutineStatus =
    !routine || routine.status === 'rejected' || routine.status === 'archived' ? 'draft' : (routine.status as RoutineStatus);

  function applyServer(saved: TrainerRoutine) {
    setRoutine(saved);
    setDraft((current) => ({ ...current, exercises: toRoutineDraft(saved).exercises }));
  }

  async function withUpload<T>(label: string, file: PickedFile | null, task: (signal: AbortSignal, onProgress: (f: number) => void) => Promise<T>) {
    const abort = new AbortController();
    controller.current = abort;
    const sizeLabel = file?.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : null;
    if (file) setUpload({ label, fraction: 0, sizeLabel });
    try {
      return await task(abort.signal, (fraction) => setUpload((current) => (current ? { ...current, fraction } : current)));
    } finally {
      controller.current = null;
      setUpload(null);
    }
  }

  /** Guarda la rutina (POST si es nueva, PUT si ya existe), con la portada si se eligió una. */
  async function persist(kind: 'next' | 'draft' | 'submit') {
    setSaving(kind);
    setError(null);
    try {
      const saved = await withUpload('Subiendo la portada', cover, (signal, onProgress) =>
        trainerRoutinesRepository.saveRoutine(draft, { routineId: routine?.id, status: saveStatus, image: cover, signal, onProgress }),
      );
      applyServer(saved);
      setCover(null);
      return saved;
    } catch (caught) {
      if (!isUploadCancelled(caught)) setError(getApiErrorMessage(caught, 'No pudimos guardar la rutina. Revisa tu conexión e inténtalo de nuevo.'));
      return null;
    } finally {
      setSaving(null);
    }
  }

  function updateExerciseVideo(key: string, task: (routineId: string, exerciseId: string) => Promise<TrainerRoutine>, fallback: string) {
    const exercise = draft.exercises.find((item) => item.key === key);
    if (!routine || !exercise?.id) {
      setVideoErrors((current) => ({ ...current, [key]: 'Guarda la rutina antes de agregar videos.' }));
      return Promise.resolve();
    }
    setVideoErrors((current) => ({ ...current, [key]: '' }));
    return task(routine.id, exercise.id)
      .then(applyServer)
      .catch((caught) => {
        if (!isUploadCancelled(caught)) setVideoErrors((current) => ({ ...current, [key]: getApiErrorMessage(caught, fallback) }));
      });
  }

  const visibleExercises = draft.exercises.filter((exercise) => exercise.dayNumber === selectedDay);

  return {
    loadState,
    isEditing: Boolean(editingId),
    title: editingId ? 'EDITAR RUTINA' : 'NUEVA RUTINA',
    subtitle: `Paso ${step + 1} de 3 · ${STEP_SUBTITLES[step]}`,
    steps: EDITOR_STEPS,
    step,
    draft,
    detailErrors,
    exerciseErrors,
    maxDay,
    days: Array.from({ length: maxDay }, (_, index) => ({
      day: index + 1,
      count: draft.exercises.filter((exercise) => exercise.dayNumber === index + 1).length,
    })),
    selectedDay,
    visibleExercises: visibleExercises.map((exercise) => ({
      ...exercise,
      position: draft.exercises.indexOf(exercise) + 1,
      invalid: exercisesSubmitted && Object.keys(validateExercise(exercise, maxDay)).length > 0,
    })),
    editor: editor
      ? {
          exercise: editor.exercise,
          isNew: editor.isNew,
          errors: editor.submitted ? validateExercise(editor.exercise, maxDay) : {},
        }
      : null,
    coverUri: cover?.uri ?? routine?.imageUrl ?? null,
    coverError,
    hasPendingCover: Boolean(cover),
    exercisesForVideo: draft.exercises.map((exercise) => ({
      key: exercise.key,
      name: exercise.name,
      day: exercise.dayNumber,
      saved: Boolean(exercise.id),
      videoType: exercise.hasVideo ? exercise.videoType : 'none',
      videoUrl: exercise.videoUrl,
      link: linkDrafts[exercise.key] ?? '',
      error: videoErrors[exercise.key] || null,
    })),
    saving,
    upload,
    error,
    isBusy: saving !== null || upload !== null,
    // ---- paso 1
    setField(field: DetailField, value: string) {
      const clean = NUMERIC.includes(field) ? value.replace(/\D/g, '').slice(0, 3) : value;
      setDraft((current) => ({ ...current, [field]: clean }));
    },
    // ---- paso 2
    selectDay: setSelectedDay,
    addExercise() {
      setEditor({ exercise: emptyExerciseDraft(selectedDay), isNew: true, submitted: false });
    },
    editExercise(key: string) {
      const exercise = draft.exercises.find((item) => item.key === key);
      if (exercise) setEditor({ exercise: { ...exercise }, isNew: false, submitted: false });
    },
    setExerciseField(field: ExerciseField | 'description' | 'notes', value: string | number) {
      setEditor((current) => {
        if (!current) return current;
        const numeric = field === 'sets' || field === 'restSeconds';
        const next = numeric ? String(value).replace(/\D/g, '').slice(0, 3) : value;
        const exercise = { ...current.exercise, [field]: next };
        if (field === 'videoUrl') {
          const url = String(value).trim();
          Object.assign(exercise, url ? { videoUrl: url, videoType: 'youtube', hasVideo: true } : { videoUrl: null, videoType: 'none', hasVideo: false });
        }
        return { ...current, exercise };
      });
    },
    saveExercise() {
      if (!editor) return;
      if (Object.keys(validateExercise(editor.exercise, maxDay)).length > 0) {
        setEditor({ ...editor, submitted: true });
        return;
      }
      setDraft((current) => ({
        ...current,
        exercises: editor.isNew
          ? [...current.exercises, editor.exercise]
          : current.exercises.map((item) => (item.key === editor.exercise.key ? editor.exercise : item)),
      }));
      setSelectedDay(editor.exercise.dayNumber);
      setEditor(null);
    },
    cancelExercise() {
      setEditor(null);
    },
    removeExercise(key: string) {
      setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.key !== key) }));
    },
    // ---- paso 3
    async pickCover() {
      setCoverError(null);
      const result = await pickImage([16, 9]);
      if (result.status === 'picked') setCover(result.file);
      else if (result.status === 'invalid') setCoverError(result.message);
    },
    removeCover() {
      setCover(null);
    },
    async uploadVideo(key: string) {
      const result = await pickVideo();
      if (result.status === 'invalid') {
        setVideoErrors((current) => ({ ...current, [key]: result.message }));
        return;
      }
      if (result.status !== 'picked') return;
      const exercise = draft.exercises.find((item) => item.key === key);
      await updateExerciseVideo(
        key,
        (id, exerciseId) =>
          withUpload(`Subiendo video · ${exercise?.name ?? 'ejercicio'}`, result.file, (signal, onProgress) =>
            trainerRoutinesRepository.uploadExerciseVideo(id, exerciseId, result.file, { signal, onProgress }),
          ),
        'No pudimos subir el video. Inténtalo de nuevo.',
      );
    },
    setLink(key: string, value: string) {
      setLinkDrafts((current) => ({ ...current, [key]: value }));
    },
    async saveLink(key: string) {
      const url = (linkDrafts[key] ?? '').trim();
      if (!isSafeVideoLink(url)) {
        setVideoErrors((current) => ({ ...current, [key]: 'Pega un enlace que empiece con https://' }));
        return;
      }
      await updateExerciseVideo(key, (id, exerciseId) => trainerRoutinesRepository.setExerciseVideoUrl(id, exerciseId, url), 'No pudimos guardar el enlace.');
      setLinkDrafts((current) => ({ ...current, [key]: '' }));
    },
    removeVideo(key: string) {
      return updateExerciseVideo(key, (id, exerciseId) => trainerRoutinesRepository.removeExerciseVideo(id, exerciseId), 'No pudimos quitar el video.');
    },
    cancelUpload() {
      controller.current?.abort();
    },
    // ---- navegación
    async next() {
      if (step === 0) {
        setDetailsSubmitted(true);
        if (Object.keys(validateRoutineDetails(draft)).length > 0) return;
        setSelectedDay((day) => Math.min(day, maxDay));
        setStep(1);
        return;
      }
      if (step === 1) {
        setExercisesSubmitted(true);
        if (Object.keys(validateRoutineDraft(draft)).length > 0) return;
        if (await persist('next')) setStep(2);
      }
    },
    back() {
      if (editor) setEditor(null);
      else if (step > 0) setStep(step - 1);
      else if (router.canGoBack()) router.back();
      else router.replace('/trainer/routines');
    },
    async finish(submit: boolean) {
      const saved = await persist(submit ? 'submit' : 'draft');
      if (!saved) return;
      if (submit) {
        try {
          setSaving('submit');
          await trainerRoutinesRepository.submitRoutine(saved.id);
        } catch (caught) {
          setError(getApiErrorMessage(caught, 'Se guardó la rutina, pero no pudimos enviarla a revisión.'));
          setSaving(null);
          return;
        }
        setSaving(null);
      }
      router.replace({ pathname: '/trainer/routines/[id]', params: { id: saved.id } });
    },
  };
}
