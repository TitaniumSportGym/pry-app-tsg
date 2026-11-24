/**
 * Rutinas del entrenador (/api/trainer/routines). Contrato tomado del frontend web: los mismos
 * campos del FormData, el JSON de ejercicios, niveles, categorías y estados. El video subido
 * pertenece a cada ejercicio y se envía aparte, cuando la rutina ya está guardada.
 */
import type { RoutineExercise, TrainerProfile, TrainerRoutine } from '@/features/trainer/models/trainer';
import { toFormDataFile, type PickedFile } from '@/services/media-picker';
import { isUuid } from '@/utils/uuid';

export type RoutineStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type StatusTone = 'neutral' | 'warning' | 'success' | 'error';

const STATUS: Record<RoutineStatus, { label: string; tone: StatusTone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  pending_review: { label: 'En revisión', tone: 'warning' },
  published: { label: 'Publicada', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'error' },
  archived: { label: 'Archivada', tone: 'neutral' },
};

export function getRoutineStatus(status: string) {
  return STATUS[status as RoutineStatus] ?? { label: status || 'Sin estado', tone: 'neutral' as StatusTone };
}

/** En revisión el administrador está evaluando la rutina: no se edita hasta que responda. */
export function canEditRoutine(status: string) {
  return status !== 'pending_review';
}
export function canSubmitRoutine(status: string) {
  return status === 'draft' || status === 'rejected';
}
export function canArchiveRoutine(status: string) {
  return status !== 'archived';
}

export const LEVEL_OPTIONS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'perdida_peso', label: 'Pérdida de peso' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'movilidad', label: 'Movilidad' },
] as const;

