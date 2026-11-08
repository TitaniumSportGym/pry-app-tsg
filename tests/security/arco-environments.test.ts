import eas from '../../eas.json';

type Profile = { extends?: string; distribution?: string; developmentClient?: boolean; environment?: string; env?: Record<string, string>; android?: { buildType?: string } };
const profiles: Record<string, Profile> = eas.build;
function effective(name: string): Profile {
  const profile = profiles[name];
  if (!profile.extends) return profile;
  const parent = effective(profile.extends);
  return { ...parent, ...profile, env: { ...parent.env, ...profile.env }, android: { ...parent.android, ...profile.android } };
}

it.each(['development', 'preview', 'production'])('keeps ARCO disabled in the standard %s profile', name => {
  expect(effective(name).env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED).toBe('false');
});

it.each(['arco-debug', 'arco-release'])('isolates activation to the internal %s profile', name => {
  const profile = effective(name);
  expect(profile.env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED).toBe('true');
  expect(profile.env?.EXPO_PUBLIC_API_URL).toBe('https://arco-staging.example.invalid');
  expect(profile.env?.EXPO_PUBLIC_API_URL).not.toBe(effective('preview').env?.EXPO_PUBLIC_API_URL);
  expect(profile.distribution).toBe('internal');
  expect(profile.environment).not.toBe('production');
});

it('uses a Debug client for arco-debug and a Release APK for arco-release', () => {
  expect(effective('arco-debug').developmentClient).toBe(true);
  expect(effective('arco-release').developmentClient).not.toBe(true);
  expect(effective('arco-release').android?.buildType).toBe('apk');
  expect(effective('production').android?.buildType).toBe('app-bundle');
});
