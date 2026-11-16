/**
 * Cuerpo de PATCH /api/admin/orders/:id/fulfillment. El backend pide `expectedStatus` (el estado
 * que vio el administrador) y rechaza el cambio si el pedido se movió mientras tanto ("El pedido
 * cambió. Actualiza la vista antes de continuar."). Registrar un envío exige paquetería y guía.
 */
import type { FulfillmentStatus } from '@/features/orders/models/fulfillment-status';

export const TRACKING_MAX_LENGTH = 40;
export const NOTE_MAX_LENGTH = 200;

export interface FulfillmentUpdateInput {
  status: FulfillmentStatus;
  expectedStatus: FulfillmentStatus;
  carrier: string;
  trackingNumber: string;
  note: string;
}

export function validateFulfillmentUpdate(input: FulfillmentUpdateInput) {
  const errors: { trackingNumber?: string; carrier?: string } = {};
  if (input.status === 'shipped') {
    if (!input.carrier.trim()) errors.carrier = 'Elige la paquetería.';
    if (!input.trackingNumber.trim()) errors.trackingNumber = 'Escribe el número de guía.';
  }
  return errors;
}

export function toFulfillmentUpdatePayload(input: FulfillmentUpdateInput) {
  const note = input.note.trim();
  return {
    status: input.status,
    expectedStatus: input.expectedStatus,
    ...(input.status === 'shipped'
      ? { carrier: input.carrier.trim(), trackingNumber: input.trackingNumber.replace(/\s+/g, ' ').trim() }
      : {}),
    ...(note ? { notes: note } : {}),
  };
}
