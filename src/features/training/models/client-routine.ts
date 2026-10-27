import type { RoutineExercise } from "@/features/trainer/models/trainer";
import { ApiError } from "@/types/auth";

/**
 * Routines published by the gym's trainers, from /api/client/routines.
 * The backend only returns them while the client has an active membership;
 * otherwise it answers 403 with the MEMBERSHIP_REQUIRED code.
 */

export interface ClientRoutine {
  id: string;
  title: string;
  objective: string;
  description: string;
  level: string;
  category: string;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  imageUrl: string | null;
  /** The API exposes the trainer's email only, not a display name. */
  trainerEmail: string;
  exercises: RoutineExercise[];
}

export interface RoutineFilters {
  category: string | null;
  level: string | null;
  query: string;
}

export const MAX_ROUTINE_SEARCH_LENGTH = 60;

const CATEGORY_LABELS: Record<string, string> = {
  hipertrofia: "Hipertrofia",
  perdida_peso: "Pérdida de peso",
  fuerza: "Fuerza",
  resistencia: "Resistencia",
  movilidad: "Movilidad",
  cardio: "Cardio",
  general: "General",
};

const LEVEL_ORDER = ["principiante", "intermedio", "avanzado"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function toHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function parseExercise(raw: unknown): RoutineExercise | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !text(raw.name)) return null;

  return {
    id: raw.id,
    name: text(raw.name),
    description: text(raw.description) || null,
    dayNumber: toCount(raw.dayNumber) || 1,
    sets: toCount(raw.sets),
    reps: text(raw.reps) || String(toCount(raw.reps)),
    restSeconds: toCount(raw.restSeconds),
    notes: text(raw.notes) || null,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
    videoUrl: toHttpsUrl(raw.videoUrl),
    hasVideo: raw.hasVideo === true,
  };
}

export function parseClientRoutine(raw: unknown): ClientRoutine | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !text(raw.title)) return null;

  const trainer = isRecord(raw.trainer) ? raw.trainer : null;
  const exercises = Array.isArray(raw.exercises) ? raw.exercises : [];

  return {
    id: raw.id,
    title: text(raw.title),
    objective: text(raw.objective),
    description: text(raw.description),
    level: text(raw.level).toLowerCase(),
    category: text(raw.category).toLowerCase(),
    durationWeeks: toCount(raw.durationWeeks),
    daysPerWeek: toCount(raw.daysPerWeek),
    estimatedMinutes: toCount(raw.estimatedMinutes),
    imageUrl: toHttpsUrl(raw.imageUrl),
    trainerEmail: text(raw.trainerEmail) || text(trainer?.email),
    exercises: exercises
      .map(parseExercise)
      .filter((exercise): exercise is RoutineExercise => exercise !== null),
  };
}

export function parseClientRoutines(raw: unknown): ClientRoutine[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(parseClientRoutine)
    .filter((routine): routine is ClientRoutine => routine !== null);
}

/** True when the backend hides the routines because there is no active membership. */
export function isMembershipRequiredError(error: unknown) {
  return error instanceof ApiError && error.status === 403 && error.code === "MEMBERSHIP_REQUIRED";
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

export function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? capitalize(category.replace(/_/g, " "));
}

export function getLevelLabel(level: string) {
  return capitalize(level);
}

/** Categories present in the routines, in the order they first appear. */
export function getRoutineCategories(routines: readonly ClientRoutine[]) {
  return [...new Set(routines.map((routine) => routine.category).filter(Boolean))];
}

/** Levels present in the routines, from beginner to advanced. */
export function getRoutineLevels(routines: readonly ClientRoutine[]) {
  const levels = [...new Set(routines.map((routine) => routine.level).filter(Boolean))];
  const rank = (level: string) => {
    const index = LEVEL_ORDER.indexOf(level);
    return index === -1 ? LEVEL_ORDER.length : index;
  };

  return levels.sort((a, b) => rank(a) - rank(b));
}

export function sanitizeRoutineSearch(query: string) {
  return query.slice(0, MAX_ROUTINE_SEARCH_LENGTH);
}

/** Search matches every word against the title, objective and description, ignoring accents. */
export function filterRoutines(routines: readonly ClientRoutine[], filters: RoutineFilters) {
  const terms = normalize(sanitizeRoutineSearch(filters.query)).split(/\s+/).filter(Boolean);

  return routines.filter((routine) => {
    if (filters.category && routine.category !== filters.category) return false;
    if (filters.level && routine.level !== filters.level) return false;

    const haystack = normalize(`${routine.title} ${routine.objective} ${routine.description}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

export function formatDaysPerWeek(days: number) {
  return `${days} ${days === 1 ? "día" : "días"}`;
}

export function formatWeeks(weeks: number) {
  return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
}

export function formatRoutineCount(count: number) {
  return `${count} ${count === 1 ? "rutina" : "rutinas"}`;
}
