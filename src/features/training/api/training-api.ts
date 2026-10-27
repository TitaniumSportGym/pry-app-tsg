import { parseClientRoutine, parseClientRoutines } from "@/features/training/models/client-routine";
import { apiRequest } from "@/services/apiClient";
import { ApiError } from "@/types/auth";

const NOT_FOUND_MESSAGE = "Rutina no encontrada o no disponible.";

/** Routines available to the signed-in client; requires an active membership. */
export async function getClientRoutines() {
  const response = await apiRequest<{ routines?: unknown }>("/api/client/routines");
  return parseClientRoutines(response?.routines);
}

export async function getClientRoutine(routineId: string) {
  const response = await apiRequest<{ routine?: unknown }>(
    `/api/client/routines/${encodeURIComponent(routineId)}`,
  );
  const routine = parseClientRoutine(response?.routine);

  if (!routine) {
    throw new ApiError(NOT_FOUND_MESSAGE, 404);
  }

  return routine;
}
