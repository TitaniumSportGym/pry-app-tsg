import { useLocalSearchParams } from 'expo-router';

import { AdminRoutineReviewView } from '@/features/admin/views/admin-routine-review-view';

export default function AdminRoutineReviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <AdminRoutineReviewView routineId={id} />;
}
