import { router } from 'expo-router';

import { formatTodayLabel } from '@/features/admin/models/admin-format';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { isProfileIncomplete } from '@/features/trainer/models/trainer-presentation';
import { getRoutineStatus } from '@/features/trainer/models/trainer-routine';
import { countByStatus, formatEdited } from '@/features/trainer/models/trainer-routine-presentation';
import { TRAINER_KEYS, trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

async function loadTrainerSummary(options: LoadOptions) {
  const [clients, routines, profile] = await Promise.all([
    trainerRepository.getClients(options),
    trainerRepository.getRoutines(options),
    trainerRepository.getProfile(options),
  ]);
  return { clients, routines, profile };
}

/** Inicio del entrenador: saludo, accesos, estado de sus rutinas y lo reciente. */
export function useTrainerHomeViewModel() {
  const { user } = useAuth();
  const resource = useAuthorizedResource(loadTrainerSummary, { reloadOn: [TRAINER_KEYS.all] });
  const data = resource.data;
  const now = new Date();
  const counts = data ? countByStatus(data.routines) : null;
  const firstName = data?.profile.fullName.trim().split(/\s+/)[0] ?? '';

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, 300),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, 'No encontramos tu información de entrenador.') : null,
    greeting: firstName ? `Hola, ${firstName}` : 'Hola, entrenador',
    today: formatTodayLabel(now),
    email: user?.email ?? '',
    photoUrl: data?.profile.photoUrl || null,
    initials: (data?.profile.fullName || user?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join(''),
    profileIncomplete: data ? isProfileIncomplete(data.profile) : false,
    summary: data && counts
      ? {
          published: counts.published,
          stats: [
            { key: 'published', label: 'Publicadas', value: counts.published, tone: 'success' as const },
            { key: 'pending_review', label: 'En revisión', value: counts.pending_review, tone: 'warning' as const },
            { key: 'draft', label: 'Borradores', value: counts.draft, tone: 'neutral' as const },
            { key: 'clients', label: 'Clientes', value: data.clients.length, tone: 'brand' as const },
          ],
          recent: data.routines.slice(0, 3).map((routine) => ({
            id: routine.id,
            title: routine.title,
            status: getRoutineStatus(routine.status),
            meta: formatEdited(routine, now) || `${routine.exercises.length} ejercicios`,
          })),
          rejected: counts.rejected,
        }
      : null,
    retry: resource.retry,
    refresh: resource.refresh,
    createRoutine() {
      router.push('/trainer/routines/editor');
    },
    openRoutines() {
      router.navigate('/trainer/routines');
    },
    openRoutine(routineId: string) {
      router.push({ pathname: '/trainer/routines/[id]', params: { id: routineId } });
    },
    openClients() {
      router.navigate('/trainer/clients');
    },
    openProfile() {
      router.push('/trainer/account/profile');
    },
  };
}
