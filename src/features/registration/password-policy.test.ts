import { isPasswordValid, passwordRequirements } from './password-policy';

describe('registration password policy', () => {
  it('accepts a password that satisfies every backend requirement', () => {
    expect(isPasswordValid('Titanium1!')).toBe(true);
  });

  it.each([
    ['length', 'Tsg1!'],
    ['uppercase', 'titanium1!'],
    ['lowercase', 'TITANIUM1!'],
    ['number', 'Titanium!'],
    ['symbol', 'Titanium1'],
  ])('rejects a password without %s', (_, password) => {
    expect(isPasswordValid(password)).toBe(false);
  });

  it('keeps the five rules required by the registration endpoint', () => {
    expect(passwordRequirements).toHaveLength(5);
  });
});
