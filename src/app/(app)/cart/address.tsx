import { AddressFormView } from '@/features/delivery/views/address-form-view';

// "Agregar dirección" desde el checkout; al guardar regresa y la nueva dirección queda elegida.
export default function CheckoutNewAddressScreen() {
  return <AddressFormView />;
}
