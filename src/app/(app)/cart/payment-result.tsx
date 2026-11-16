import { useLocalSearchParams } from 'expo-router';

import { ProductPaymentResultView } from '@/features/checkout/views/product-payment-result-view';

// También sirve como destino de un enlace profundo (pryapptsg://cart/payment-result?orderId=…):
// solo se usa el orderId y el estado del pago siempre se consulta al servidor.
export default function ProductPaymentResultScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return <ProductPaymentResultView orderId={orderId} />;
}
