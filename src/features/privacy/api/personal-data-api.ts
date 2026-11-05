import {
  parseTrainerProfile,
  validateRectification,
  type RectificationDraft,
} from '@/features/privacy/models/personal-data';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

/** Existing trainer endpoints, inspected in backend routes/trainer/profileRoutes.js. */
export async function getTrainerPersonalProfile(ownerId: string) {
  const response = await apiRequest<unknown>('/api/trainer/profile', { method: 'GET', auth: true });
  return parseTrainerProfile(response, ownerId);
}

export async function rectifyTrainerPersonalProfile(
  ownerId: string,
  draft: RectificationDraft,
  isCurrentSession: () => boolean,
) {
  const { values, errors } = validateRectification(draft);
  if (Object.keys(errors).length) throw new ApiError('Datos de rectificación inválidos.', 400);
  // PUT resets omitted fields in the existing controller. Refresh and preserve them explicitly.
  const { trainerId: _trainerId, ...current } = await getTrainerPersonalProfile(ownerId);
  if (!isCurrentSession()) throw new ApiError('La sesión de esta edición cambió.', 409);
  const response = await apiRequest<unknown>('/api/trainer/profile', {
    method: 'PUT',
    auth: true,
    body: { ...current, ...values },
  });
  const updated = parseTrainerProfile(response, ownerId);
  if (updated.fullName !== values.fullName || updated.phone !== values.phone) {
    throw new ApiError('El servidor no confirmó los datos solicitados.', 502);
  }
  return updated;
}
