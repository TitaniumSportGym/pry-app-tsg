import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getCartCount } from '@/features/cart/models/cart';
import { createProductCheckout, requestProductQuote } from '@/features/checkout/api/product-checkout-api';
import {
  buildFulfillmentRequest,
  formatCountdown,
  getPurchaseSignature,
  getQuoteKey,
  getQuoteSecondsLeft,
  toCheckoutItems,
  validateRecipient,
  type CheckoutItem,
  type FulfillmentRequest,
  type ProductQuote,
  type RecipientInput,
} from '@/features/checkout/models/product-checkout';
import { onlyDigits, PHONE_DIGITS } from '@/features/delivery/models/address';
import {
  DELIVERY_KEYS,
  deliveryRepository,
} from '@/features/delivery/repositories/delivery-repository';
import { toAddressCardItem } from '@/features/delivery/viewmodels/use-addresses-view-model';
import { getCheckoutErrorMessage, getIdempotencyKey } from '@/features/memberships/models/checkout';
import { ordersRepository } from '@/features/orders/repositories/orders-repository';
import { formatOrderMoney } from '@/features/orders/models/order-presentation';
import { paymentsRepository } from '@/features/payments/repositories/payments-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useCart } from '@/hooks/use-cart';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { openMercadoPagoCheckout } from '@/services/mercado-pago-browser';
import { ApiError } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/api-error-message';

const SKELETON_DELAY_MS = 300;
/** Espera tras el último cambio antes de cotizar, para no consultar con cada tecla. */
const QUOTE_DEBOUNCE_MS = 450;

export type DeliveryChoice = 'pickup' | 'delivery';
export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'expired' | 'error';

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; quote: ProductQuote }
  | { status: 'error'; key: string; message: string };

