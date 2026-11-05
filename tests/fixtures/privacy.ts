import type { TrainerPersonalProfile } from '@/features/privacy/models/personal-data';

export function trainerProfile(overrides: Partial<TrainerPersonalProfile> = {}): TrainerPersonalProfile {
  return {
    trainerId: 'user-1',
    fullName: 'Ana Entrenadora',
    phone: '7711234567',
    specialty: 'Fuerza',
    certifications: 'Certificación vigente',
    experienceYears: 5,
    bio: 'Entrenamiento personalizado',
    focus: 'Técnica y constancia',
    ...overrides,
  };
}
