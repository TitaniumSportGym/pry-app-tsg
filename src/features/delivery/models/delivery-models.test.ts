import {
  EMPTY_ADDRESS_INPUT,
  formatAddressLine,
  formatAddressTitle,
  formatPhone,
  onlyDigits,
  parseAddresses,
  parseSavedAddress,
  toAddressPayload,
  validateAddressInput,
  type AddressInput,
} from './address';
import { parseDeliveryOptions, parsePickupSchedule } from './pickup-location';

// Datos sintéticos de prueba; no son de clientes reales.
const ID_A = '0b6f1c8e-6c1a-4d3e-9a51-1f2b3c4d5e6f';
const ID_B = '9d8c7b6a-5f4e-4d3c-8b2a-1a2b3c4d5e6f';

const rawAddress = (id: string, isDefault = false) => ({
  id,
  recipientName: 'Cliente Ejemplo',
  phone: '7711234567',
  postalCode: '06000',
  state: 'Hidalgo',
  municipality: 'Huejutla de Reyes',
  neighborhood: 'Centro',
  street: 'Calle Ejemplo',
  exteriorNumber: '12',
  interiorNumber: null,
  references: '  ',
  isDefault,
});

const validInput: AddressInput = {
  ...EMPTY_ADDRESS_INPUT,
  recipientName: ' Cliente Ejemplo ',
  phone: '771 123 4567',
  postalCode: '06000',
  state: 'Hidalgo',
  municipality: 'Huejutla de Reyes',
  neighborhood: 'Centro',
  street: 'Calle Ejemplo',
  exteriorNumber: '12',
  references: ' Portón negro ',
};

describe('Direcciones', () => {
  it('acepta las formas de lista del backend, descarta ids inválidos y deja la predeterminada primero', () => {
    const list = parseAddresses({ addresses: [rawAddress(ID_A), { ...rawAddress('no-uuid') }, rawAddress(ID_B, true)] });
    expect(list.map((address) => address.id)).toEqual([ID_B, ID_A]);
    expect(list[1]).toMatchObject({ postalCode: '06000', interiorNumber: null, references: null });
    expect(parseAddresses([rawAddress(ID_A)])).toHaveLength(1);
    expect(parseAddresses({ data: [rawAddress(ID_A)] })).toHaveLength(1);
    expect(parseAddresses(null)).toEqual([]);
  });

  it('lee la dirección guardada dentro de { ok, address }', () => {
    expect(parseSavedAddress({ ok: true, address: rawAddress(ID_A) })?.id).toBe(ID_A);
    expect(parseSavedAddress({ ok: true })).toBeNull();
  });

  it('valida campos obligatorios, teléfono de 10 dígitos y código postal de 5', () => {
    expect(validateAddressInput(validInput)).toEqual({});
    const errors = validateAddressInput({ ...EMPTY_ADDRESS_INPUT, phone: '771', postalCode: '6000' });
    expect(Object.keys(errors).sort()).toEqual(
      ['exteriorNumber', 'municipality', 'neighborhood', 'phone', 'postalCode', 'recipientName', 'references', 'state', 'street'].sort(),
    );
    expect(errors.phone).toBe('Escribe un teléfono de 10 dígitos.');
  });

  it('envía texto limpio, conserva el cero inicial del CP y manda null en el número interior vacío', () => {
    expect(toAddressPayload(validInput)).toEqual({
      recipientName: 'Cliente Ejemplo',
      phone: '7711234567',
      postalCode: '06000',
      state: 'Hidalgo',
      municipality: 'Huejutla de Reyes',
      neighborhood: 'Centro',
      street: 'Calle Ejemplo',
      exteriorNumber: '12',
      interiorNumber: null,
      references: 'Portón negro',
      isDefault: false,
    });
  });

  it('formatea la dirección sin inventar un alias', () => {
    expect(onlyDigits('77a1-12', 5)).toBe('77112');
    expect(formatPhone('7711234567')).toBe('771 123 4567');
    expect(formatAddressTitle({ street: 'Av. Universidad', exteriorNumber: '45', interiorNumber: '3' })).toBe(
      'Av. Universidad 45, Int. 3',
    );
    expect(formatAddressLine({ ...rawAddress(ID_A), interiorNumber: null })).toBe(
      'Calle Ejemplo 12, Col. Centro, Huejutla de Reyes, Hidalgo · CP 06000',
    );
  });
});

describe('Punto de recogida', () => {
  it('es null cuando el backend desactiva la recogida', () => {
    expect(parseDeliveryOptions({ ok: true, pickupLocation: null })).toEqual({ pickupLocation: null });
  });

  it('arma la ubicación con campos opcionales', () => {
    const { pickupLocation } = parseDeliveryOptions({
      ok: true,
      pickupLocation: {
        name: 'Titanium Sport Gym',
        address: 'Av. Ejemplo 8',
        phone: '7710000000',
        municipality: 'Huejutla de Reyes',
        state: 'Hidalgo',
        postalCode: '43000',
        schedule: [{ day: 'Lunes a viernes', opensAt: '6:00', closesAt: '23:00' }],
        instructions: 'Presenta tu número de pedido.',
      },
    });
    expect(pickupLocation).toEqual({
      name: 'Titanium Sport Gym',
      address: 'Av. Ejemplo 8',
      phone: '7710000000',
      city: 'Huejutla de Reyes, Hidalgo · CP 43000',
      schedule: [{ label: 'Lunes a viernes', hours: '6:00 – 23:00' }],
      instructions: 'Presenta tu número de pedido.',
    });
  });

  it('entiende horarios como texto o como mapa día → horas', () => {
    expect(parsePickupSchedule('Lun a vie 6:00–23:00')).toEqual([{ label: 'Horario', hours: 'Lun a vie 6:00–23:00' }]);
    expect(parsePickupSchedule({ Sábado: '8:00 – 16:00', Domingo: '' })).toEqual([{ label: 'Sábado', hours: '8:00 – 16:00' }]);
    expect(parsePickupSchedule(42)).toEqual([]);
  });
});