export function getLevelLabel(value: string) {
  return LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
export function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
function count(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}
function httpsUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function parseExercise(raw: unknown, index: number): RoutineExercise | null {
  if (!isRecord(raw) || !text(raw.name)) return null;
  const videoType = text(raw.videoType) || (raw.videoUrl ? 'youtube' : 'none');
  return {
    id: typeof raw.id === 'string' ? raw.id : `local-${index}`,
    name: text(raw.name),
    description: text(raw.description) || null,
    dayNumber: Math.max(1, count(raw.dayNumber, 1)),
    sets: count(raw.sets),
    reps: text(raw.reps) || String(count(raw.reps)),
    restSeconds: count(raw.restSeconds),
    notes: text(raw.notes) || null,
    order: count(raw.order, index),
    videoUrl: httpsUrl(raw.videoUrl),
    hasVideo: raw.hasVideo === true,
    videoType,
  };
}

export function parseTrainerRoutine(raw: unknown): TrainerRoutine | null {
  const routine = isRecord(raw) && isRecord(raw.routine) ? raw.routine : raw;
  if (!isRecord(routine) || !isUuid(routine.id) || !text(routine.title)) return null;
  const exercises = (Array.isArray(routine.exercises) ? routine.exercises : [])
    .map((item, index) => parseExercise(item, index))
    .filter((item): item is RoutineExercise => item !== null)
    .sort((a, b) => a.dayNumber - b.dayNumber || a.order - b.order);

  return {
    id: routine.id,
    title: text(routine.title),
    objective: text(routine.objective) || null,
    description: text(routine.description) || null,
    level: text(routine.level).toLowerCase() || 'principiante',
    category: text(routine.category).toLowerCase() || 'general',
    durationWeeks: count(routine.durationWeeks, 1),
    daysPerWeek: count(routine.daysPerWeek, 1),
    estimatedMinutes: count(routine.estimatedMinutes),
    imageUrl: httpsUrl(routine.imageUrl),
    status: text(routine.status) || 'draft',
    exercises,
    updatedAt: text(routine.updatedAt) || text(routine.createdAt) || null,
  };
}

/** Acepta `[...]` o `{ routines: [...] }`; las editadas más recientemente primero. */
export function parseTrainerRoutines(raw: unknown): TrainerRoutine[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.routines) ? raw.routines : [];
  return list
    .map((item) => parseTrainerRoutine(item))
    .filter((routine): routine is TrainerRoutine => routine !== null)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function parseTrainerProfile(raw: unknown): TrainerProfile {
  const profile = isRecord(raw) && isRecord(raw.profile) ? raw.profile : isRecord(raw) ? raw : {};
  return {
    email: text(profile.email),
    fullName: text(profile.fullName),
    phone: text(profile.phone),
    specialty: text(profile.specialty),
    certifications: text(profile.certifications),
    experienceYears: count(profile.experienceYears),
    bio: text(profile.bio),
    focus: text(profile.focus),
    photoUrl: httpsUrl(profile.photoUrl) ?? '',
  };
}

// ---------------------------------------------------------------- formulario de rutina

export interface ExerciseDraft {
  /** Clave local estable para listas; los ejercicios nuevos aún no tienen id del servidor. */
  key: string;
  id: string | null;
  name: string;
  description: string;
  dayNumber: number;
  sets: string;
  reps: string;
  restSeconds: string;
  notes: string;
  videoUrl: string | null;
  videoType: string;
  hasVideo: boolean;
}

export interface RoutineDraft {
  title: string;
  objective: string;
  description: string;
  level: string;
  category: string;
  durationWeeks: string;
  daysPerWeek: string;
  estimatedMinutes: string;
  exercises: ExerciseDraft[];
}

let keySeed = 0;
export const newExerciseKey = () => `ejercicio-${Date.now().toString(36)}-${(keySeed += 1)}`;

export function emptyExerciseDraft(dayNumber = 1): ExerciseDraft {
  return {
    key: newExerciseKey(), id: null, name: '', description: '', dayNumber, sets: '4', reps: '10',
    restSeconds: '60', notes: '', videoUrl: null, videoType: 'none', hasVideo: false,
  };
}

/** Valores iniciales de la web: principiante, general, 4 semanas, 3 días, 45 min. */
export function emptyRoutineDraft(): RoutineDraft {
  return {
    title: '', objective: '', description: '', level: 'principiante', category: 'general',
    durationWeeks: '4', daysPerWeek: '3', estimatedMinutes: '45', exercises: [],
  };
}

export function toRoutineDraft(routine: TrainerRoutine): RoutineDraft {
  return {
    title: routine.title,
    objective: routine.objective ?? '',
    description: routine.description ?? '',
    level: routine.level,
    category: routine.category,
    durationWeeks: String(routine.durationWeeks),
    daysPerWeek: String(routine.daysPerWeek),
    estimatedMinutes: String(routine.estimatedMinutes),
    exercises: routine.exercises.map((exercise) => ({
      key: exercise.id,
      id: isUuid(exercise.id) ? exercise.id : null,
      name: exercise.name,
      description: exercise.description ?? '',
      dayNumber: exercise.dayNumber,
      sets: String(exercise.sets),
      reps: exercise.reps,
      restSeconds: String(exercise.restSeconds),
      notes: exercise.notes ?? '',
      videoUrl: exercise.videoUrl,
      videoType: exercise.videoType ?? (exercise.videoUrl ? 'youtube' : 'none'),
      hasVideo: exercise.hasVideo,
    })),
  };
}

export type RoutineField = 'title' | 'objective' | 'durationWeeks' | 'daysPerWeek' | 'estimatedMinutes' | 'exercises';
export type ExerciseField = 'name' | 'sets' | 'reps' | 'restSeconds' | 'dayNumber' | 'videoUrl';

function inRange(value: string, min: number, max: number) {
  const number = Number(value);
  return /^\d+$/.test(value.trim()) && number >= min && number <= max;
}

export function validateRoutineDetails(draft: RoutineDraft) {
  const errors: Partial<Record<RoutineField, string>> = {};
  if (!draft.title.trim()) errors.title = 'Escribe el nombre de la rutina.';
  else if (draft.title.trim().length > 120) errors.title = 'Usa hasta 120 caracteres.';
  if (draft.objective.trim().length > 200) errors.objective = 'Usa hasta 200 caracteres.';
  if (!inRange(draft.durationWeeks, 1, 52)) errors.durationWeeks = 'De 1 a 52.';
  if (!inRange(draft.daysPerWeek, 1, 7)) errors.daysPerWeek = 'De 1 a 7.';
  if (!inRange(draft.estimatedMinutes, 5, 300)) errors.estimatedMinutes = 'De 5 a 300.';
  return errors;
}

/** Para guardar se piden los datos generales y al menos un ejercicio válido. */
export function validateRoutineDraft(draft: RoutineDraft) {
  const errors = validateRoutineDetails(draft);
  if (draft.exercises.length === 0) errors.exercises = 'Agrega al menos un ejercicio.';
  else if (draft.exercises.some((exercise) => Object.keys(validateExercise(exercise, Number(draft.daysPerWeek) || 7)).length > 0)) {
    errors.exercises = 'Revisa los ejercicios marcados.';
  }
  return errors;
}

export function isSafeVideoLink(value: string) {
  return httpsUrl(value.trim()) !== null;
}

export function validateExercise(exercise: ExerciseDraft, maxDay: number) {
  const errors: Partial<Record<ExerciseField, string>> = {};
  if (!exercise.name.trim()) errors.name = 'Escribe el nombre del ejercicio.';
  if (!inRange(exercise.sets, 1, 20)) errors.sets = 'De 1 a 20.';
  if (!exercise.reps.trim() || exercise.reps.trim().length > 20) errors.reps = 'Ej. 10 o 10-12.';
  if (!inRange(exercise.restSeconds, 0, 600)) errors.restSeconds = 'De 0 a 600 s.';
  if (exercise.dayNumber < 1 || exercise.dayNumber > Math.max(1, maxDay)) errors.dayNumber = `Elige un día del 1 al ${maxDay}.`;
  if (exercise.videoType === 'youtube' && exercise.videoUrl && !isSafeVideoLink(exercise.videoUrl)) {
    errors.videoUrl = 'Pega un enlace que empiece con https://';
  }
  return errors;
}

/** JSON de ejercicios con la misma forma que envía la web. */
export function serializeExercises(exercises: readonly ExerciseDraft[]) {
  return JSON.stringify(
    exercises.map((exercise, index) => ({
      id: exercise.id,
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      dayNumber: exercise.dayNumber,
      sets: Number(exercise.sets),
      reps: exercise.reps.trim(),
      restSeconds: Number(exercise.restSeconds),
      notes: exercise.notes.trim(),
      order: index,
      videoUrl: exercise.videoUrl,
      videoType: exercise.videoType,
      hasVideo: exercise.hasVideo,
    })),
  );
}

/** FormData de POST/PUT /api/trainer/routines (campos en el mismo orden que la web). */
export function buildRoutineFormData(draft: RoutineDraft, status: RoutineStatus, image?: PickedFile | null) {
  const form = new FormData();
  form.append('title', draft.title.trim());
  form.append('objective', draft.objective.trim());
  form.append('description', draft.description.trim());
  form.append('level', draft.level);
  form.append('category', draft.category);
  form.append('durationWeeks', String(Number(draft.durationWeeks)));
  form.append('daysPerWeek', String(Number(draft.daysPerWeek)));
  form.append('estimatedMinutes', String(Number(draft.estimatedMinutes)));
  form.append('status', status);
  form.append('exercises', serializeExercises(draft.exercises));
  if (image) form.append('image', toFormDataFile(image));
  return form;
}

// ---------------------------------------------------------------- perfil

export type ProfileDraft = Pick<TrainerProfile, 'fullName' | 'phone' | 'specialty' | 'certifications' | 'bio'> & {
  experienceYears: string;
  focus: string;
};

export function toProfileDraft(profile: TrainerProfile): ProfileDraft {
  return {
    fullName: profile.fullName,
    phone: profile.phone,
    specialty: profile.specialty,
    certifications: profile.certifications,
    bio: profile.bio,
    focus: profile.focus ?? '',
    experienceYears: String(profile.experienceYears ?? 0),
  };
}

export function validateProfile(draft: ProfileDraft) {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};
  if (!draft.fullName.trim()) errors.fullName = 'Escribe tu nombre completo.';
  if (draft.phone.trim() && draft.phone.replace(/\D/g, '').length !== 10) errors.phone = 'Escribe un teléfono de 10 dígitos.';
  if (!draft.specialty.trim()) errors.specialty = 'Escribe tu especialidad.';
  if (!inRange(draft.experienceYears || '0', 0, 60)) errors.experienceYears = 'De 0 a 60.';
  if (draft.bio.trim().length > 600) errors.bio = 'Usa hasta 600 caracteres.';
  return errors;
}

/** FormData de PUT /api/trainer/profile; la foto es opcional. */
export function buildProfileFormData(draft: ProfileDraft, photo?: PickedFile | null) {
  const form = new FormData();
  form.append('fullName', draft.fullName.trim());
  form.append('phone', draft.phone.replace(/\D/g, ''));
  form.append('specialty', draft.specialty.trim());
  form.append('certifications', draft.certifications.trim());
  form.append('experienceYears', String(Number(draft.experienceYears || '0')));
  form.append('bio', draft.bio.trim());
  form.append('focus', draft.focus.trim());
  if (photo) form.append('photo', toFormDataFile(photo));
  return form;
}
