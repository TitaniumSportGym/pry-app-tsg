import { router } from 'expo-router';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { isProfileIncomplete } from '@/features/trainer/models/trainer-presentation';
import { trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

async function loadTrainerSummary(options: LoadOptions) {
  const [clients, routines, profile] = await Promise.all([
    trainerRepository.getClients(options),
    trainerRepository.getRoutines(options),
    trainerRepository.getProfile(options),
  ]);

  return {
    clientCount: clients.length,
    routineCount: routines.length,
    publishedRoutineCount: routines.filter((routine) => routine.status === 'published').length,
    profileIncomplete: isProfileIncomplete(profile),
    fullName: profile.fullName.trim(),
  };
}

export function useTrainerHomeViewModel() {
  const { user } = useAuth();
  const summary = useAuthorizedResource(loadTrainerSummary);

  return {
    email: user?.email ?? '',
    summary: summary.data,
    isLoading: summary.isLoading,
    isRefreshing: summary.isRefreshing,
    errorMessage: summary.error
      ? getAccessErrorMessage(summary.error, 'No encontramos tu información de entrenador.')
      : null,
    retry: summary.retry,
    refresh: summary.refresh,
    openClients() {
      router.navigate('/trainer/clients');
    },
    openRoutines() {
      router.navigate('/trainer/routines');
    },
  };
}