/** Pantallas 29, 30, 53–56 y 73 · Finalizar compra (entrega, cotización y pago). */
export function useProductCheckoutViewModel() {
  const cart = useCart();
  const options = useAuthorizedResource(deliveryRepository.getOptions);
  const addressesResource = useAuthorizedResource(deliveryRepository.getAddresses, {
    reloadOn: [DELIVERY_KEYS.addresses],
  });

  const [chosenMethod, setChosenMethod] = useState<DeliveryChoice | null>(null);
  const [recipient, setRecipient] = useState<RecipientInput>({ name: '', phone: '' });
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' });
  const [quoteRound, setQuoteRound] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const pickupLocation = options.data?.pickupLocation ?? null;
  const pickupAvailable = Boolean(pickupLocation);
  const method: DeliveryChoice | null = options.isLoading
    ? null
    : chosenMethod === 'pickup' && !pickupAvailable
      ? 'delivery'
      : (chosenMethod ?? (pickupAvailable ? 'pickup' : 'delivery'));

  const addresses = addressesResource.data ?? [];

  // Una dirección recién agregada (desde "Agregar dirección") se elige sola; en la primera
  // carga se elige la predeterminada, que el modelo deja primero.
  const addressIds = addresses.map((address) => address.id).join(',');
  const [knownAddressIds, setKnownAddressIds] = useState('');
  if (addressIds !== knownAddressIds) {
    const previous = knownAddressIds ? knownAddressIds.split(',') : [];
    const added = addresses.find((address) => !previous.includes(address.id));
    setKnownAddressIds(addressIds);
    if (added) setChosenAddressId(added.id);
  }
  const selectedAddressId = addresses.some((address) => address.id === chosenAddressId)
    ? chosenAddressId
    : (addresses[0]?.id ?? null);

  const items = toCheckoutItems(cart.items);
  const fulfillment = method ? buildFulfillmentRequest(method, recipient, selectedAddressId) : null;
  const quoteKey = cart.items.length > 0 ? getQuoteKey(items, fulfillment) : null;

  useEffect(() => {
    if (!quoteKey) return;
    // La clave contiene exactamente lo que se cotiza; así el efecto solo depende de ella.
    const request = JSON.parse(quoteKey) as { items: CheckoutItem[]; fulfillment: FulfillmentRequest };
    let active = true;
    const timer = setTimeout(async () => {
      setQuoteState({ status: 'loading', key: quoteKey });
      try {
        const quote = await requestProductQuote(request.items, request.fulfillment);
        if (active) setQuoteState({ status: 'ready', key: quoteKey, quote });
      } catch (error) {
        if (!active) return;
        setQuoteState({
          status: 'error',
          key: quoteKey,
          message: getApiErrorMessage(error, 'No pudimos calcular el costo. Revisa tu conexión e inténtalo de nuevo.'),
        });
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [quoteKey, quoteRound]);

  const current = quoteState.status !== 'idle' && quoteState.key === quoteKey ? quoteState : null;
  const quote = current?.status === 'ready' ? current.quote : null;

  // Cuenta regresiva de la vigencia (~15 min) mientras hay una cotización lista.
  useEffect(() => {
    if (!quote?.expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote]);

  const secondsLeft = quote ? getQuoteSecondsLeft(quote, now) : 0;
  const isExpired = Boolean(quote) && secondsLeft === 0;
  const quoteStatus: QuoteStatus = !quoteKey
    ? 'idle'
    : !current || current.status === 'loading'
      ? 'loading'
      : current.status === 'error'
        ? 'error'
        : isExpired
          ? 'expired'
          : 'ready';

  function refreshQuote() {
    setPayError(null);
    setQuoteState({ status: 'idle' });
    setQuoteRound((value) => value + 1);
  }

  const recipientErrors = validateRecipient(recipient);
  const count = getCartCount(cart.items);
  const setupLoading = options.isLoading || (method === 'delivery' && addressesResource.isLoading);

  return {
    showSkeleton: useDelayedFlag(setupLoading, SKELETON_DELAY_MS),
    isLoading: setupLoading,
    isCartEmpty: cart.items.length === 0,
    optionsError: options.error
      ? getAccessErrorMessage(options.error, 'No encontramos las opciones de entrega.')
      : null,
    retryOptions: options.retry,
    method,
    pickupAvailable,
    pickup: pickupLocation,
    recipient,
    recipientErrors: {
      name: touched.name ? (recipientErrors.name ?? null) : null,
      phone: touched.phone ? (recipientErrors.phone ?? null) : null,
    },
    addresses: addresses.map(toAddressCardItem),
    addressesError: addressesResource.error
      ? getAccessErrorMessage(addressesResource.error, 'No encontramos tus direcciones.')
      : null,
    retryAddresses: addressesResource.retry,
    selectedAddressId,
    summary: {
      countLabel: `${count} ${count === 1 ? 'producto' : 'productos'}`,
      names: cart.items.map((item) => item.name).join(' · '),
      thumbs: cart.items.slice(0, 3).map((item) => ({ key: item.productId, imageUrl: item.imageUrl })),
    },
    quote: {
      status: quoteStatus,
      shippingLabel: method === 'pickup' ? 'Recogida en gimnasio' : (quote?.shippingRateName ?? 'Envío a domicilio'),
      shippingAmount: method === 'pickup' ? 'Gratis' : quote ? formatOrderMoney(quote.shippingTotal) : null,
      countdown: quote?.expiresAt && !isExpired ? formatCountdown(secondsLeft) : null,
      message: current?.status === 'error' ? current.message : null,
      rows: quote
        ? [
            { label: 'Subtotal', value: formatOrderMoney(quote.subtotal) },
            ...(quote.discountTotal > 0
              ? [{ label: 'Descuentos', value: `−${formatOrderMoney(quote.discountTotal)}` }]
              : []),
            {
              label: method === 'pickup' ? 'Recogida en gimnasio' : 'Envío',
              value: method === 'pickup' ? 'Gratis' : formatOrderMoney(quote.shippingTotal),
            },
            ...(quote.taxTotal > 0 ? [{ label: 'IVA incluido', value: formatOrderMoney(quote.taxTotal) }] : []),
          ]
        : [],
      total: quote ? formatOrderMoney(quote.total) : null,
    },
    isPaying,
    payError,
    canPay: quoteStatus === 'ready' && !isPaying,
    primaryLabel: quoteStatus === 'expired' ? 'Actualizar costo de envío' : 'Pagar con Mercado Pago',
    selectMethod(next: DeliveryChoice) {
      if (next === 'pickup' && !pickupAvailable) return;
      setChosenMethod(next);
    },
    setRecipientName(name: string) {
      setRecipient((value) => ({ ...value, name }));
    },
    setRecipientPhone(phone: string) {
      setRecipient((value) => ({ ...value, phone: onlyDigits(phone, PHONE_DIGITS) }));
    },
    touchRecipient(field: 'name' | 'phone') {
      setTouched((value) => ({ ...value, [field]: true }));
    },
    selectAddress: setChosenAddressId,
    addAddress() {
      router.push('/cart/address');
    },
    refreshQuote,
    async primaryAction() {
      if (quoteStatus === 'expired') {
        refreshQuote();
        return;
      }
      if (!fulfillment || !quote || quoteStatus !== 'ready' || isPaying) {
        setTouched({ name: true, phone: true });
        return;
      }
      setIsPaying(true);
      setPayError(null);
      try {
        const idempotencyKey = getIdempotencyKey(getPurchaseSignature(items, fulfillment, quote.quoteToken));
        const { checkoutUrl, orderId } = await createProductCheckout({
          idempotencyKey,
          items,
          fulfillment,
          quoteToken: quote.quoteToken,
        });
        // El pedido ya existe aunque el pago siga pendiente: Mis pedidos y Pagos se recargan.
        ordersRepository.invalidate();
        paymentsRepository.invalidate();
        // Se cierra sola cuando Mercado Pago regresa a la app; si el usuario la cierra, seguimos igual.
        await openMercadoPagoCheckout(checkoutUrl, 'cart/payment-result');
        // La verificación consulta al servidor y espera a que la app esté al frente.
        if (orderId) router.replace({ pathname: '/cart/payment-result', params: { orderId } });
        else router.replace('/account/orders');
      } catch (error) {
        setPayError(getCheckoutErrorMessage(error));
        // Precio, tarifa o cotización cambiaron: se pide una nueva antes de reintentar.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401) {
          setQuoteState({ status: 'idle' });
          setQuoteRound((value) => value + 1);
        }
      } finally {
        setIsPaying(false);
      }
    },
    openStore() {
      router.navigate('/store');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/cart');
    },
  };
}
