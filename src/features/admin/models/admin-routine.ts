/**
 * Revisión de rutinas del administrador (/api/admin/routines). El backend devuelve las mismas
 * rutinas que crea el entrenador, más los datos de quien la creó. No hay endpoint de detalle:
 * la pantalla de revisión usa la rutina que ya trajo la lista.
 */
import type { TrainerRoutine } from '@/features/trainer/models/trainer';
import { parseTrainerRoutine } from '@/features/trainer/models/trainer-routine';

export type AdminRoutineFilter = 'pending_review' | 'published' | 'rejected' | 'archived';
export type AdminRoutineDecision = 'approve' | 'reject' | 'archive';

export const ADMIN_ROUTINE_FILTERS: { value: AdminRoutineFilter; label: string }[] = [
  { value: 'pending_review', label: 'Por revisar' },
  { value: 'published', label: 'Publicadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'archived', label: 'Archivadas' },
];

export interface AdminRoutine extends TrainerRoutine {
  trainerName: string;
}

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function getTrainerName(raw: Raw) {
  const trainer = isRecord(raw.trainer) ? raw.trainer : {};
  return (
    text(raw.trainerName) ||
    text(trainer.fullName) ||
    text(trainer.name) ||
    text(raw.trainerEmail) ||
    text(trainer.email) ||
    'Entrenador'
  );
}

export function parseAdminRoutine(raw: unknown): AdminRoutine | null {
  const routine = parseTrainerRoutine(raw);
  if (!routine || !isRecord(raw)) return null;
  return { ...routine, trainerName: getTrainerName(raw) };
}

/** Acepta `[...]` o `{ ok, routines: [...] }`; las más recientes primero. */
export function parseAdminRoutines(raw: unknown): AdminRoutine[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.routines) ? raw.routines : [];
  return list
    .map((item) => parseAdminRoutine(item))
    .filter((routine): routine is AdminRoutine => routine !== null)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function countAdminRoutines(routines: readonly AdminRoutine[]) {
  const counts: Record<AdminRoutineFilter, number> = { pending_review: 0, published: 0, rejected: 0, archived: 0 };
  for (const routine of routines) {
    if (routine.status in counts) counts[routine.status as AdminRoutineFilter] += 1;
  }
  return counts;
}

/** Qué decisiones puede tomar el administrador según el estado actual. */
export function getAdminRoutineActions(status: string) {
  return {
    canApprove: status === 'pending_review' || status === 'rejected',
    canReject: status === 'pending_review' || status === 'published',
    canArchive: status === 'published',
  };
}

export const ADMIN_DECISION_COPY: Record<AdminRoutineDecision, { title: string; message: string; confirm: string; error: string }> = {
  approve: {
    title: '¿Aprobar y publicar?',
    message: 'Los socios con membresía activa podrán ver esta rutina.',
    confirm: 'Aprobar',
    error: 'No pudimos aprobar la rutina.',
  },
  reject: {
    title: '¿Rechazar rutina?',
    message: 'El entrenador la verá como rechazada y podrá corregirla y reenviarla.',
    confirm: 'Rechazar',
    error: 'No pudimos rechazar la rutina.',
  },
  archive: {
    title: '¿Archivar rutina?',
    message: 'Los socios dejarán de verla.',
    confirm: 'Archivar',
    error: 'No pudimos archivar la rutina.',
  },
};
