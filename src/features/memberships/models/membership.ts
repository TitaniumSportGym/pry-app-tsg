/** Membership plans from the public endpoint /api/memberships/plans. */

export type MembershipPlanType = 'visit' | 'individual' | 'student' | 'group' | string;

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  type: MembershipPlanType;
  durationDays: number;
  price: number;
  pricePerPerson: number;
  minPeople: number;
  maxPeople: number;
  requiresStudentProof: boolean;
  benefits: string[];
  sortOrder: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAN_TYPE_LABELS: Record<string, string> = {
  visit: 'Por visita',
  individual: 'Individual',
  student: 'Estudiante',
  group: 'Grupal',
};

/** The API answers with a 500 for ids that are not UUIDs, so they are rejected before the request. */
export function isValidPlanId(id: unknown): id is string {
  return typeof id === 'string' && UUID_PATTERN.test(id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Validates one plan from the API. Returns null when the data cannot be shown
 * safely (missing id, name, duration or price) or when the plan is inactive.
 */
export function parseMembershipPlan(raw: unknown): MembershipPlan | null {
  if (!isRecord(raw) || raw.isActive === false) {
    return null;
  }

  const price = toAmount(raw.price);
  const durationDays = toPositiveInteger(raw.durationDays, 0);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';

  if (!isValidPlanId(raw.id) || !name || price === null || durationDays === 0) {
    return null;
  }

  const minPeople = toPositiveInteger(raw.minPeople, 1);

  return {
    id: raw.id,
    name,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    type: typeof raw.type === 'string' ? raw.type : 'individual',
    durationDays,
    price,
    pricePerPerson: toAmount(raw.pricePerPerson) ?? price,
    minPeople,
    maxPeople: Math.max(toPositiveInteger(raw.maxPeople, minPeople), minPeople),
    requiresStudentProof: raw.requiresStudentProof === true,
    benefits: Array.isArray(raw.benefits)
      ? raw.benefits
          .filter((benefit): benefit is string => typeof benefit === 'string')
          .map((benefit) => benefit.trim())
          .filter(Boolean)
      : [],
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : Number.MAX_SAFE_INTEGER,
  };
}

export function parseMembershipPlans(raw: unknown): MembershipPlan[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(parseMembershipPlan)
    .filter((plan): plan is MembershipPlan => plan !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatPrice(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const [integer, decimals] = rounded.toFixed(2).split('.');
  const withSeparators = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decimals === '00' ? `$${withSeparators}` : `$${withSeparators}.${decimals}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatDuration(days: number) {
  if (days % 365 === 0) return plural(days / 365, 'año', 'años');
  if (days % 30 === 0) return plural(days / 30, 'mes', 'meses');
  if (days % 7 === 0) return plural(days / 7, 'semana', 'semanas');
  return plural(days, 'día', 'días');
}

export function getPlanTypeLabel(type: MembershipPlanType) {
  return PLAN_TYPE_LABELS[type] ?? 'Membresía';
}

export function formatPeople(plan: Pick<MembershipPlan, 'minPeople' | 'maxPeople'>) {
  if (plan.minPeople === plan.maxPeople) {
    return plural(plan.maxPeople, 'persona', 'personas');
  }

  return `${plan.minPeople} a ${plan.maxPeople} personas`;
}

export function isGroupPlan(plan: Pick<MembershipPlan, 'maxPeople'>) {
  return plan.maxPeople > 1;
}

/** Short highlight shown next to the plan name, when the plan has something special. */
export function getPlanBadge(plan: MembershipPlan) {
  if (plan.requiresStudentProof || plan.type === 'student') return 'ESTUDIANTE';
  if (isGroupPlan(plan)) return formatPeople(plan).toUpperCase();
  if (plan.type === 'visit') return 'POR VISITA';
  return null;
}
