import { getTokenFromGoogleCallback, GoogleAuthError } from './google-auth-callback';

describe('Google mobile OAuth callback', () => {
  it('extracts the token from the expected application callback', () => {
    expect(getTokenFromGoogleCallback('pryapptsg://oauth-callback?token=jwt-seguro')).toBe(
      'jwt-seguro',
    );
  });

  it('rejects callbacks from another scheme', () => {
    expect(() => getTokenFromGoogleCallback('https://example.com/oauth-callback?token=jwt')).toThrow(
      GoogleAuthError,
    );
  });

  it('rejects callbacks without a token', () => {
    expect(() => getTokenFromGoogleCallback('pryapptsg://oauth-callback')).toThrow(
      GoogleAuthError,
    );
  });

  it('rejects OAuth error callbacks', () => {
    expect(() =>
      getTokenFromGoogleCallback('pryapptsg://oauth-callback?error=access_denied'),
    ).toThrow(GoogleAuthError);
  });
});
