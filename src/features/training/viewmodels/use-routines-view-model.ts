import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  filterRoutines,
  formatDaysPerWeek,
  formatMinutes,
  formatRoutineCount,
  getCategoryLabel,
  getLevelLabel,
  getRoutineCategories,
  getRoutineLevels,
  isMembershipRequiredError,
  MAX_ROUTINE_SEARCH_LENGTH,
  sanitizeRoutineSearch,
} from '@/features/training/models/client-routine';
import {
  ROUTINE_KEYS,
  routinesRepository,
} from '@/features/training/repositories/routines-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { usePagination } from '@/hooks/use-pagination';

const SKELETON_DELAY_MS = 300;
/** Routine cards are tall; four keep a page short enough to scroll comfortably. */
const ROUTINES_PER_PAGE = 4;

export type RoutinesScreenState = 'loading' | 'error' | 'locked' | 'empty' | 'ready';

export interface RoutineFilterOption {
  value: string | null;
  label: string;
}

/** Screen 22 · Rutinas: routines of the Titanium team for clients with an active membership. */
export function useRoutinesViewModel() {
  const resource = useAuthorizedResource(routinesRepository.getRoutines, {
    reloadOn: [ROUTINE_KEYS.all],
  });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showLevels, setShowLevels] = useState(false);

  const routines = resource.data ?? [];
  const categories = getRoutineCategories(routines);
  const levels = getRoutineLevels(routines);
  // A filter that no longer matches the data after a refresh is ignored.
  const category = categoryFilter && categories.includes(categoryFilter) ? categoryFilter : null;
  const level = levelFilter && levels.includes(levelFilter) ? levelFilter : null;
  const visible = filterRoutines(routines, { category, level, query });
  const pagination = usePagination(visible, ROUTINES_PER_PAGE, `${category}|${level}|${query}`);

  const isLocked = isMembershipRequiredError(resource.error);
  const state: RoutinesScreenState = resource.isLoading
    ? 'loading'
    : isLocked
      ? 'locked'
      : resource.error
        ? 'error'
        : routines.length === 0
          ? 'empty'
          : 'ready';

  return {
    state,
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isRefreshing: resource.isRefreshing,
    subtitle:
      state === 'ready'
        ? `${formatRoutineCount(routines.length)} del equipo Titanium`
        : '0 rutinas disponibles',
    errorMessage:
      state === 'error'
        ? getAccessErrorMessage(resource.error, 'No encontramos rutinas disponibles.')
        : null,
    query,
    maxQueryLength: MAX_ROUTINE_SEARCH_LENGTH,
    categories: [
      { value: null, label: 'Todas' },
      ...categories.map((value) => ({ value, label: getCategoryLabel(value) })),
    ] satisfies RoutineFilterOption[],
    selectedCategory: category,
    levels: [
      { value: null, label: 'Todos los niveles' },
      ...levels.map((value) => ({ value, label: getLevelLabel(value) })),
    ] satisfies RoutineFilterOption[],
    selectedLevel: level,
    showLevels,
    isFiltering: showLevels || level !== null,
    pagination,
    routines: pagination.pageItems.map((routine) => ({
      id: routine.id,
      title: routine.title,
      objective: routine.objective,
      categoryLabel: getCategoryLabel(routine.category),
      levelLabel: getLevelLabel(routine.level),
      duration: formatMinutes(routine.estimatedMinutes),
      days: formatDaysPerWeek(routine.daysPerWeek),
      trainerEmail: routine.trainerEmail,
      imageUrl: routine.imageUrl,
    })),
    retry: resource.retry,
    refresh: resource.refresh,
    setQuery(value: string) {
      setQuery(sanitizeRoutineSearch(value));
    },
    selectCategory: setCategoryFilter,
    selectLevel: setLevelFilter,
    toggleLevels() {
      setShowLevels((visibleLevels) => !visibleLevels);
    },
    clearFilters() {
      setQuery('');
      setCategoryFilter(null);
      setLevelFilter(null);
    },
    openRoutine(routineId: string) {
      router.push({ pathname: '/account/routines/[id]', params: { id: routineId } });
    },
    openMemberships() {
      router.push('/memberships');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    },
  };
}
