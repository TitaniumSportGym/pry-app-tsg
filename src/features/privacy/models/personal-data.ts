import { getRoleLabel } from '@/features/account/models/account-menu';
import { parseUserRole } from '@/features/authorization/models/user-role';
import { ApiError, type UserProfileResponse } from '@/types/auth';

export interface TrainerPersonalProfile {
  trainerId: string;
  fullName: string;
  phone: string;
  specialty: string;
  certifications: string;
  experienceYears: number;
  bio: string;
  focus: string;
}

export interface RectificationDraft {
  fullName: string;
  phone: string;
}

export type RectificationErrors = Partial<Record<keyof RectificationDraft, string>>;

const AUTH_METHOD_LABELS = new Map([
  ['normal', 'Contraseña'],
  ['otp', 'Código por correo'],
  ['totp', 'Aplicación autenticadora'],
  ['confirm-link', 'Enlace por correo'],
]);
const PROVIDER_LABELS = new Map([['google', 'Google'], ['local', 'Local']]);

export function validateRectification(draft: RectificationDraft) {
  const values = { fullName: draft.fullName.trim(), phone: draft.phone.trim() };
  const errors: RectificationErrors = {};
  const forbiddenText = (value: string) => Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || '<>'.includes(character));
  if (forbiddenText(values.fullName)) errors.fullName = 'El nombre no debe incluir controles ni etiquetas.';
  if (values.fullName.length > 160) {
    errors.fullName = 'El nombre no debe superar 160 caracteres.';
  }
  if (
    values.phone &&
    (values.phone.length > 30 || forbiddenText(values.phone) || !/^\+?[\d ().-]+$/.test(values.phone) || !/\d/.test(values.phone))
  ) {
    errors.phone = 'Ingresa un teléfono válido de hasta 30 caracteres o deja el campo vacío.';
  }
  return { values, errors };
}

function invalidProfile(): never {
  throw new ApiError('No se pudo verificar la respuesta del perfil.', 502);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whitelist the response: no tokens, secrets or unexpected fields enter the form. */
export function parseTrainerProfile(response: unknown, ownerId: string): TrainerPersonalProfile {
  if (!isRecord(response)) return invalidProfile();
  const profile = response.profile;
  if (!isRecord(profile) || profile.trainerId !== ownerId) {
    return invalidProfile();
  }
  const textFields = ['fullName', 'phone', 'specialty', 'certifications', 'bio', 'focus'] as const;
  const text = {} as Pick<TrainerPersonalProfile, (typeof textFields)[number]>;
  for (const field of textFields) {
    const value = profile[field];
    if (typeof value !== 'string') {
      return invalidProfile();
    }
    text[field] = value;
  }
  if (!Number.isInteger(profile.experienceYears) || Number(profile.experienceYears) < 0) {
    return invalidProfile();
  }
  return { ...text, trainerId: ownerId, experienceYears: Number(profile.experienceYears) };
}

export function personalDataRows(profile: UserProfileResponse) {
  const role = parseUserRole(profile.rol);
  return [
    { label: 'Identificador de cuenta', value: profile.id },
    { label: 'Correo electrónico', value: profile.email },
    { label: 'Rol', value: role ? getRoleLabel(role) : 'No informado' },
    { label: 'Proveedor de cuenta', value: PROVIDER_LABELS.get(profile.provider ?? '') ?? 'No informado' },
    { label: 'Método de autenticación', value: AUTH_METHOD_LABELS.get(profile.authMethod ?? '') ?? 'No informado' },
  ];
}
