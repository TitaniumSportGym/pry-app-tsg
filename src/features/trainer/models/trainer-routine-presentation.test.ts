import type { TrainerRoutine } from './trainer';
import { getTrainerNotice, toRoutineDetail } from './routine-detail-presentation';
import {
  countByStatus,
  formatEdited,
  getRoutineAction,
  matchesRoutine,
  summarizeRoutines,
  toRoutineCardItem,
} from './trainer-routine-presentation';

function routine(overrides: Partial<TrainerRoutine> = {}): TrainerRoutine {
  return {
    id: '30cdac88-08ac-42e0-9c26-d52b3e295f84',
    title: 'Hipertrofia',
    objective: 'Ganar masa',
    description: 'Tres días por semana',
    level: 'principiante',
    category: 'hipertrofia',
    durationWeeks: 1,
    daysPerWeek: 1,
    estimatedMinutes: 45,
    imageUrl: null,
    status: 'draft',
    updatedAt: null,
    exercises: [
      { id: 'a', name: 'Press', description: null, dayNumber: 1, sets: 4, reps: '10', restSeconds: 90, notes: null, order: 0, videoUrl: 'https://youtu.be/abc', hasVideo: true, videoType: 'upload' },
      { id: 'b', name: 'Remo', description: null, dayNumber: 2, sets: 3, reps: '12', restSeconds: 60, notes: null, order: 0, videoUrl: null, hasVideo: false },
    ],
    ...overrides,
  };
}

describe('Presentación de rutinas del entrenador', () => {
  it('arma la tarjeta con etiquetas, métricas y acción según el estado', () => {
    expect(toRoutineCardItem(routine())).toMatchObject({
      tags: ['Hipertrofia', 'Principiante'],
      status: { label: 'Borrador', tone: 'neutral' },
      minutes: '45 min',
      days: '1 día',
      exercises: '2',
      meta: '',
      action: 'Continuar',
    });
    expect(getRoutineAction('rejected')).toBe('Corregir');
    expect(getRoutineAction('published')).toBe('Ver rutina');
    expect(formatEdited({ updatedAt: '2026-11-16T10:20:00' }, new Date('2026-11-16T12:00:00'))).toMatch(/^Editada /);
  });

  it('filtra por estado y busca en título, objetivo y descripción', () => {
    expect(matchesRoutine(routine(), 'all', 'masa')).toBe(true);
    expect(matchesRoutine(routine(), 'all', 'tres días')).toBe(true);
    expect(matchesRoutine(routine(), 'published', '')).toBe(false);
    expect(matchesRoutine(routine(), 'draft', 'pierna')).toBe(false);
  });

  it('resume y cuenta las rutinas por estado', () => {
    const list = [routine(), routine({ status: 'pending_review' }), routine({ status: 'published' }), routine({ status: 'otro' })];
    expect(summarizeRoutines(list)).toBe('4 rutinas · 1 en revisión');
    expect(summarizeRoutines([routine()])).toBe('1 rutina');
    expect(countByStatus(list)).toEqual({ draft: 1, pending_review: 1, published: 1, rejected: 0, archived: 0 });
  });

  it('da un aviso distinto para cada estado', () => {
    expect(getTrainerNotice('pending_review').tone).toBe('warning');
    expect(getTrainerNotice('published').tone).toBe('success');
    expect(getTrainerNotice('rejected').tone).toBe('error');
    expect(getTrainerNotice('archived').title).toBe('Archivada');
    expect(getTrainerNotice('draft').title).toBe('Borrador');
  });

  it('agrupa el detalle por día e identifica el tipo de video', () => {
    const detail = toRoutineDetail(routine());
    expect(detail.title).toBe('HIPERTROFIA');
    expect(detail.metrics.map((metric) => metric.value)).toEqual(['Principiante', '1 semana', '45 min', '2 · 2 días']);
    expect(detail.videoCount).toBe(1);
    expect(detail.days.map((day) => day.dayNumber)).toEqual([1, 2]);
    expect(detail.days[0].exercises[0]).toMatchObject({ position: 1, rest: '1 min 30 s', videoLabel: 'Video subido' });
    expect(detail.days[1].exercises[0]).toMatchObject({ video: null, videoLabel: 'Sin video' });
  });
});
