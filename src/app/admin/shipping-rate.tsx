import { useLocalSearchParams } from 'expo-router';

import { ShippingRateFormView } from '@/features/admin/views/shipping-rate-form-view';

// Sin `id`: nueva tarifa (pantalla 67). Con `id`: editar tarifa (pantalla 68).
export default function ShippingRateScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <ShippingRateFormView rateId={id} />;
}
