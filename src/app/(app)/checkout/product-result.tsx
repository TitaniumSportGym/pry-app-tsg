import { useLocalSearchParams } from 'expo-router';

import { ProductPaymentResultView } from '@/features/cart/views/product-payment-result-view';

/** The server-confirmed orderId, not a Mercado Pago query status, determines the result. */
export default function ProductPaymentResultScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  return <ProductPaymentResultView orderId={orderId} />;
}
