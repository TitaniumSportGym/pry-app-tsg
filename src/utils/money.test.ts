import { formatPrice } from '@/features/memberships/models/membership';
import { formatPaymentAmount } from '@/features/payments/models/payment';
import { formatProductPrice } from '@/features/store/models/product';

import { separateThousands } from './money';

describe('formatos monetarios MXN compartidos', () => {
  it.each([
    [0, '$0', '$0.00'],
    [-0, '$0', '$0.00'],
    [70, '$70', '$70.00'],
    [999.5, '$999.50', '$999.50'],
    [999.999, '$1,000', '$1,000.00'],
    [1234567.89, '$1,234,567.89', '$1,234,567.89'],
    [-1234.5, '$-1,234.50', '$-1,234.50'],
    [1.005, '$1', '$1.00'],
    [Number.MAX_SAFE_INTEGER, '$9,007,199,254,740,991', '$9,007,199,254,740,991.00'],
    [1e22, '$1e+22.undefined', '$1e+22.undefined'],
    [NaN, '$NaN.undefined', '$NaN.undefined'],
    [Infinity, '$Infinity.undefined', '$Infinity.undefined'],
    [-Infinity, '$-Infinity.undefined', '$-Infinity.undefined'],
  ] as const)('preserva el formato y redondeo para %s', (amount, membership, fixedDecimals) => {
    expect(formatPrice(amount)).toBe(membership);
    expect(formatPaymentAmount(amount)).toBe(fixedDecimals);
    expect(formatProductPrice(amount)).toBe(fixedDecimals);
  });

  it.each([
    ['', ''], ['0', '0'], ['12', '12'], ['123', '123'], ['1234', '1,234'],
    ['123456', '123,456'], ['-1234567', '-1,234,567'], ['NaN', 'NaN'], ['1e+21', '1e+21'],
  ])('separa miles en %j', (input, expected) => {
    expect(separateThousands(input)).toBe(expected);
  });

  it('agrupa cadenas de dígitos largas sin perder ceros', () => {
    expect(separateThousands('123' + '456'.repeat(30_000))).toBe('123' + ',456'.repeat(30_000));
    expect(separateThousands('000000')).toBe('000,000');
    expect(separateThousands('9'.repeat(100_000) + 'x')).toBe('9'.repeat(100_000) + 'x');
  });
});
