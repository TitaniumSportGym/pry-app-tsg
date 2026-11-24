import {
  getAccessLevelLabel,
  getDaysLeft,
  getPlanTypeLabel,
  getSubscriptionState,
  getValidityProgress,
  parseSubscriptionDetail,
} from './subscription-detail';

// Forma real de GET /api/memberships/me/subscription, con datos sintéticos.
const response = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  hasActiveSubscription: true,
  subscription: {
    status: 'active',
    startsAt: '2026-11-08',
    endsAt: '2026-12-07',
    autoRenew: false,
    plan: {
      name: 'Regular mensual',
      description: 'Membresía mensual regular.',
      type: 'individual',
      durationDays: 30,
      maxPeople: 1,
      accessLevel: 'standard',
      benefits: ['Acceso al gimnasio por 30 días', '', 7, 'Acceso a rutinas y entrenamientos'],
    },
    payment: {
      amount: '440.00',
      method: 'online_checkout',
      paidAt: '2026-11-08T23:47:26.800Z',
      receipt: { folio: 'TSG-TEST-0001', metadata: { orderNumber: 'ORD-TEST-0001' } },
    },
    ...overrides,
  },
});

describe('Mi membresía', () => {
  it('lee estado, vigencia, plan, beneficios válidos y comprobante', () => {
    expect(parseSubscriptionDetail(response())).toEqual({
      status: 'active',
      startsAt: '2026-11-08',
      endsAt: '2026-12-07',
      autoRenew: false,
      plan: {
        name: 'Regular mensual',
        description: 'Membresía mensual regular.',
        type: 'individual',
        maxPeople: 1,
        durationDays: 30,
        accessLevel: 'standard',
        benefits: ['Acceso al gimnasio por 30 días', 'Acceso a rutinas y entrenamientos'],
      },
      payment: {
        amount: 440,
        method: 'online_checkout',
        paidAt: new Date('2026-11-08T23:47:26.800Z'),
        receiptFolio: 'TSG-TEST-0001',
        orderNumber: 'ORD-TEST-0001',
      },
    });
  });

  it('es null sin membresía vigente o con una respuesta dañada', () => {
    expect(parseSubscriptionDetail({ ok: true, hasActiveSubscription: false, subscription: null })).toBeNull();
    expect(parseSubscriptionDetail('error')).toBeNull();
  });

  it('marca la membresía como activa, por vencer o que vence hoy', () => {
    const detail = { status: 'active', endsAt: '2026-12-07' };
    expect(getSubscriptionState(detail, new Date(2026, 10, 15))).toEqual({ tone: 'active', label: 'Activa' });
    expect(getSubscriptionState(detail, new Date(2026, 11, 1))).toEqual({ tone: 'expiring', label: 'Por vencer' });
    expect(getSubscriptionState(detail, new Date(2026, 11, 7, 20))).toEqual({ tone: 'expiring', label: 'Vence hoy' });
    expect(getSubscriptionState({ status: 'pending_members', endsAt: null }, new Date())).toEqual({ tone: 'pending', label: 'Pendiente' });
    expect(getSubscriptionState({ status: 'expired', endsAt: null }, new Date())).toEqual({ tone: 'inactive', label: 'Vencida' });
  });

  it('calcula días restantes y avance de la vigencia (fin inclusivo)', () => {
    expect(getDaysLeft('2026-12-07', new Date(2026, 11, 7, 23))).toBe(0);
    expect(getDaysLeft('2026-12-07', new Date(2026, 10, 8))).toBe(29);
    const period = { startsAt: '2026-11-08', endsAt: '2026-12-07' };
    expect(getValidityProgress(period, new Date(2026, 10, 8))).toBeCloseTo(1 / 30);
    expect(getValidityProgress(period, new Date(2026, 11, 7))).toBe(1);
    expect(getValidityProgress({ startsAt: null, endsAt: null }, new Date())).toBeNull();
  });

  it('nombra el tipo de plan y el nivel de acceso en español', () => {
    expect(getPlanTypeLabel({ type: 'individual', maxPeople: 1 })).toBe('Individual');
    expect(getPlanTypeLabel({ type: 'group', maxPeople: 2 })).toBe('Grupal · 2 personas');
    expect(getAccessLevelLabel('standard')).toBe('Estándar');
    expect(getAccessLevelLabel('')).toBe('Estándar');
    expect(getAccessLevelLabel('elite')).toBe('Elite');
  });
});
