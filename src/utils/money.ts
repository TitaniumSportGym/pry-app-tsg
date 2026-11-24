/** Groups an integer's digits in one pass, independent of device locale. */
export function separateThousands(integer: string): string {
  const sign = integer.startsWith('-') ? '-' : '';
  const digits = integer.slice(sign.length);
  // Keep non-finite and exponential representations unchanged, as before.
  if (!/^\d+$/.test(digits)) return integer;

  const firstGroupLength = digits.length % 3 || 3;
  const groups = [digits.slice(0, firstGroupLength)];
  for (let index = firstGroupLength; index < digits.length; index += 3) {
    groups.push(digits.slice(index, index + 3));
  }
  return sign + groups.join(',');
}

/** Existing MXN rounding and decimals; memberships omit a zero fractional part. */
export function formatMxnAmount(amount: number, omitZeroDecimals = false): string {
  const [integer, decimals] = (Math.round(amount * 100) / 100).toFixed(2).split('.');
  const formatted = `$${separateThousands(integer)}`;
  return omitZeroDecimals && decimals === '00' ? formatted : `${formatted}.${decimals}`;
}
