/**
 * Punto de recogida. El backend no tiene un endpoint para consultarlo ni editarlo; nombre,
 * dirección y teléfono son los que guarda en los pedidos con "Recoger en gimnasio"
 * (pickupLocationSnapshot). Horarios e instrucciones son DATOS DE EJEMPLO.
 */
export const PICKUP_POINT = {
  available: true,
  name: 'Titanium Sport Gym',
  address: 'Av. Corona del Rosal N 15, Col. 5 de Mayo',
  municipality: 'Huejutla de Reyes',
  postalCode: '43000',
  phone: '771 197 6803',
  schedule: [
    { id: 'weekdays', day: 'Lunes a viernes', hours: '6:00 – 23:00' },
    { id: 'saturday', day: 'Sábado', hours: '8:00 – 16:00' },
    { id: 'sunday', day: 'Domingo', hours: '8:00 – 16:00' },
  ],
  instructions: 'Presenta tu número de pedido en recepción. Tienes 7 días para recogerlo.',
} as const;
