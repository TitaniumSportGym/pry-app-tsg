import { parseAmount } from '@/features/admin/models/admin-format';

/** Tarifa de envío por rango de código postal (/api/admin/shipping-rates). */
export interface ShippingRate {
  id: string;
  name: string;
  postalCodeFrom: string;
  postalCodeTo: string;
  amount: number;
  active: boolean;
}

export function parseShippingRates(raw: unknown): ShippingRate[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    const rate = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    if (!rate || typeof rate.id !== 'string') return [];
    return [
      {
        id: rate.id,
        name: typeof rate.name === 'string' ? rate.name : 'Tarifa sin nombre',
        postalCodeFrom: String(rate.postalCodeFrom ?? ''),
        postalCodeTo: String(rate.postalCodeTo ?? ''),
        amount: parseAmount(rate.amount),
        active: rate.active === true,
      },
    ];
  });
}

/** Activas primero; dentro de cada grupo, de la más barata a la más cara. */
export function sortShippingRates(rates: readonly ShippingRate[]) {
  return [...rates].sort((a, b) => Number(b.active) - Number(a.active) || a.amount - b.amount);
}

/** Formulario de las pantallas 67 y 68 (POST y PATCH /api/admin/shipping-rates). */
export interface ShippingRateInput {
  name: string;
  postalCodeFrom: string;
  postalCodeTo: string;
  /** Texto tal como lo escribe el administrador, p. ej. "149" o "149.50". */
  amount: string;
  active: boolean;
}

export type ShippingRateField = Exclude<keyof ShippingRateInput, 'active'>;
export type ShippingRateErrors = Partial<Record<ShippingRateField, string>>;

export const EMPTY_SHIPPING_RATE_INPUT: ShippingRateInput = {
  name: '',
  postalCodeFrom: '',
  postalCodeTo: '',
  amount: '',
  active: true,
};

const RATE_NAME_MAX = 120;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function toShippingRateInput(rate: ShippingRate): ShippingRateInput {
  return {
    name: rate.name,
    postalCodeFrom: rate.postalCodeFrom,
    postalCodeTo: rate.postalCodeTo,
    amount: rate.amount.toFixed(2),
    active: rate.active,
  };
}

/** Las mismas reglas que el backend, para avisar antes de enviar. */
export function validateShippingRateInput(input: ShippingRateInput): ShippingRateErrors {
  const errors: ShippingRateErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Escribe el nombre de la tarifa.';
  else if (name.length > RATE_NAME_MAX) errors.name = 'Usa hasta 120 caracteres.';
  if (!/^\d{5}$/.test(input.postalCodeFrom)) errors.postalCodeFrom = 'Escribe un CP de 5 dígitos.';
  if (!/^\d{5}$/.test(input.postalCodeTo)) errors.postalCodeTo = 'Escribe un CP de 5 dígitos.';
  else if (!errors.postalCodeFrom && input.postalCodeTo < input.postalCodeFrom) {
    errors.postalCodeTo = 'El CP final debe ser mayor o igual al CP inicial.';
  }
  if (!AMOUNT_PATTERN.test(input.amount.trim())) {
    errors.amount = 'Escribe un importe sin signo, con hasta dos decimales.';
  }
  return errors;
}

export function toShippingRatePayload(input: ShippingRateInput) {
  return {
    name: input.name.trim(),
    postalCodeFrom: input.postalCodeFrom,
    postalCodeTo: input.postalCodeTo,
    amount: Number(input.amount.trim()).toFixed(2),
    active: input.active,
  };
}

/**
 * Otras tarifas activas cuyo rango se cruza con el que se está guardando. El backend no lo
 * impide; la app solo avisa para que el administrador sepa qué cobrará cada CP.
 */
export function findOverlappingRates(
  input: Pick<ShippingRateInput, 'postalCodeFrom' | 'postalCodeTo' | 'active'>,
  rates: readonly ShippingRate[],
  editingId?: string,
) {
  if (!input.active || !/^\d{5}$/.test(input.postalCodeFrom) || !/^\d{5}$/.test(input.postalCodeTo)) return [];
  return rates.filter(
    (rate) =>
      rate.active &&
      rate.id !== editingId &&
      rate.postalCodeFrom <= input.postalCodeTo &&
      input.postalCodeFrom <= rate.postalCodeTo,
  );
}
