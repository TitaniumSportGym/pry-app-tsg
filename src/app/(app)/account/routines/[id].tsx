import { useLocalSearchParams } from 'expo-router';

import { RoutineDetailView } from '@/features/training/views/routine-detail-view';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <RoutineDetailView routineId={id} />;
}
