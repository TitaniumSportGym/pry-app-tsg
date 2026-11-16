import { parseAdminRoutines, type AdminRoutineDecision } from '@/features/admin/models/admin-routine';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';
import { isUuid } from '@/utils/uuid';

/** Revisión de rutinas: lista y decisiones (aprobar, rechazar, archivar). */

export async function getAdminRoutines() {
  return parseAdminRoutines(await apiRequest<unknown>('/api/admin/routines'));
}

export async function decideAdminRoutine(routineId: string, decision: AdminRoutineDecision) {
  if (!isUuid(routineId)) throw new ApiError('Rutina no encontrada.', 404);
  // El backend no recibe comentario: el cuerpo va vacío, igual que en la web.
  await apiRequest(`/api/admin/routines/${encodeURIComponent(routineId)}/${decision}`, { method: 'PATCH', body: {} });
}
