import type {
  RoutineExercise,
  TrainerClient,
  TrainerProfile,
} from "@/features/trainer/models/trainer";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROUTINE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicada",
  archived: "Archivada",
};

export interface ExerciseDay {
  dayNumber: number;
  exercises: RoutineExercise[];
}

/** The API answers with a 500 for ids that are not UUIDs, so they are rejected before the request. */
export function isValidResourceId(id: unknown): id is string {
  return typeof id === "string" && UUID_PATTERN.test(id);
}

export function capitalize(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : "";
}

export function getRoutineStatusLabel(status: string) {
  return ROUTINE_STATUS_LABELS[status] ?? capitalize(status);
}

export function formatRoutineSchedule(routine: {
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
}) {
  const weeks = `${routine.durationWeeks} ${routine.durationWeeks === 1 ? "semana" : "semanas"}`;
  const days = `${routine.daysPerWeek} ${routine.daysPerWeek === 1 ? "día" : "días"}/semana`;
  return `${weeks} · ${days} · ${routine.estimatedMinutes} min`;
}

export function formatRest(seconds: number) {
  if (seconds < 60) {
    return `${seconds} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

export function groupExercisesByDay(exercises: readonly RoutineExercise[]): ExerciseDay[] {
  const days = new Map<number, RoutineExercise[]>();

  for (const exercise of exercises) {
    const dayExercises = days.get(exercise.dayNumber) ?? [];
    dayExercises.push(exercise);
    days.set(exercise.dayNumber, dayExercises);
  }

  return [...days.entries()]
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([dayNumber, dayExercises]) => ({
      dayNumber,
      exercises: [...dayExercises].sort((a, b) => a.order - b.order),
    }));
}

/** Only secure links are opened outside the app. */
export function getSafeVideoUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getClientDisplayName(client: TrainerClient) {
  return client.fullName?.trim() || client.name?.trim() || client.email;
}

export function isProfileIncomplete(profile: TrainerProfile) {
  return !profile.fullName.trim() || !profile.specialty.trim();
}
