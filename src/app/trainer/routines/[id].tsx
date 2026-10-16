import { useLocalSearchParams } from 'expo-router';

import { TrainerRoutineDetailView } from '@/features/trainer/views/trainer-routine-detail-view';

export default function TrainerRoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TrainerRoutineDetailView routineId={id} />;
}
