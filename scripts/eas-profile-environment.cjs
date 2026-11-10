'use strict';

const assert = require('node:assert/strict');

// Resolve the inheritance used by this repository, including arco-debug's env.
function resolveProfile(eas, name, seen = new Set()) {
  assert.ok(!seen.has(name), 'Herencia circular de perfiles EAS.');
  const profile = eas.build?.[name];
  assert.ok(profile, `Perfil EAS inexistente: ${name}`);
  if (!profile.extends) return structuredClone(profile);
  seen.add(name);
  const parent = resolveProfile(eas, profile.extends, seen);
  return { ...parent, ...profile, env: { ...parent.env, ...profile.env }, android: { ...parent.android, ...profile.android } };
}

function profileEnvironment(eas, name, inherited = process.env) {
  const env = { ...inherited };
  for (const key of ['APP_VARIANT', 'TSG_PINNING_LAB_PROFILE', 'EAS_BUILD_PROFILE', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_ARCO_BACKEND_ENABLED']) delete env[key];
  return {
    ...env, ...resolveProfile(eas, name).env,
    EAS_BUILD_PROFILE: name, CI: '1', EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1',
  };
}

module.exports = { resolveProfile, profileEnvironment };
