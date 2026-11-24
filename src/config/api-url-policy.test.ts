import { resolveApiRequestUrl, validateApiUrl } from './api-url-policy';

describe('API transport and origin policy', () => {
  it.each(['https://api.example.test', 'https://api.example.test:8443/v1'])('accepts HTTPS in Release: %s', value => {
    expect(validateApiUrl(value, false).protocol).toBe('https:');
  });
  it.each([
    'http://api.example.test', 'http://localhost:3000', 'http://127.0.0.1:3000',
    'ftp://api.example.test', 'file:///etc/passwd', 'not-a-url',
    'https://name:secret@api.example.test', 'https://api.example.test/#token',
    'https://api.example.test\\@evil.test', 'https://api.example.test\n.evil.test',
  ])('rejects an unsafe Release URL: %s', value => {
    expect(() => validateApiUrl(value, false)).toThrow();
  });
  it.each(['localhost', '127.0.0.1', '10.0.2.2'])('allows only a local Debug HTTP host: %s', host => {
    expect(validateApiUrl(`http://${host}:3000`, true).hostname).toBe(host);
  });
  it.each(['http://api.example.test', 'http://192.168.1.5', 'http://localhost.evil.test'])('still rejects remote HTTP in Debug: %s', value => {
    expect(() => validateApiUrl(value, true)).toThrow();
  });
  it('resolves relative and same-origin absolute paths, preserving API base paths', () => {
    expect(resolveApiRequestUrl('https://api.example.test/v1', '/users?limit=20', false)).toBe('https://api.example.test/v1/users?limit=20');
    expect(resolveApiRequestUrl('https://api.example.test', 'api/profile', false)).toBe('https://api.example.test/api/profile');
    expect(resolveApiRequestUrl('https://api.example.test', 'https://API.example.test:443/api/profile', false)).toBe('https://api.example.test/api/profile');
  });
  it.each(['https://evil.test/api', '//evil.test/api', 'https://api.example.test:8443/api', ' https://api.example.test/api', '/api\\evil'])('blocks origin/path confusion: %s', value => {
    expect(() => resolveApiRequestUrl('https://api.example.test', value, false)).toThrow();
  });
  it('does not permit secret-bearing base queries', () => {
    expect(() => resolveApiRequestUrl('https://api.example.test?token=secret', '/api', false)).toThrow();
  });
});
