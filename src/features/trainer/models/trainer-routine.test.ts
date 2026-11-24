import {
  buildProfileFormData,
  buildRoutineFormData,
  canArchiveRoutine,
  canEditRoutine,
  canSubmitRoutine,
  emptyExerciseDraft,
  emptyRoutineDraft,
  getCategoryLabel,
  getLevelLabel,
  getRoutineStatus,
  isSafeVideoLink,
  parseTrainerProfile,
  parseTrainerRoutine,
  parseTrainerRoutines,
  serializeExercises,
  toProfileDraft,
  toRoutineDraft,
  validateExercise,
  validateProfile,
  validateRoutineDetails,
  validateRoutineDraft,
  type RoutineDraft,
} from './trainer-routine';

const ID = '30cdac88-08ac-42e0-9c26-d52b3e295f84';
const EXERCISE_ID = '7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';

const rawRoutine = {
  id: ID,
  title: '  Fuerza base ',
  objective: 'Ganar fuerza',
  level: 'Intermedio',
  category: 'FUERZA',
  durationWeeks: '6',
  daysPerWeek: 3,
  estimatedMinutes: -5,
  imageUrl: 'http://inseguro.test/a.jpg',
  status: 'pending_review',
  updatedAt: '2026-11-10T10:00:00.000Z',
  exercises: [
    { id: 'b', name: 'Remo', dayNumber: 2, order: 0, sets: 3, reps: 12, restSeconds: 90 },
    { id: EXERCISE_ID, name: 'Sentadilla', dayNumber: 1, order: 1, sets: 4, reps: '8-10', restSeconds: 120, videoUrl: 'https://youtu.be/abc', hasVideo: true },
    { name: '' },
    'no es un ejercicio',
  ],
};

function validDraft(): RoutineDraft {
  return { ...emptyRoutineDraft(), title: 'Fuerza', exercises: [{ ...emptyExerciseDraft(1), name: 'Sentadilla' }] };
}

describe('Rutinas del entrenador — estados y catálogos', () => {
  it('traduce estados y define qué acciones se permiten', () => {
    expect(getRoutineStatus('pending_review')).toEqual({ label: 'En revisión', tone: 'warning' });
    expect(getRoutineStatus('rejected')).toEqual({ label: 'Rechazada', tone: 'error' });
    expect(getRoutineStatus('')).toEqual({ label: 'Sin estado', tone: 'neutral' });
    expect(canEditRoutine('pending_review')).toBe(false);
    expect(canEditRoutine('published')).toBe(true);
    expect(canSubmitRoutine('draft')).toBe(true);
    expect(canSubmitRoutine('rejected')).toBe(true);
    expect(canSubmitRoutine('published')).toBe(false);
    expect(canArchiveRoutine('archived')).toBe(false);
    expect(getLevelLabel('avanzado')).toBe('Avanzado');
    expect(getCategoryLabel('perdida_peso')).toBe('Pérdida de peso');
    expect(getCategoryLabel('otra')).toBe('otra');
  });
});

describe('Rutinas del entrenador — parsers', () => {
  it('normaliza la rutina, descarta URLs inseguras y ordena los ejercicios por día', () => {
    const routine = parseTrainerRoutine({ routine: rawRoutine });
    expect(routine).toMatchObject({
      id: ID,
      title: 'Fuerza base',
      level: 'intermedio',
      category: 'fuerza',
      durationWeeks: 6,
      estimatedMinutes: 0,
      imageUrl: null,
      status: 'pending_review',
    });
    expect(routine?.exercises.map((exercise) => exercise.name)).toEqual(['Sentadilla', 'Remo']);
    expect(routine?.exercises[0]).toMatchObject({ videoUrl: 'https://youtu.be/abc', videoType: 'youtube', hasVideo: true });
    expect(routine?.exercises[1]).toMatchObject({ reps: '12', videoUrl: null, videoType: 'none' });
  });

  it('rechaza rutinas sin id UUID o sin título', () => {
    expect(parseTrainerRoutine({ ...rawRoutine, id: '12' })).toBeNull();
    expect(parseTrainerRoutine({ ...rawRoutine, title: ' ' })).toBeNull();
    expect(parseTrainerRoutine(null)).toBeNull();
  });

  it('acepta lista o { routines } y ordena por edición más reciente', () => {
    const older = { ...rawRoutine, id: EXERCISE_ID, title: 'Antigua', updatedAt: '2026-01-01T00:00:00.000Z' };
    expect(parseTrainerRoutines({ routines: [older, rawRoutine, { id: 'x' }] }).map((r) => r.title)).toEqual(['Fuerza base', 'Antigua']);
    expect(parseTrainerRoutines([older])).toHaveLength(1);
    expect(parseTrainerRoutines('nada')).toEqual([]);
  });

  it('lee el perfil vacío o con datos', () => {
    expect(parseTrainerProfile({ profile: {} })).toMatchObject({ fullName: '', photoUrl: '', experienceYears: 0 });
    expect(parseTrainerProfile({ fullName: ' Rogelio ', photoUrl: 'https://cdn.test/p.jpg', experienceYears: '5' })).toMatchObject({
      fullName: 'Rogelio',
      photoUrl: 'https://cdn.test/p.jpg',
      experienceYears: 5,
    });
  });
});

