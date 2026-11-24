import { dateOnlyToLocal, formatDateOnly } from '@/features/access/models/access-format';
import { parseDateOnly } from '@/features/access/models/access-pass';

/** Membresía vigente hoy (GET /api/memberships/me/subscription). */
export interface ActiveSubscription {
  planName: string;
  durationDays: number | null;
  startsAt: string | null;
  endsAt: string | null;
  /** Monto pagado, si el backend incluye el pago. */
  amount: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return value !== null && value !== undefined && Number.isFinite(amount) && amount >= 0
    ? amount
    : null;
}

/** Null cuando no hay membresía vigente o la respuesta no se puede mostrar. */
export function parseActiveSubscription(raw: unknown): ActiveSubscription | null {
  if (!isRecord(raw) || raw.hasActiveSubscription !== true || !isRecord(raw.subscription)) {
    return null;
  }

  const { subscription } = raw;
  const plan = isRecord(subscription.plan) ? subscription.plan : {};
  const planName = typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim() : 'Membresía';
  const durationDays =
    typeof plan.durationDays === 'number' && plan.durationDays > 0 ? plan.durationDays : null;
  const payment = isRecord(subscription.payment) ? subscription.payment : {};

  return {
    planName,
    durationDays,
    startsAt: parseDateOnly(subscription.startsAt),
    endsAt: parseDateOnly(subscription.endsAt),
    amount: toAmount(payment.amount),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Vence hoy", "1 día restante" o "29 días restantes" (endsAt es inclusivo). */
export function formatDaysLeft(endsAt: string, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(0, Math.round((dateOnlyToLocal(endsAt).getTime() - today.getTime()) / DAY_MS));
  if (days === 0) return 'Vence hoy';
  return days === 1 ? '1 día restante' : `${days} días restantes`;
}

/** Texto de vigencia de la membresía: "Vigente hasta 2 dic 2026 · 29 días restantes". */
export function describeValidity(subscription: ActiveSubscription, now: Date) {
  if (!subscription.endsAt) return 'Membresía vigente';
  return `Vigente hasta ${formatDateOnly(subscription.endsAt)} · ${formatDaysLeft(subscription.endsAt, now)}`;
}
