/**
 * Direcciones de envío del cliente (/api/addresses/me). Solo se usan para productos;
 * las membresías no requieren dirección. El backend no guarda un alias ("Casa"), así que
 * la dirección se identifica por su calle y número.
 */
import { isUuid } from '@/utils/uuid';

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  /** Texto de 5 dígitos para conservar ceros iniciales (06000). */
  postalCode: string;
  state: string;
  municipality: string;
  neighborhood: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  references: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'interiorNumber' | 'references'> & {
  interiorNumber: string;
  references: string;
};

export type AddressField = Exclude<keyof AddressInput, 'isDefault'>;
export type AddressErrors = Partial<Record<AddressField, string>>;

export const EMPTY_ADDRESS_INPUT: AddressInput = {
  recipientName: '',
  phone: '',
  postalCode: '',
  state: '',
  municipality: '',
  neighborhood: '',
  street: '',
  exteriorNumber: '',
  interiorNumber: '',
  references: '',
  isDefault: false,
};

export const PHONE_DIGITS = 10;
export const POSTAL_CODE_DIGITS = 5;
const MAX_TEXT = 120;
/** El backend exige referencias y acepta hasta 500 caracteres. */
export const MAX_REFERENCES = 500;

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function optionalText(value: unknown) {
  return text(value) || null;
}

export function parseAddress(raw: unknown): Address | null {
  if (!isRecord(raw) || !isUuid(raw.id)) return null;

  return {
    id: raw.id,
    recipientName: text(raw.recipientName),
    phone: text(raw.phone),
    postalCode: text(raw.postalCode),
    state: text(raw.state),
    municipality: text(raw.municipality),
    neighborhood: text(raw.neighborhood),
    street: text(raw.street),
    exteriorNumber: text(raw.exteriorNumber),
    interiorNumber: optionalText(raw.interiorNumber),
    references: optionalText(raw.references),
    isDefault: raw.isDefault === true,
  };
}

/** Acepta `[...]`, `{ addresses: [...] }` o `{ data: [...] }`; la predeterminada va primero. */
export function parseAddresses(raw: unknown): Address[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.addresses)
      ? raw.addresses
      : isRecord(raw) && Array.isArray(raw.data)
        ? raw.data
        : [];

  return list
    .map(parseAddress)
    .filter((address): address is Address => address !== null)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** La respuesta de crear/editar trae `{ ok, address }`. */
export function parseSavedAddress(raw: unknown): Address | null {
  return parseAddress(isRecord(raw) && isRecord(raw.address) ? raw.address : raw);
}

export function toAddressInput(address: Address): AddressInput {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    postalCode: address.postalCode,
    state: address.state,
    municipality: address.municipality,
    neighborhood: address.neighborhood,
    street: address.street,
    exteriorNumber: address.exteriorNumber,
    interiorNumber: address.interiorNumber ?? '',
    references: address.references ?? '',
    isDefault: address.isDefault,
  };
}

/** Solo dígitos y con tope: para teléfono y código postal mientras se escriben. */
export function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, '').slice(0, max);
}

const REQUIRED: [AddressField, string][] = [
  ['recipientName', 'Escribe el nombre de quien recibe.'],
  ['state', 'Escribe el estado.'],
  ['municipality', 'Escribe el municipio.'],
  ['neighborhood', 'Escribe la colonia.'],
  ['street', 'Escribe la calle.'],
  ['exteriorNumber', 'Escribe el número exterior.'],
];

/** Las mismas reglas que valida el backend, para avisar antes de enviar. */
export function validateAddressInput(input: AddressInput): AddressErrors {
  const errors: AddressErrors = {};

  for (const [field, message] of REQUIRED) {
    if (!input[field].trim()) errors[field] = message;
    else if (input[field].trim().length > MAX_TEXT) errors[field] = 'Usa menos caracteres.';
  }
  if (onlyDigits(input.phone, 99).length !== PHONE_DIGITS) {
    errors.phone = 'Escribe un teléfono de 10 dígitos.';
  }
  if (!/^\d{5}$/.test(input.postalCode)) {
    errors.postalCode = 'Escribe un código postal de 5 dígitos.';
  }
  if (!input.references.trim()) {
    errors.references = 'Escribe una referencia para encontrar el domicilio.';
  } else if (input.references.trim().length > MAX_REFERENCES) {
    errors.references = 'Usa menos de 500 caracteres.';
  }
  return errors;
}

/** Cuerpo para POST/PUT: textos recortados y opcionales vacíos como null. */
export function toAddressPayload(input: AddressInput) {
  return {
    recipientName: input.recipientName.trim(),
    phone: onlyDigits(input.phone, PHONE_DIGITS),
    postalCode: input.postalCode.trim(),
    state: input.state.trim(),
    municipality: input.municipality.trim(),
    neighborhood: input.neighborhood.trim(),
    street: input.street.trim(),
    exteriorNumber: input.exteriorNumber.trim(),
    interiorNumber: input.interiorNumber.trim() || null,
    references: input.references.trim(),
    isDefault: input.isDefault,
  };
}

/** 7711234567 → 771 123 4567 */
export function formatPhone(phone: string) {
  const digits = onlyDigits(phone, PHONE_DIGITS);
  return digits.length === PHONE_DIGITS
    ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : phone;
}

type AddressLike = Pick<
  Address,
  'street' | 'exteriorNumber' | 'interiorNumber' | 'neighborhood' | 'municipality' | 'state' | 'postalCode'
>;

/** "Calle Ejemplo 12, Int. 3": identifica la dirección en tarjetas y resúmenes. */
export function formatAddressTitle(address: Pick<Address, 'street' | 'exteriorNumber' | 'interiorNumber'>) {
  const base = [address.street, address.exteriorNumber].filter(Boolean).join(' ');
  return address.interiorNumber ? `${base}, Int. ${address.interiorNumber}` : base;
}

/** "Huejutla de Reyes, Hidalgo · CP 43000" */
export function formatAddressCity(address: Pick<Address, 'municipality' | 'state' | 'postalCode'>) {
  const place = [address.municipality, address.state].filter(Boolean).join(', ');
  return [place, address.postalCode ? `CP ${address.postalCode}` : ''].filter(Boolean).join(' · ');
}

/** Dirección completa en una línea, para el detalle del pedido. */
export function formatAddressLine(address: AddressLike) {
  return [
    formatAddressTitle(address),
    address.neighborhood ? `Col. ${address.neighborhood}` : '',
    formatAddressCity(address),
  ]
    .filter(Boolean)
    .join(', ');
}
