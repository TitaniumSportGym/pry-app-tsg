import { useLocalSearchParams } from 'expo-router';

import { AddressFormView } from '@/features/delivery/views/address-form-view';

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AddressFormView addressId={id} />;
}
