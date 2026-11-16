/** Datos del detalle de una rutina, compartidos por el entrenador (86–88) y el administrador (91). */
import { getExerciseVideo, type ExerciseVideo } from '@/features/training/models/exercise-video';
import type { TrainerRoutine } from '@/features/trainer/models/trainer';
import { formatRest, groupExercisesByDay } from '@/features/trainer/models/trainer-presentation';
import {
  getCategoryLabel,
  getLevelLabel,
  getRoutineStatus,
  type StatusTone,
} from '@/features/trainer/models/trainer-routine';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export interface RoutineNotice {
  tone: StatusTone;
  title: string;
  text: string;
}

/** Aviso del detalle para el entrenador según el estado de su rutina. */
export function getTrainerNotice(status: string): RoutineNotice {
  switch (status) {
    case 'pending_review':
      return { tone: 'warning', title: 'El administrador está revisando tu rutina', text: 'Mientras tanto no puedes editarla. Cuando la apruebe, los socios con membresía activa la verán.' };
    case 'published':
      return { tone: 'success', title: 'Publicada', text: 'Los socios con membresía activa ya pueden ver esta rutina.' };
    case 'rejected':
      return { tone: 'error', title: 'El administrador rechazó esta rutina', text: 'Revisa los ejercicios y sus videos, corrígela y vuelve a enviarla a revisión.' };
    case 'archived':
      return { tone: 'neutral', title: 'Archivada', text: 'Los socios ya no la ven. Puedes editarla y enviarla de nuevo a revisión.' };
    default:
      return { tone: 'neutral', title: 'Borrador', text: 'Los socios todavía no ven esta rutina. Envíala a revisión cuando esté lista.' };
  }
}

export interface DetailExercise {
  id: string;
  position: number;
  name: string;
  description: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  video: ExerciseVideo | null;
  /** "Video subido", "Enlace de YouTube" o "Sin video". */
  videoLabel: string;
}

export function toRoutineDetail(routine: TrainerRoutine) {
  const days = groupExercisesByDay(routine.exercises);
  return {
    id: routine.id,
    title: routine.title.toUpperCase(),
    objective: routine.objective ?? '',
    description: routine.description ?? '',
    imageUrl: routine.imageUrl,
    tags: [getCategoryLabel(routine.category), getLevelLabel(routine.level)],
    status: getRoutineStatus(routine.status),
    metrics: [
      { key: 'level', label: 'Nivel', value: getLevelLabel(routine.level) },
      { key: 'weeks', label: 'Duración', value: plural(routine.durationWeeks, 'semana', 'semanas') },
      { key: 'minutes', label: 'Por sesión', value: `${routine.estimatedMinutes} min` },
      { key: 'exercises', label: 'Ejercicios', value: `${routine.exercises.length} · ${plural(days.length, 'día', 'días')}` },
    ],
    videoCount: routine.exercises.filter((exercise) => exercise.hasVideo && exercise.videoUrl).length,
    days: days.map((day) => ({
      dayNumber: day.dayNumber,
      exercises: day.exercises.map((exercise, index): DetailExercise => {
        const video = exercise.hasVideo ? getExerciseVideo(exercise.videoUrl) : null;
        return {
          id: exercise.id,
          position: index + 1,
          name: exercise.name,
          description: exercise.description ?? '',
          sets: String(exercise.sets),
          reps: exercise.reps,
          rest: formatRest(exercise.restSeconds),
          notes: exercise.notes ?? '',
          video,
          videoLabel: !video ? 'Sin video' : exercise.videoType === 'upload' ? 'Video subido' : 'Enlace de video',
        };
      }),
    })),
  };
}

export type RoutineDetail = ReturnType<typeof toRoutineDetail>;
