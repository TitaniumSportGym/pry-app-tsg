import { toFulfillmentUpdatePayload, validateFulfillmentUpdate } from './fulfillment-update';
import { parsePickupSettings, toPickupSettingsPayload, validatePickupSettings } from './pickup-point';
import {
  findOverlappingRates,
  toShippingRatePayload,
  validateShippingRateInput,
  type ShippingRate,
} from './shipping-rate';

// Formatos confirmados contra el backend con peticiones de solo lectura o rechazadas.
describe('Escrituras de entregas del administrador', () => {
  it('lee la configuración de recogida dentro de settings, con horarios como texto', () => {
    const settings = parsePickupSettings({
      ok: true,
      configured: false,
      settings: { name: 'Gimnasio', address: 'Calle 1', phone: '7710000000', municipality: '', state: '', postalCode: '', hours: '', instructions: '', enabled: true },
    });
    expect(settings).toMatchObject({ name: 'Gimnasio', enabled: true, hours: '' });
    expect(validatePickupSettings(settings)).toEqual({ postalCode: 'Escribe un CP de 5 dígitos.' });
    expect(toPickupSettingsPayload({ ...settings, name: ' Gimnasio ', postalCode: '43000' })).toMatchObject({
      name: 'Gimnasio',
      postalCode: '43000',
    });
  });

  it('valida tarifas como el backend y manda el importe con dos decimales', () => {
    const input = { name: 'Local', postalCodeFrom: '43010', postalCodeTo: '43000', amount: '79.5', active: true };
    expect(validateShippingRateInput(input)).toEqual({ postalCodeTo: 'El CP final debe ser mayor o igual al CP inicial.' });
    expect(validateShippingRateInput({ ...input, postalCodeTo: '43099', amount: '-1' }).amount).toBeDefined();
    expect(toShippingRatePayload({ ...input, postalCodeTo: '43099' })).toEqual({
      name: 'Local', postalCodeFrom: '43010', postalCodeTo: '43099', amount: '79.50', active: true,
    });
  });

  it('avisa solo de tarifas activas que se cruzan, sin contar la que se edita', () => {
    const rates: ShippingRate[] = [
      { id: 'a', name: 'Nacional', postalCodeFrom: '00000', postalCodeTo: '99999', amount: 230, active: true },
      { id: 'b', name: 'Inactiva', postalCodeFrom: '43000', postalCodeTo: '43999', amount: 50, active: false },
    ];
    const input = { postalCodeFrom: '43000', postalCodeTo: '43009', active: true };
    expect(findOverlappingRates(input, rates).map((rate) => rate.id)).toEqual(['a']);
    expect(findOverlappingRates(input, rates, 'a')).toEqual([]);
    expect(findOverlappingRates({ ...input, active: false }, rates)).toEqual([]);
  });

  it('envía expectedStatus siempre y paquetería y guía solo al registrar un envío', () => {
    const base = { expectedStatus: 'packed', carrier: 'Estafeta', trackingNumber: '', note: '' };
    expect(validateFulfillmentUpdate({ ...base, status: 'shipped' })).toEqual({ trackingNumber: 'Escribe el número de guía.' });
    expect(toFulfillmentUpdatePayload({ ...base, status: 'shipped', trackingNumber: ' 7012  3456 ', note: ' Ok ' })).toEqual({
      status: 'shipped', expectedStatus: 'packed', carrier: 'Estafeta', trackingNumber: '7012 3456', notes: 'Ok',
    });
    expect(toFulfillmentUpdatePayload({ ...base, status: 'incident' })).toEqual({ status: 'incident', expectedStatus: 'packed' });
  });
});
