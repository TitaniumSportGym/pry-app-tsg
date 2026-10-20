import { useLocalSearchParams } from 'expo-router';

import { ProductDetailView } from '@/features/store/views/product-detail-view';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ProductDetailView productId={id} />;
}