describe('Rutinas del entrenador — formulario', () => {
  it('convierte una rutina en borrador conservando los ids del servidor', () => {
    const draft = toRoutineDraft(parseTrainerRoutine(rawRoutine)!);
    expect(draft).toMatchObject({ title: 'Fuerza base', durationWeeks: '6', daysPerWeek: '3' });
    expect(draft.exercises[0]).toMatchObject({ id: EXERCISE_ID, sets: '4', videoType: 'youtube' });
    expect(draft.exercises[1].id).toBeNull();
  });

  it('valida los datos generales con los mismos rangos que la web', () => {
    expect(validateRoutineDetails(emptyRoutineDraft())).toEqual({ title: 'Escribe el nombre de la rutina.' });
    expect(
      validateRoutineDetails({ ...emptyRoutineDraft(), title: 'x'.repeat(121), objective: 'y'.repeat(201), durationWeeks: '0', daysPerWeek: '8', estimatedMinutes: '4' }),
    ).toEqual({
      title: 'Usa hasta 120 caracteres.',
      objective: 'Usa hasta 200 caracteres.',
      durationWeeks: 'De 1 a 52.',
      daysPerWeek: 'De 1 a 7.',
      estimatedMinutes: 'De 5 a 300.',
    });
  });

  it('pide al menos un ejercicio válido para guardar', () => {
    expect(validateRoutineDraft({ ...validDraft(), exercises: [] }).exercises).toBe('Agrega al menos un ejercicio.');
    expect(validateRoutineDraft({ ...validDraft(), exercises: [emptyExerciseDraft(1)] }).exercises).toBe('Revisa los ejercicios marcados.');
    expect(validateRoutineDraft(validDraft())).toEqual({});
  });

  it('valida cada ejercicio y solo acepta enlaces https', () => {
    const exercise = { ...emptyExerciseDraft(5), name: '', sets: '0', reps: '', restSeconds: '700', videoType: 'youtube', videoUrl: 'http://x.test' };
    expect(validateExercise(exercise, 3)).toEqual({
      name: 'Escribe el nombre del ejercicio.',
      sets: 'De 1 a 20.',
      reps: 'Ej. 10 o 10-12.',
      restSeconds: 'De 0 a 600 s.',
      dayNumber: 'Elige un día del 1 al 3.',
      videoUrl: 'Pega un enlace que empiece con https://',
    });
    expect(isSafeVideoLink(' https://youtu.be/abc ')).toBe(true);
    expect(isSafeVideoLink('javascript:alert(1)')).toBe(false);
  });

  it('serializa los ejercicios con la forma de la web', () => {
    const draft = validDraft();
    expect(JSON.parse(serializeExercises(draft.exercises))).toEqual([
      expect.objectContaining({ id: null, name: 'Sentadilla', sets: 4, reps: '10', restSeconds: 60, order: 0, videoType: 'none', hasVideo: false }),
    ]);
  });

  it('arma el FormData de la rutina y del perfil, con archivo opcional', () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    const file = { uri: 'file:///portada.jpg', name: 'portada.jpg', type: 'image/jpeg', size: 10, durationMs: null };

    buildRoutineFormData(validDraft(), 'draft', file);
    const fields = append.mock.calls.map(([name]) => name);
    expect(fields).toEqual(['title', 'objective', 'description', 'level', 'category', 'durationWeeks', 'daysPerWeek', 'estimatedMinutes', 'status', 'exercises', 'image']);
    expect(append).toHaveBeenCalledWith('image', { uri: file.uri, name: file.name, type: file.type });

    append.mockClear();
    const profile = toProfileDraft(parseTrainerProfile({ fullName: 'Rogelio', phone: '771 123 4567', specialty: 'Fuerza' }));
    buildProfileFormData(profile, null);
    expect(append).toHaveBeenCalledWith('phone', '7711234567');
    expect(append.mock.calls.some(([name]) => name === 'photo')).toBe(false);
    append.mockRestore();
  });

  it('valida el perfil del entrenador', () => {
    const draft = toProfileDraft(parseTrainerProfile({}));
    expect(validateProfile(draft)).toEqual({ fullName: 'Escribe tu nombre completo.', specialty: 'Escribe tu especialidad.' });
    expect(validateProfile({ ...draft, fullName: 'R', specialty: 'F', phone: '123', experienceYears: '61', bio: 'b'.repeat(601) })).toEqual({
      phone: 'Escribe un teléfono de 10 dígitos.',
      experienceYears: 'De 0 a 60.',
      bio: 'Usa hasta 600 caracteres.',
    });
  });
});
