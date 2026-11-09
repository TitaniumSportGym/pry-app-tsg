import { describeValidity, formatDaysLeft, parseActiveSubscription } from './subscription';

const NOW = new Date(2026, 10, 3, 18, 30);

describe('membresía vigente', () => {
  it('lee el plan, las fechas y el monto de la respuesta del backend', () => {
    expect(
      parseActiveSubscription({
        ok: true,
        hasActiveSubscription: true,
        subscription: {
          status: 'active',
          startsAt: '2026-11-03',
          endsAt: '2026-12-02',
          plan: { name: ' Titanium ', durationDays: 30 },
          payment: { amount: '499.00' },
        },
      }),
    ).toEqual({
      planName: 'Titanium',
      durationDays: 30,
      startsAt: '2026-11-03',
      endsAt: '2026-12-02',
      amount: 499,
    });
  });

  it('devuelve null sin membresía activa o con una respuesta dañada', () => {
    expect(parseActiveSubscription({ ok: true, hasActiveSubscription: false, subscription: null })).toBeNull();
    expect(parseActiveSubscription(null)).toBeNull();
  });

  it('cuenta los días restantes con la fecha de fin inclusiva', () => {
    expect(formatDaysLeft('2026-12-02', NOW)).toBe('29 días restantes');
    expect(formatDaysLeft('2026-11-04', NOW)).toBe('1 día restante');
    expect(formatDaysLeft('2026-11-03', NOW)).toBe('Vence hoy');
  });

  it('describe la vigencia del plan', () => {
    const subscription = {
      planName: 'Titanium',
      durationDays: 30,
      startsAt: '2026-11-03',
      endsAt: '2026-12-02',
      amount: 499,
    };
    expect(describeValidity(subscription, NOW)).toBe('Vigente hasta 2 dic 2026 · 29 días restantes');
    expect(describeValidity({ ...subscription, endsAt: null }, NOW)).toBe('Membresía vigente');
  });
});
