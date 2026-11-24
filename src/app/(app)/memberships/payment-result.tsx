import { useLocalSearchParams } from 'expo-router';

import { MembershipPaymentResultView } from '@/features/memberships/views/membership-payment-result-view';

// También sirve como destino de un enlace profundo (pryapptsg://memberships/payment-result?orderId=…):
// solo se usa el orderId y el estado del pago siempre se consulta al servidor.
export default function MembershipPaymentResultScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return <MembershipPaymentResultView orderId={orderId} />;
}
