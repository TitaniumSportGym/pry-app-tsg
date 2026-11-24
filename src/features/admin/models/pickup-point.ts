/**
 * Configuración del punto de recogida (GET/PUT /api/admin/pickup-settings). El backend responde
 * `{ ok, configured, settings: { name, address, phone, municipality, state, postalCode, hours,
 * instructions, enabled } }`; `hours` es un texto libre. Si la recogida se desactiva, el cliente
 * solo ve envío a domicilio.
 */
export interface PickupSettings {
  enabled: boolean;
  name: string;
  address: string;
  phone: string;
  municipality: string;
  state: string;
  postalCode: string;
  hours: string;
  instructions: string;
}

export type PickupSettingsField = Exclude<keyof PickupSettings, 'enabled'>;
export type PickupSettingsErrors = Partial<Record<PickupSettingsField, string>>;

export const PICKUP_LIMITS = {
  name: 120,
  address: 200,
  phone: 20,
  municipality: 120,
  state: 120,
  postalCode: 5,
  hours: 300,
  instructions: 500,
} as const satisfies Record<PickupSettingsField, number>;

export const EMPTY_PICKUP_SETTINGS: PickupSettings = {
  enabled: true,
  name: '',
  address: '',
  phone: '',
  municipality: '',
  state: '',
  postalCode: '',
  hours: '',
  instructions: '',
};

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function parsePickupSettings(raw: unknown): PickupSettings {
  const settings = isRecord(raw) && isRecord(raw.settings) ? raw.settings : isRecord(raw) ? raw : {};
  return {
    enabled: settings.enabled !== false,
    name: text(settings.name),
    address: text(settings.address),
    phone: text(settings.phone),
    municipality: text(settings.municipality),
    state: text(settings.state),
    postalCode: text(settings.postalCode),
    hours: text(settings.hours),
    instructions: text(settings.instructions),
  };
}

/** Mismas reglas que el backend: nombre, dirección y teléfono obligatorios; CP de 5 dígitos. */
export function validatePickupSettings(settings: PickupSettings): PickupSettingsErrors {
  const errors: PickupSettingsErrors = {};
  if (!settings.name.trim()) errors.name = 'Escribe el nombre del gimnasio.';
  if (!settings.address.trim()) errors.address = 'Escribe la dirección.';
  if (!settings.phone.trim()) errors.phone = 'Escribe el teléfono de contacto.';
  if (!/^\d{5}$/.test(settings.postalCode.trim())) errors.postalCode = 'Escribe un CP de 5 dígitos.';
  for (const [field, limit] of Object.entries(PICKUP_LIMITS) as [PickupSettingsField, number][]) {
    if (!errors[field] && settings[field].trim().length > limit) errors[field] = `Usa hasta ${limit} caracteres.`;
  }
  return errors;
}

export function toPickupSettingsPayload(settings: PickupSettings) {
  return {
    enabled: settings.enabled,
    name: settings.name.trim(),
    address: settings.address.trim(),
    phone: settings.phone.trim(),
    municipality: settings.municipality.trim(),
    state: settings.state.trim(),
    postalCode: settings.postalCode.trim(),
    hours: settings.hours.trim(),
    instructions: settings.instructions.trim(),
  };
}
