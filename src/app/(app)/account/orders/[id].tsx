import { useLocalSearchParams } from 'expo-router';

import { OrderDetailView } from '@/features/orders/views/order-detail-view';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OrderDetailView orderId={id} />;
}
