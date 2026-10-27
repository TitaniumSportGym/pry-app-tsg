import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import {
  getTrainerClients,
  getTrainerProfile,
  getTrainerRoutine,
  getTrainerRoutines,
} from '@/features/trainer/api/trainer-api';
import type {
  TrainerClient,
  TrainerProfile,
  TrainerRoutine,
} from '@/features/trainer/models/trainer';

/** The trainer edits this data from the website; two minutes keeps the app close to it. */
const TRAINER_TTL_MS = 2 * 60_000;

export const TRAINER_KEYS = {
  all: 'trainer',
  clients: 'trainer:clients',
  routines: 'trainer:routines',
  routine: (routineId: string) => `trainer:routine:${routineId}`,
  profile: 'trainer:profile',
} as const;

export interface TrainerRepository {
  getClients(options?: ReadOptions): Promise<TrainerClient[]>;
  getRoutines(options?: ReadOptions): Promise<TrainerRoutine[]>;
  getRoutine(routineId: string, options?: ReadOptions): Promise<TrainerRoutine>;
  getProfile(options?: ReadOptions): Promise<TrainerProfile>;
}

export interface TrainerDataSource {
  getTrainerClients(): Promise<TrainerClient[]>;
  getTrainerRoutines(): Promise<TrainerRoutine[]>;
  getTrainerRoutine(routineId: string): Promise<TrainerRoutine>;
  getTrainerProfile(): Promise<TrainerProfile>;
}

const DEFAULT_DATA_SOURCE: TrainerDataSource = {
  getTrainerClients,
  getTrainerRoutines,
  getTrainerRoutine,
  getTrainerProfile,
};

export function createTrainerRepository(
  dataSource: TrainerDataSource = DEFAULT_DATA_SOURCE,
  cache: RepositoryCache = repositoryCache,
): TrainerRepository {
  const read = <T>(key: string, fetcher: () => Promise<T>, options: ReadOptions = {}) =>
    cache.read(key, fetcher, { ...options, ttlMs: TRAINER_TTL_MS });

  return {
    getClients: (options) => read(TRAINER_KEYS.clients, () => dataSource.getTrainerClients(), options),
    getRoutines: (options) =>
      read(TRAINER_KEYS.routines, () => dataSource.getTrainerRoutines(), options),
    getRoutine: (routineId, options) =>
      read(TRAINER_KEYS.routine(routineId), () => dataSource.getTrainerRoutine(routineId), options),
    getProfile: (options) => read(TRAINER_KEYS.profile, () => dataSource.getTrainerProfile(), options),
  };
}

export const trainerRepository = createTrainerRepository();
