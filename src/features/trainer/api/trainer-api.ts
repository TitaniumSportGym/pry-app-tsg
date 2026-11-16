import type { TrainerClientsResponse } from "@/features/trainer/models/trainer";
import {
  parseTrainerProfile,
  parseTrainerRoutine,
  parseTrainerRoutines,
} from "@/features/trainer/models/trainer-routine";
import { toFormDataFile, type PickedFile } from "@/services/media-picker";
import { apiRequest } from "@/services/apiClient";
import { uploadRequest, type UploadProgress } from "@/services/upload-client";
import { ApiError } from "@/types/auth";
import { isUuid } from "@/utils/uuid";

/** El backend responde 500 con ids que no son UUID: se validan antes de armar la ruta. */
function routinePath(routineId: string) {
  if (!isUuid(routineId)) throw new ApiError("Rutina no encontrada.", 404);
  return `/api/trainer/routines/${encodeURIComponent(routineId)}`;
}

function exercisePath(routineId: string, exerciseId: string) {
  if (!isUuid(exerciseId)) throw new ApiError("Guarda la rutina antes de agregar videos.", 409);
  return `${routinePath(routineId)}/exercises/${encodeURIComponent(exerciseId)}`;
}

function routineOrThrow(raw: unknown) {
  const routine = parseTrainerRoutine(raw);
  if (!routine) throw new ApiError("El servidor respondió con una rutina no válida.", 502);
  return routine;
}

export async function getTrainerClients() {
  const response = await apiRequest<TrainerClientsResponse>("/api/trainer/clients");
  return Array.isArray(response?.clients) ? response.clients : [];
}

export async function getTrainerRoutines() {
  return parseTrainerRoutines(await apiRequest<unknown>("/api/trainer/routines"));
}

export async function getTrainerRoutine(routineId: string) {
  const routine = parseTrainerRoutine(await apiRequest<unknown>(routinePath(routineId)));
  if (!routine) throw new ApiError("Rutina no encontrada.", 404);
  return routine;
}

export async function getTrainerProfile() {
  return parseTrainerProfile(await apiRequest<unknown>("/api/trainer/profile"));
}

interface UploadCallbacks {
  onProgress?: UploadProgress;
  signal?: AbortSignal;
}

/** Crea la rutina (multipart: datos, ejercicios en JSON e imagen opcional). */
export async function createTrainerRoutine(body: FormData, callbacks: UploadCallbacks = {}) {
  return routineOrThrow(await uploadRequest("/api/trainer/routines", { method: "POST", body, ...callbacks }));
}

export async function updateTrainerRoutine(routineId: string, body: FormData, callbacks: UploadCallbacks = {}) {
  return routineOrThrow(await uploadRequest(routinePath(routineId), { method: "PUT", body, ...callbacks }));
}

export async function deleteTrainerRoutine(routineId: string) {
  await apiRequest(routinePath(routineId), { method: "DELETE" });
}

/** No publica directo: cambia el estado a pending_review hasta que el administrador apruebe. */
export async function submitTrainerRoutine(routineId: string) {
  return routineOrThrow(await apiRequest<unknown>(`${routinePath(routineId)}/publish`, { method: "PATCH" }));
}

export async function archiveTrainerRoutine(routineId: string) {
  return routineOrThrow(await apiRequest<unknown>(`${routinePath(routineId)}/archive`, { method: "PATCH" }));
}

/** Video de un ejercicio ya guardado (campo `video`; MP4, WEBM o MOV de hasta 100 MB). */
export async function uploadExerciseVideo(
  routineId: string,
  exerciseId: string,
  file: PickedFile,
  callbacks: UploadCallbacks = {},
) {
  const body = new FormData();
  body.append("video", toFormDataFile(file));
  return routineOrThrow(
    await uploadRequest(`${exercisePath(routineId, exerciseId)}/video`, { method: "POST", body, ...callbacks }),
  );
}

export async function setExerciseVideoUrl(routineId: string, exerciseId: string, videoUrl: string) {
  return routineOrThrow(
    await apiRequest<unknown>(`${exercisePath(routineId, exerciseId)}/video-url`, {
      method: "PATCH",
      body: { videoUrl },
    }),
  );
}

export async function removeExerciseVideo(routineId: string, exerciseId: string) {
  return routineOrThrow(
    await apiRequest<unknown>(`${exercisePath(routineId, exerciseId)}/video`, { method: "DELETE" }),
  );
}

/** Perfil del entrenador (multipart: datos y foto opcional en el campo `photo`). */
export async function updateTrainerProfile(body: FormData, callbacks: UploadCallbacks = {}) {
  return parseTrainerProfile(await uploadRequest("/api/trainer/profile", { method: "PUT", body, ...callbacks }));
}
