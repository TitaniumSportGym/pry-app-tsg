import { Stack } from 'expo-router';

// Las pestañas viven en el grupo (tabs); el escáner se abre encima, a pantalla completa y sin barra inferior.
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
