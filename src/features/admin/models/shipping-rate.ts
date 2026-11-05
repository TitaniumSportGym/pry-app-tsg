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
