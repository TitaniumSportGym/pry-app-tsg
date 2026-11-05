const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

function loadBaseUrl(value?: string) {
  if (value === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = value;

  let result = '';
  jest.isolateModules(() => {
    const { getApiBaseUrl } = jest.requireActual<typeof import('./env')>('./env');
    result = getApiBaseUrl();
  });
  return result;
}

afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

describe('getApiBaseUrl', () => {
  it.each([
    [' https://api.example.com/// ', 'https://api.example.com'],
    ['https://api.example.com/api/v1/', 'https://api.example.com/api/v1'],
    ['https://api.example.com', 'https://api.example.com'],
    ['/', ''],
    ['///', ''],
    ['not-a-url///', 'not-a-url'],
    ['https://api.example.com/a//b', 'https://api.example.com/a//b'],
  ])('preserva la normalización existente para %j', (input, expected) => {
    expect(loadBaseUrl(input)).toBe(expected);
  });

  it.each([undefined, '', ' \t\n '])('rechaza una configuración vacía: %j', (input) => {
    expect(() => loadBaseUrl(input)).toThrow('Missing EXPO_PUBLIC_API_URL');
  });

  it('procesa cadenas largas con y sin barras finales', () => {
    const base = `https://api.example.com/${'a'.repeat(100_000)}`;
    expect(loadBaseUrl(base + '/'.repeat(100_000))).toBe(base);
    expect(loadBaseUrl(base)).toBe(base);
    expect(loadBaseUrl('/'.repeat(100_000))).toBe('');
  });
});
