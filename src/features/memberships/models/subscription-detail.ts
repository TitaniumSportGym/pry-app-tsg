/**
 * Detalle de la membresía del cliente para "Más → Mi membresía", a partir de la misma respuesta
 * de GET /api/memberships/me/subscription: estado, vigencia, plan, beneficios y el pago con su
 * comprobante. El backend solo devuelve la membresía vigente; sin ella responde
 * `hasActiveSubscription: false`.
 */
import { dateOnlyToLocal } from '@/features/access/models/access-format';
import { parseDateOnly } from '@/features/access/models/access-pass';

export interface SubscriptionPayment {
  amount: number | null;
  /** Método tal como lo envía el backend (online_checkout, cash, card_terminal…). */
  method: string;
  paidAt: Date | null;
  /** Folio del comprobante, p. ej. "TSG-20261108-EABCE062". */
  receiptFolio: string | null;
  orderNumber: string | null;
}

export interface SubscriptionDetail {
  /** Estado del backend: active, pending… */
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  autoRenew: boolean;
  plan: {
    name: string;
    description: string;
    type: 'individual' | 'group';
    maxPeople: number;
    durationDays: number | null;
    accessLevel: string;
    benefits: string[];
  };
  payment: SubscriptionPayment | null;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function amount(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(number) && number >= 0
    ? number
    : null;
}

function date(value: unknown) {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePayment(raw: unknown): SubscriptionPayment | null {
  if (!isRecord(raw)) return null;
  const receipt = isRecord(raw.receipt) ? raw.receipt : {};
  const receiptMeta = isRecord(receipt.metadata) ? receipt.metadata : {};
  return {
    amount: amount(raw.amount),
    method: text(raw.method).toLowerCase(),
    paidAt: date(raw.paidAt) ?? date(raw.approvedAt),
    receiptFolio: text(receipt.folio) || null,
    orderNumber: text(receiptMeta.orderNumber) || null,
  };
}

/** Null cuando no hay membresía vigente o la respuesta no se puede mostrar. */
export function parseSubscriptionDetail(raw: unknown): SubscriptionDetail | null {
  if (!isRecord(raw) || raw.hasActiveSubscription !== true || !isRecord(raw.subscription)) return null;
  const subscription = raw.subscription;
  const plan = isRecord(subscription.plan) ? subscription.plan : {};
  const maxPeople = Math.max(1, Math.floor(Number(plan.maxPeople)) || 1);
  const durationDays = Number(plan.durationDays);

  return {
    status: text(subscription.status).toLowerCase() || 'active',
    startsAt: parseDateOnly(subscription.startsAt),
    endsAt: parseDateOnly(subscription.endsAt),
    autoRenew: subscription.autoRenew === true,
    plan: {
      name: text(plan.name) || 'Membresía',
      description: text(plan.description),
      type: plan.type === 'group' || maxPeople > 1 ? 'group' : 'individual',
      maxPeople,
      durationDays: Number.isFinite(durationDays) && durationDays > 0 ? durationDays : null,
      accessLevel: text(plan.accessLevel).toLowerCase(),
      benefits: Array.isArray(plan.benefits)
        ? plan.benefits.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        : [],
    },
    payment: parsePayment(subscription.payment),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A partir de cuántos días restantes se avisa que la membresía está por vencer. */
export const EXPIRING_SOON_DAYS = 7;

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Días que quedan contando hoy como último día si endsAt es hoy (endsAt es inclusivo). */
export function getDaysLeft(endsAt: string, now: Date) {
  return Math.max(0, Math.round((dateOnlyToLocal(endsAt).getTime() - startOfDay(now).getTime()) / DAY_MS));
}

/** Avance de la vigencia entre 0 y 1, para la barra de progreso. */
export function getValidityProgress(detail: Pick<SubscriptionDetail, 'startsAt' | 'endsAt'>, now: Date) {
  if (!detail.startsAt || !detail.endsAt) return null;
  const start = dateOnlyToLocal(detail.startsAt).getTime();
  const totalDays = Math.round((dateOnlyToLocal(detail.endsAt).getTime() - start) / DAY_MS) + 1;
  if (totalDays <= 0) return null;
  const usedDays = Math.round((startOfDay(now).getTime() - start) / DAY_MS) + 1;
  return Math.min(1, Math.max(0, usedDays / totalDays));
}

export type SubscriptionTone = 'active' | 'expiring' | 'pending' | 'inactive';

/** Estado que ve el cliente: "Activa", "Por vencer", "Vence hoy", "Pendiente"… */
export function getSubscriptionState(detail: Pick<SubscriptionDetail, 'status' | 'endsAt'>, now: Date) {
  if (detail.status === 'active') {
    const days = detail.endsAt ? getDaysLeft(detail.endsAt, now) : null;
    if (days === 0) return { tone: 'expiring' as const, label: 'Vence hoy' };
    if (days !== null && days <= EXPIRING_SOON_DAYS) return { tone: 'expiring' as const, label: 'Por vencer' };
    return { tone: 'active' as const, label: 'Activa' };
  }
  if (detail.status.startsWith('pending')) return { tone: 'pending' as const, label: 'Pendiente' };
  const labels: Record<string, string> = { expired: 'Vencida', cancelled: 'Cancelada', suspended: 'Suspendida' };
  return { tone: 'inactive' as const, label: labels[detail.status] ?? 'Inactiva' };
}

export function getPlanTypeLabel(plan: Pick<SubscriptionDetail['plan'], 'type' | 'maxPeople'>) {
  return plan.type === 'group' ? `Grupal · ${plan.maxPeople} personas` : 'Individual';
}

const ACCESS_LEVELS: Record<string, string> = { standard: 'Estándar', premium: 'Premium', vip: 'VIP' };

export function getAccessLevelLabel(level: string) {
  if (!level) return 'Estándar';
  return ACCESS_LEVELS[level] ?? level.charAt(0).toUpperCase() + level.slice(1);
}
