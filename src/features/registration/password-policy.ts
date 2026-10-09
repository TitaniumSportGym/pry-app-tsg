export const passwordRequirements = [
  {
    key: 'length',
    label: 'Al menos 8 caracteres',
    validate: (password: string) => password.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Incluye una letra mayúscula',
    validate: (password: string) => /[A-Z]/.test(password),
  },
  {
    key: 'lowercase',
    label: 'Incluye una letra minúscula',
    validate: (password: string) => /[a-z]/.test(password),
  },
  {
    key: 'number',
    label: 'Incluye un número',
    validate: (password: string) => /\d/.test(password),
  },
  {
    key: 'symbol',
    label: 'Incluye un símbolo',
    validate: (password: string) => /[^A-Za-z0-9\s]/.test(password),
  },
] as const;

export function isPasswordValid(password: string) {
  return passwordRequirements.every((requirement) => requirement.validate(password));
}
