import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/**
 * Se envía en los checkouts para que el backend use las URLs de regreso de la app móvil
 * (igual que `client: "mobile"` en el registro). La URL de regreso la arma el backend con su
 * propia configuración: la app nunca le dicta a dónde redirigir.
 */
export const MOBILE_CLIENT = 'mobile' as const;

export type PaymentReturnPath = 'cart/payment-result' | 'memberships/payment-result';

/** pryapptsg://cart/payment-result (o exp://… en desarrollo). */
export function getPaymentReturnUrl(path: PaymentReturnPath) {
  return Linking.createURL(path);
}

export type CheckoutBrowserOutcome = 'returned' | 'closed';

/**
 * Abre Mercado Pago Checkout Pro en una sesión del navegador del sistema que se cierra sola
 * cuando Mercado Pago (vía backend) redirige a la app. Si el usuario la cierra a mano, la app
 * continúa igual: en ambos casos el pago se verifica consultando al servidor.
 */
export async function openMercadoPagoCheckout(
  checkoutUrl: string,
  returnPath: PaymentReturnPath,
): Promise<CheckoutBrowserOutcome> {
  let returnUrl: string;
  try {
    returnUrl = getPaymentReturnUrl(returnPath);
  } catch {
    // Sin esquema de la app (no debería pasar en una build): el pago no se bloquea por esto.
    await WebBrowser.openBrowserAsync(checkoutUrl);
    return 'closed';
  }
  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
  return result.type === 'success' ? 'returned' : 'closed';
}
