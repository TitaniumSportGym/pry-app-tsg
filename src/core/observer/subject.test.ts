import { Subject } from './subject';

describe('Subject (Observer)', () => {
  it('notifica a todos los observadores suscritos', () => {
    const subject = new Subject<string>();
    const first = jest.fn();
    const second = jest.fn();

    subject.subscribe(first);
    subject.subscribe(second);
    subject.notify('pago aprobado');

    expect(first).toHaveBeenCalledWith('pago aprobado');
    expect(second).toHaveBeenCalledWith('pago aprobado');
    expect(subject.observerCount).toBe(2);
  });

  it('deja de notificar a quien se desuscribe', () => {
    const subject = new Subject<number>();
    const listener = jest.fn();

    const unsubscribe = subject.subscribe(listener);
    unsubscribe();
    subject.notify(1);

    expect(listener).not.toHaveBeenCalled();
    expect(subject.observerCount).toBe(0);
  });

  it('un observador que falla no impide notificar a los demás', () => {
    const subject = new Subject<void>();
    const healthy = jest.fn();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    subject.subscribe(() => {
      throw new Error('falla');
    });
    subject.subscribe(healthy);
    subject.notify();

    expect(healthy).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('permite desuscribirse durante una notificación', () => {
    const subject = new Subject<void>();
    const later = jest.fn();
    const unsubscribeLater = subject.subscribe(() => unsubscribeLater());
    subject.subscribe(later);

    subject.notify();
    subject.notify();

    expect(later).toHaveBeenCalledTimes(2);
    expect(subject.observerCount).toBe(1);
  });
});
