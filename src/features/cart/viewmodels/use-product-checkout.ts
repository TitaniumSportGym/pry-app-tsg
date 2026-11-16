import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createProductCheckout,
  EMPTY_DELIVERY_ADDRESS,
  getDeliveryOptions,
  getSavedAddresses,
  quoteProductCheckout,
  type DeliveryAddress,
  type FulfillmentSelection,
  type PickupLocation,
  type ProductQuote,
  type SavedDeliveryAddress,
} from '@/features/cart/api/product-checkout-api';
import { getCartCount, getCartTotal } from '@/features/cart/models/cart';
import { getCheckoutErrorMessage, getIdempotencyKey } from '@/features/memberships/models/checkout';
import { formatProductPrice } from '@/features/store/models/product';
import { useCart } from '@/hooks/use-cart';

export type CheckoutMethod = 'pickup' | 'delivery';

export function useProductCheckout() {
  const cart = useCart();
  const [method, setMethod] = useState<CheckoutMethod>('pickup');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<DeliveryAddress>({ ...EMPTY_DELIVERY_ADDRESS });
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addresses, setAddresses] = useState<SavedDeliveryAddress[]>([]);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [quotation, setQuotation] = useState<{ signature: string; quote: ProductQuote } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getDeliveryOptions(), getSavedAddresses()]).then(([pickup, saved]) => {
      if (!active) return;
      if (pickup.status === 'fulfilled') setPickupLocation(pickup.value);
      if (saved.status === 'fulfilled') setAddresses(saved.value);
      setOptionsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const items = useMemo(
    () => cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [cart.items],
  );
  const fulfillment = useMemo<FulfillmentSelection>(() => {
    if (method === 'pickup') return { method, recipientName, phone };
    if (selectedAddressId) return { method, addressId: selectedAddressId };
    return { method, address };
  }, [method, recipientName, phone, selectedAddressId, address]);
  const signature = JSON.stringify({ items, fulfillment });
  const quote = quotation?.signature === signature ? quotation.quote : null;
  const validQuote = Boolean(quote && Date.parse(quote.expiresAt) > Date.now());

  function editAddress(field: keyof DeliveryAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
  }

  async function requestQuote() {
    if (lock.current || !cart.isAvailable || items.length === 0) return;
    lock.current = true;
    setQuoting(true);
    setErrorMessage(null);
    try {
      const result = await quoteProductCheckout(items, fulfillment);
      setQuotation({ signature, quote: result });
    } catch (error) {
      setQuotation(null);
      setErrorMessage(getCheckoutErrorMessage(error));
    } finally {
      lock.current = false;
      setQuoting(false);
    }
  }

  async function pay() {
    if (lock.current || !cart.isAvailable || !quote || !validQuote) {
      setErrorMessage('Consulta una cotización vigente antes de pagar.');
      return;
    }
    lock.current = true;
    setPaying(true);
    setErrorMessage(null);
    try {
      // The quote is signed by the backend; never send the display price as a charge.
      const idempotencyKey = getIdempotencyKey('products:' + quote.quoteToken);
      const result = await createProductCheckout(items, fulfillment, quote.quoteToken, idempotencyKey);
      await WebBrowser.openBrowserAsync(result.checkoutUrl);
      router.push({ pathname: '/checkout/product-result', params: { orderId: result.orderId } });
    } catch (error) {
      setErrorMessage(getCheckoutErrorMessage(error));
    } finally {
      lock.current = false;
      setPaying(false);
    }
  }

  return {
    items: cart.items,
    count: getCartCount(cart.items),
    estimatedTotal: formatProductPrice(getCartTotal(cart.items)),
    isEmpty: cart.items.length === 0,
    isAvailable: cart.isAvailable,
    method,
    setMethod: (value: CheckoutMethod) => { setMethod(value); setErrorMessage(null); },
    recipientName,
    setRecipientName: (value: string) => { setRecipientName(value); setErrorMessage(null); },
    phone,
    setPhone: (value: string) => { setPhone(value); setErrorMessage(null); },
    address,
    editAddress,
    selectedAddressId,
    setSelectedAddressId: (value: string) => { setSelectedAddressId(value); setErrorMessage(null); },
    addresses,
    pickupLocation,
    optionsLoading,
    quote,
    validQuote,
    quoting,
    paying,
    errorMessage,
    requestQuote,
    pay,
    goBack() { if (router.canGoBack()) router.back(); else router.replace('/cart'); },
  };
}
