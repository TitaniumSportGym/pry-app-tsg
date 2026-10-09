import type { SymbolViewProps } from 'expo-symbols';

export interface TrainingFocus {
  description: string;
  icon: SymbolViewProps['name'];
  title: string;
}

export const TRAINING_FOCUSES: TrainingFocus[] = [
  {
    title: 'Fuerza',
    description: 'Desarrolla una base sólida con ejercicios progresivos y buena técnica.',
    icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  },
  {
    title: 'Resistencia',
    description: 'Mejora tu capacidad de esfuerzo y mantén un ritmo constante.',
    icon: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  },
  {
    title: 'Movilidad',
    description: 'Trabaja el control y la amplitud de movimiento para entrenar mejor.',
    icon: { ios: 'figure.flexibility', android: 'self_improvement', web: 'self_improvement' },
  },
];
