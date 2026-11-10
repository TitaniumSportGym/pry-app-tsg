import { Buffer } from 'node:buffer';
import { createHash, X509Certificate } from 'node:crypto';
import { createRequire } from 'node:module';
import { rootCertificates } from 'node:tls';

import app from '../../app.json';
import eas from '../../eas.json';
import originalEas from '../fixtures/eas-before-pinning-lab.json';

const loadCjs = createRequire(__filename);
const fs = loadCjs('node:fs');
const policy = loadCjs('../../config/pinning-lab.cjs');
const { profileEnvironment } = loadCjs('../../scripts/eas-profile-environment.cjs');
const { policiesForLab } = loadCjs('../../plugins/with-network-security.cjs');
const { labDiagnosticsSource } = loadCjs('../../plugins/pinning-lab-diagnostics.cjs');
const configure = loadCjs('../../app.config.js');
const now = Date.now();
// Existing PUBLIC CA certificate, used only as an offline crypto fixture.
// Hostname verification is mocked for successful unit cases. This is never
// written to config/ and is not evidence of Render's certificate or a backup pin.
const publicCertificate = rootCertificates.map(pem => new X509Certificate(pem))
  .find(certificate => Date.parse(certificate.validFrom) < now && now < Date.parse(certificate.validTo))!;
const validPin = policy.spkiPin(publicCertificate);
const invalidPin = createHash('sha256').update(`negative unit fixture:${validPin}`).digest('base64');
const fixture = () => ({
  schemaVersion: 1, purpose: 'temporary-android-pinning-lab', hostname: policy.HOST, port: 443,
  capturedAt: new Date(now).toISOString(), tlsAuthorized: true, hostnameVerified: true, validPin, invalidPin,
  chain: [{ spkiSha256: validPin, certificateDerBase64: publicCertificate.raw.toString('base64') }],
});

function mockSnapshot(snapshot = fixture()) {
  jest.spyOn(X509Certificate.prototype, 'checkHost').mockReturnValue(policy.HOST);
  const exists = fs.existsSync;
  const read = fs.readFileSync;
  jest.spyOn(fs, 'existsSync').mockImplementation((file: unknown) => file === policy.SNAPSHOT_PATH || exists(file));
  jest.spyOn(fs, 'readFileSync').mockImplementation((file: unknown, ...options: unknown[]) => file === policy.SNAPSHOT_PATH ? JSON.stringify(snapshot) : read(file, ...options));
}

function withEnv<T>(environment: Record<string, string>, operation: () => T): T {
  const previous = process.env;
  process.env = { ...environment, NODE_ENV: 'test' };
  try { return operation(); } finally { process.env = previous; }
}

afterEach(() => jest.restoreAllMocks());

it('preserves every field of the five original EAS profiles and submission settings', () => {
  for (const profile of policy.EXISTING_PROFILES as (keyof typeof originalEas.build)[]) {
    expect(eas.build[profile]).toEqual(originalEas.build[profile]);
  }
  expect(eas.cli).toEqual(originalEas.cli);
  expect(eas.submit).toEqual(originalEas.submit);
});

it.each(['development', 'preview', 'arco-debug', 'arco-release', 'production'])('evaluates app.config.js with the actual %s profile and preserves app.json', profile => {
  const env = profileEnvironment(eas, profile, {});
  const source = structuredClone(app.expo);
  expect(withEnv(env, () => configure({ config: source }))).toEqual(app.expo);
  expect(source).toEqual(app.expo);
  expect(policy.getLabSettings(env)).toBeNull();
});

