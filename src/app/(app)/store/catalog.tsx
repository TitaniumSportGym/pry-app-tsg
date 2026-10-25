import { useLocalSearchParams } from 'expo-router';

import { CatalogView } from '@/features/store/views/catalog-view';

export default function CatalogScreen() {
  const { category, q } = useLocalSearchParams<{ category?: string; q?: string }>();

  return <CatalogView category={category} query={q} />;
}
