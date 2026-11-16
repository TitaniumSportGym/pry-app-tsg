/** Contracts of the /api/trainer endpoints. */

export interface TrainerClient {
  id: string;
  email: string;
  fullName?: string | null;
  name?: string | null;
}

export interface TrainerClientsResponse {
  clients: TrainerClient[];
}

export interface RoutineExercise {
  id: string;
  name: string;
  description: string | null;
  dayNumber: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  order: number;
  videoUrl: string | null;
  hasVideo: boolean;
  /** youtube (enlace), upload (subido a Cloudinary) o none. */
  videoType?: 'youtube' | 'upload' | 'none' | (string & {});
}

export interface TrainerRoutine {
  id: string;
  title: string;
  objective: string | null;
  description: string | null;
  level: string;
  category: string;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  imageUrl: string | null;
  status: string;
  exercises: RoutineExercise[];
  /** Última edición (ISO), para ordenar y mostrar "Editada hoy". */
  updatedAt?: string | null;
}

export interface TrainerRoutinesResponse {
  routines: TrainerRoutine[];
}

export interface TrainerRoutineResponse {
  routine: TrainerRoutine;
}

export interface TrainerProfile {
  email: string;
  fullName: string;
  phone: string;
  specialty: string;
  certifications: string;
  experienceYears: number;
  bio: string;
  focus?: string;
  /** URL https de Cloudinary; vacía si no hay foto. */
  photoUrl?: string;
}

export interface TrainerProfileResponse {
  profile: TrainerProfile;
}
