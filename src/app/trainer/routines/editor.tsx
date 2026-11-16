import { useLocalSearchParams } from 'expo-router';

import { RoutineEditorView } from '@/features/trainer/views/routine-editor-view';

// Sin `id`: nueva rutina. Con `id`: editar la rutina (si no está en revisión).
export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <RoutineEditorView routineId={id} />;
}
