import { Stack } from 'expo-router';

// Carrito → Finalizar compra → Resultado del pago, dentro de la misma pestaña.
export default function CartLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
