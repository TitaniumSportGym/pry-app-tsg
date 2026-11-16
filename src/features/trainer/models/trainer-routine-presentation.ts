/** Textos de las rutinas del entrenador que comparten la lista, el detalle y el inicio. */
import { formatRelativeDateTime, parseDate } from '@/features/admin/models/admin-format';
import type { TrainerRoutine } from '@/features/trainer/models/trainer';
import {
  getCategoryLabel,
  getLevelLabel,
  getRoutineStatus,
} from '@/features/trainer/models/trainer-routine';

export type RoutineFilter = 'all' | 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export const ROUTINE_FILTERS: { value: RoutineFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'pending_review', label: 'En revisión' },
  { value: 'published', label: 'Publicadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'archived', label: 'Archivadas' },
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "Editada hoy · 10:20 a.m." o "Editada 2 nov 2026 · 9:00 a.m.". */
export function formatEdited(routine: Pick<TrainerRoutine, 'updatedAt'>, now = new Date()) {
  const date = parseDate(routine.updatedAt);
  return date ? `Editada ${formatRelativeDateTime(date, now)}` : '';
}

/** Acción de la tarjeta según el estado: continuar un borrador, corregir un rechazo o verla. */
export function getRoutineAction(status: string) {
  if (status === 'draft') return 'Continuar';
  if (status === 'rejected') return 'Corregir';
  return 'Ver rutina';
}

export function toRoutineCardItem(routine: TrainerRoutine, now = new Date()) {
  return {
    id: routine.id,
    title: routine.title,
    objective: routine.objective ?? '',
    imageUrl: routine.imageUrl,
    tags: [getCategoryLabel(routine.category), getLevelLabel(routine.level)],
    status: getRoutineStatus(routine.status),
    minutes: `${routine.estimatedMinutes} min`,
    days: plural(routine.daysPerWeek, 'día', 'días'),
    exercises: String(routine.exercises.length),
    meta: formatEdited(routine, now),
    action: getRoutineAction(routine.status),
  };
}

export type RoutineCardItem = ReturnType<typeof toRoutineCardItem>;

export function matchesRoutine(routine: TrainerRoutine, filter: RoutineFilter, query: string) {
  if (filter !== 'all' && routine.status !== filter) return false;
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [routine.title, routine.objective ?? '', routine.description ?? ''].some((value) =>
    value.toLowerCase().includes(text),
  );
}

/** "4 rutinas · 1 en revisión" */
export function summarizeRoutines(routines: readonly TrainerRoutine[]) {
  const inReview = routines.filter((routine) => routine.status === 'pending_review').length;
  return [plural(routines.length, 'rutina', 'rutinas'), inReview ? `${inReview} en revisión` : ''].filter(Boolean).join(' · ');
}

export function countByStatus(routines: readonly TrainerRoutine[]) {
  const counts = { draft: 0, pending_review: 0, published: 0, rejected: 0, archived: 0 };
  for (const routine of routines) {
    if (routine.status in counts) counts[routine.status as keyof typeof counts] += 1;
  }
  return counts;
}
