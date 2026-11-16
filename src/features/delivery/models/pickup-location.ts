/**
 * Punto de recogida que el cliente ve al elegir "Recoger en gimnasio" (GET /api/delivery/options).
 * Si la recogida no está disponible el backend responde `pickupLocation: null`.
 */
export interface PickupScheduleEntry {
  label: string;
  hours: string;
}

export interface PickupLocation {
  name: string;
  address: string;
  phone: string;
  /** "Huejutla de Reyes, Hidalgo · CP 43000", si el administrador lo configuró. */
  city: string;
  schedule: PickupScheduleEntry[];
  instructions: string | null;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseEntry(raw: unknown): PickupScheduleEntry | null {
  if (typeof raw === 'string') return raw.trim() ? { label: raw.trim(), hours: '' } : null;
  if (!isRecord(raw)) return null;

  const label = text(raw.label) || text(raw.day) || text(raw.days) || text(raw.name);
  const opens = text(raw.opensAt) || text(raw.open) || text(raw.from);
  const closes = text(raw.closesAt) || text(raw.close) || text(raw.to);
  const hours = text(raw.hours) || text(raw.time) || (opens && closes ? `${opens} – ${closes}` : '');
  return label || hours ? { label: label || 'Horario', hours } : null;
}

/** Los horarios son opcionales y su forma puede variar: texto, lista o mapa día → horas. */
export function parsePickupSchedule(raw: unknown): PickupScheduleEntry[] {
  if (typeof raw === 'string') return raw.trim() ? [{ label: 'Horario', hours: raw.trim() }] : [];
  if (Array.isArray(raw)) {
    return raw.map(parseEntry).filter((entry): entry is PickupScheduleEntry => entry !== null);
  }
  if (isRecord(raw)) {
    return Object.entries(raw)
      .map(([label, hours]) => ({ label, hours: text(hours) }))
      .filter((entry) => entry.hours);
  }
  return [];
}

export function parsePickupLocation(raw: unknown): PickupLocation | null {
  if (!isRecord(raw)) return null;
  const name = text(raw.name);
  const address = text(raw.address);
  if (!name && !address) return null;

  const place = [text(raw.municipality), text(raw.state)].filter(Boolean).join(', ');
  const postalCode = text(raw.postalCode);

  return {
    name: name || 'Titanium Sport Gym',
    address,
    phone: text(raw.phone),
    city: [place, postalCode ? `CP ${postalCode}` : ''].filter(Boolean).join(' · '),
    schedule: parsePickupSchedule(raw.schedule ?? raw.hours ?? raw.openingHours),
    instructions: text(raw.instructions) || null,
  };
}

export function parseDeliveryOptions(raw: unknown): { pickupLocation: PickupLocation | null } {
  return { pickupLocation: isRecord(raw) ? parsePickupLocation(raw.pickupLocation) : null };
}
