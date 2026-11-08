import eas from '../../eas.json';
import app from '../../app.json';
import { resolveApiRequestUrl } from '../../src/config/api-url-policy';

type Profile = { extends?: string; distribution?: string; developmentClient?: boolean; environment?: string; env?: Record<string, string>; android?: { buildType?: string } };
const profiles: Record<string, Profile> = eas.build;
function effective(name: string): Profile {
  const profile = profiles[name];
  if (!profile.extends) return profile;
  const parent = effective(profile.extends);
  return { ...parent, ...profile, env: { ...parent.env, ...profile.env }, android: { ...parent.android, ...profile.android } };
}

it.each(['development', 'preview'])('keeps ARCO disabled in the standard %s profile', name => {
  expect(effective(name).env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED).toBe('false');
});
it('pins the production API and enables the reviewed ARCO client with an incremented AAB version', () => {
  expect(eas.build.production.env).toEqual({ EXPO_PUBLIC_API_URL:'https://server-titanium.onrender.com', EXPO_PUBLIC_ARCO_BACKEND_ENABLED:'true' });
  expect(eas.cli.appVersionSource).toBe('remote');
  expect(eas.build.production.autoIncrement).toBe(true);
  expect(app.expo.name).toBe('Titanium Sport Gym');
});

it.each(['arco-debug', 'arco-release'])('isolates activation to the internal %s profile', name => {
  const profile = effective(name);
  expect(profile.env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED).toBe('true');
  expect(profile.env?.EXPO_PUBLIC_API_URL).toBe('https://server-titanium.onrender.com');
  expect(profile.distribution).toBe('internal');
  expect(profile.environment).not.toBe('production');
});

it('uses a Debug client for arco-debug and a Release APK for arco-release', () => {
  expect(effective('arco-debug').developmentClient).toBe(true);
  expect(effective('arco-release').developmentClient).not.toBe(true);
  expect(effective('arco-release').android?.buildType).toBe('apk');
  expect(effective('production').android?.buildType).toBe('app-bundle');
});

it('keeps arco-release self-contained and preserves its R8 reports', () => {
  expect(profiles['arco-release'].extends).toBeUndefined();
  expect(eas.build['arco-release'].android.buildArtifactPaths).toContain('android/app/build/outputs/mapping/release/**');
  const buildProperties = app.expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
  expect(buildProperties).toEqual(['expo-build-properties', { android: { targetSdkVersion:36, enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true } }]);
});

it.each([
  '/api/auth/register', '/api/auth/login', '/api/privacy/notice', '/api/user/profile',
  '/api/user/privacy-consents', '/api/user/privacy-preferences', '/api/auth/reauthenticate',
  '/api/auth/reauthenticate/verify', '/api/user/account-cancellation-requests',
])('builds the real Render URL with one /api prefix for %s without networking', path => {
  const base = effective('arco-release').env!.EXPO_PUBLIC_API_URL;
  expect(new URL(base).pathname).toBe('/');
  const url = resolveApiRequestUrl(base, path, false);
  expect(url).toBe(`https://server-titanium.onrender.com${path}`);
  expect(url).not.toContain('/api/api/');
});
