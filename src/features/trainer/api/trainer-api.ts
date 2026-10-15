import type {
  TrainerClientsResponse,
  TrainerProfileResponse,
  TrainerRoutineResponse,
  TrainerRoutinesResponse,
} from "@/features/trainer/models/trainer";
import { apiRequest } from "@/services/apiClient";

export async function getTrainerClients() {
  const response = await apiRequest<TrainerClientsResponse>("/api/trainer/clients");
  return response.clients;
}

export async function getTrainerRoutines() {
  const response = await apiRequest<TrainerRoutinesResponse>("/api/trainer/routines");
  return response.routines;
}

export async function getTrainerRoutine(routineId: string) {
  const response = await apiRequest<TrainerRoutineResponse>(
    `/api/trainer/routines/${encodeURIComponent(routineId)}`,
  );
  return response.routine;
}

export async function getTrainerProfile() {
  const response = await apiRequest<TrainerProfileResponse>("/api/trainer/profile");
  return response.profile;
}