it.each(['pinning-lab-valid', 'pinning-lab-invalid'])('applies the real %s EAS profile without mutating production', profile => {
  mockSnapshot();
  const env = profileEnvironment(eas, profile, {});
  const source = structuredClone(app.expo);
  const result = withEnv(env, () => configure({ config: source }));
  const expected = policy.LAB_VARIANTS[profile];
  expect(result).toMatchObject({ name: expected.name, scheme: expected.scheme, android: { package: expected.package }, extra: { pinningLab: { variant: profile, host: policy.HOST } } });
  expect(result.plugins).toContainEqual([policy.NETWORK_PLUGIN, { labVariant: profile }]);
  expect(result.extra.eas).toEqual(app.expo.extra.eas);
  // EAS exposes profile.env during LOCAL config evaluation, before its worker
  // provides EAS_BUILD_PROFILE. Both paths must resolve the same configuration.
  const localEnv = { ...env }; delete localEnv.EAS_BUILD_PROFILE;
  expect(withEnv(localEnv, () => configure({ config: source }))).toEqual(result);
  expect(source).toEqual(app.expo);
  expect(result.android.blockedPermissions).toEqual(app.expo.android.blockedPermissions);
  expect(result.plugins.find((entry: unknown[]) => Array.isArray(entry) && entry[0] === 'expo-build-properties')).toEqual(app.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-build-properties'));
});

it.each(['pinning-lab-valid', 'pinning-lab-invalid'])('fails %s without a verified snapshot; never substitutes a pin', profile => {
  const exists = fs.existsSync;
  jest.spyOn(fs, 'existsSync').mockImplementation((file: unknown) => file !== policy.SNAPSHOT_PATH && exists(file));
  const env = profileEnvironment(eas, profile, {});
  expect(() => withEnv(env, () => configure({ config: app.expo }))).toThrow('Falta un pin verificado');
});

it.each([
  { EAS_BUILD_PROFILE: 'pinning-lab-valid' },
  { APP_VARIANT: 'pinning-lab-valid' },
  { TSG_PINNING_LAB_PROFILE: 'pinning-lab-valid' },
  { APP_VARIANT: 'unknown' },
])('rejects partial variant configuration %j', env => expect(() => policy.getLabSettings(env)).toThrow());

it('rejects production/development/profile/URL conflicts before reading a pin', () => {
  const env = profileEnvironment(eas, 'pinning-lab-valid', {});
  for (const conflict of [
    { EAS_BUILD_PROFILE: 'production' }, { EAS_BUILD_PROFILE: 'preview' },
    { EAS_BUILD_PROFILE: 'development' }, { EAS_BUILD_PROFILE: 'arco-debug' }, { EAS_BUILD_PROFILE: 'arco-release' },
    { TSG_PINNING_LAB_PROFILE: 'pinning-lab-invalid' }, { EXPO_PUBLIC_API_URL: '' },
    { EXPO_PUBLIC_API_URL: 'https://other.onrender.com' }, { EXPO_PUBLIC_API_URL: 'http://server-titanium.onrender.com' },
    { EXPO_PUBLIC_ARCO_BACKEND_ENABLED: 'true' }, { EAS_BUILD_PLATFORM: 'ios' },
  ]) expect(() => policy.getLabSettings({ ...env, ...conflict }, eas, fixture())).toThrow();
  for (const key of ['APP_VARIANT', 'TSG_PINNING_LAB_PROFILE', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_ARCO_BACKEND_ENABLED']) {
    const missing = { ...env }; delete missing[key];
    expect(() => policy.getLabSettings(missing, eas, fixture())).toThrow();
  }
  const altered = structuredClone(eas);
  altered.build['pinning-lab-valid'].android.buildType = 'app-bundle';
  expect(() => policy.getLabSettings(env, altered, fixture())).toThrow();
});

it('accepts canonical SHA-256 Base64 only and hashes DER SPKI instead of the full certificate', () => {
  const expected = createHash('sha256').update(publicCertificate.publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
  expect(policy.spkiPin(publicCertificate)).toBe(expected);
  expect(policy.spkiPin(publicCertificate)).not.toBe(createHash('sha256').update(publicCertificate.raw).digest('base64'));
  expect(Buffer.from(policy.assertPin(validPin), 'base64')).toHaveLength(32);
  for (const pin of ['', 'sha256/' + validPin, 'a'.repeat(64), validPin.slice(1), '<pin/>', validPin + '\n']) expect(() => policy.assertPin(pin)).toThrow();
});

it('requires verified, fresh TLS evidence and rejects corrupted SPKI, hostname and negative pins', () => {
  mockSnapshot();
  expect(policy.validateSnapshot(fixture(), now)).toMatchObject({ validPin, invalidPin });
  for (const change of [
    { tlsAuthorized: false }, { hostnameVerified: false }, { hostname: 'other.onrender.com' },
    { capturedAt: new Date(now - policy.MAX_SNAPSHOT_AGE_MS - 1).toISOString() },
    { capturedAt: new Date(now + 1000).toISOString() }, { invalidPin: validPin }, { chain: [] },
    { validPin: createHash('sha256').update(publicCertificate.raw).digest('base64') },
    { chain: [{ ...fixture().chain[0], spkiSha256: invalidPin }] },
  ]) expect(() => policy.validateSnapshot({ ...fixture(), ...change }, now)).toThrow();
  const other = rootCertificates.map(pem => new X509Certificate(pem)).find(certificate =>
    policy.spkiPin(certificate) !== validPin && Date.parse(certificate.validFrom) < now && now < Date.parse(certificate.validTo))!;
  expect(() => policy.validateSnapshot({
    ...fixture(), invalidPin: policy.spkiPin(other),
    chain: [...fixture().chain, { spkiSha256: policy.spkiPin(other), certificateDerBase64: other.raw.toString('base64') }],
  }, now)).toThrow('cadena');
  jest.mocked(X509Certificate.prototype.checkHost).mockReturnValue(undefined);
  expect(() => policy.validateSnapshot(fixture(), now)).toThrow('hostname');
});

it('keeps the original policies byte for byte; lab pins use one exact host, no expiry or TLS bypass', () => {
  const original = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false">\n    <trust-anchors><certificates src="system" /></trust-anchors>\n  </base-config>\n</network-security-config>\n`;
  expect(policiesForLab(null).main).toBe(original);
  expect(policiesForLab(null).debug).toBe(original.replace('</network-security-config>', `  <domain-config cleartextTrafficPermitted="true">\n    <domain>localhost</domain>\n    <domain>127.0.0.1</domain>\n    <domain>10.0.2.2</domain>\n  </domain-config>\n</network-security-config>`));
  mockSnapshot();
  const pins = [];
  for (const profile of Object.keys(policy.LAB_VARIANTS)) {
    const lab = policy.getLabSettings(profileEnvironment(eas, profile, {}), eas, fixture(), now);
    pins.push(lab.pin);
    for (const xml of Object.values(policiesForLab(lab)) as string[]) {
      expect(xml).toContain(`<domain includeSubdomains="false">${policy.HOST}</domain>`);
      expect(xml).toContain(`<pin digest="SHA-256">${lab.pin}</pin>`);
      expect(xml.match(/<pin-set>/g)).toHaveLength(1);
      expect(xml).toContain('<certificates src="system" />');
      expect(xml).not.toMatch(/expiration=|src="user"|debug-overrides|overridePins|cleartextTrafficPermitted="true"|includeSubdomains="true"/);
    }
    const diagnostics = labDiagnosticsSource(lab);
    expect(diagnostics).toContain('OkHttpClientProvider.createClientBuilder(context)');
    expect(diagnostics).toContain('url.encodedPath != "/health"');
    expect(diagnostics).toContain('PIN_VERIFICATION_FAILED');
    expect(diagnostics).not.toMatch(/sslSocketFactory|hostnameVerifier|certificatePinner|request\.headers|response\.body/);
  }
  expect(pins).toEqual([validPin, invalidPin]);
  expect(validPin).not.toBe(invalidPin);
});

it('rejects native lab options when the actual profile is production', () => {
  const withNetworkSecurity = loadCjs('../../plugins/with-network-security.cjs');
  expect(() => withEnv(profileEnvironment(eas, 'production', {}), () =>
    withNetworkSecurity(structuredClone(app.expo), { labVariant: 'pinning-lab-valid' }))).toThrow('incompatibles');
});
