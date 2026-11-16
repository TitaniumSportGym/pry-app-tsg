import { X509Certificate, createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import snapshot from '../../config/alpha-pinning-public-chain.json';
import app from '../../app.json';
import eas from '../../eas.json';
import manifest from '../../package.json';

const load = createRequire(__filename);
const tls = load('node:tls');
const { HOST, API_ORIGIN, PACKAGE, MAX_SNAPSHOT_AGE_MS, assertPin, spkiPin, getSettings,
  configureApp, verifyPublicChain } = load('../../config/alpha-pinning.cjs');
const networkPlugin = load('../../plugins/with-network-security.cjs');
const { policiesForAlpha } = networkPlugin;
const { certificatePinnerSource } = load('../../plugins/alpha-certificate-pinner.cjs');
const { assertPeerPin, capturePublicChain } = load('../../scripts/verify-alpha-pinning.cjs');
const { validateRemoteVersion, inspectBuild } = load('../../scripts/eas-production.cjs');
const root = path.resolve(__dirname, '../..');
const captured = Date.parse(snapshot.capturedAt);
const certificates = snapshot.chain.map(entry => new X509Certificate(Buffer.from(entry.certificateDerBase64, 'base64')));
const wrongPin = createHash('sha256').update('test-only-alpha-negative-control').digest('base64');

afterEach(() => jest.restoreAllMocks());

it('validates the real captured public chain and leaf SPKI offline without certificate mocks', () => {
  const active = getSettings(snapshot, { now: captured + 1 });
  expect(active).toMatchObject({ host: HOST, apiOrigin: API_ORIGIN, pins: [snapshot.spkiSha256] });
  expect(certificates[0].ca).toBe(false);
  expect(certificates[0].checkHost(HOST)).toBeTruthy();
  expect(verifyPublicChain(certificates, captured)).toEqual(snapshot.trustAnchor);
  expect(snapshot.operationalBackup).toBeNull();
  expect(snapshot).not.toHaveProperty('invalidPin');
  expect(snapshot.mode).toBe('academic-alpha');
});

it('hashes SPKI DER, not certificate DER, and accepts only canonical SHA-256 Base64', () => {
  expect(spkiPin(certificates[0])).toBe(createHash('sha256').update(certificates[0].publicKey.export({ type: 'spki', format: 'der' })).digest('base64'));
  expect(spkiPin(certificates[0])).not.toBe(createHash('sha256').update(certificates[0].raw).digest('base64'));
  expect(assertPin(snapshot.spkiSha256)).toBe(snapshot.spkiSha256);
  for (const value of ['', null, 'a'.repeat(64), 'sha256/' + snapshot.spkiSha256, 'A'.repeat(43) + '=', 'Z'.repeat(43) + '=']) {
    expect(() => assertPin(value)).toThrow();
  }
});

it('accepts the correct pin and explicitly rejects a different SPKI or a CA substituted as backup', () => {
  expect(() => assertPeerPin(snapshot, snapshot.spkiSha256)).not.toThrow();
  expect(snapshot.chain.every(entry => entry.spkiSha256 !== wrongPin)).toBe(true);
  expect(() => assertPeerPin(snapshot, wrongPin)).toThrow('SPKI_PIN_MISMATCH');
  expect(() => getSettings({ ...snapshot, spkiSha256: wrongPin }, { now: captured })).toThrow('leaf verificado');
  expect(() => getSettings({ ...snapshot, spkiSha256: snapshot.chain[1].spkiSha256 }, { now: captured })).toThrow();
  expect(() => getSettings({ ...snapshot, operationalBackup: snapshot.chain[1].spkiSha256 }, { now: captured })).toThrow();
});

it('rejects future, outdated, absent and expired evidence instead of disabling pinning', () => {
  expect(() => getSettings(snapshot, { now: captured - 1 })).toThrow('24 horas');
  expect(() => getSettings(snapshot, { now: captured + MAX_SNAPSHOT_AGE_MS + 1 })).toThrow('24 horas');
  expect(() => getSettings(null)).toThrow();
  const expired = Date.parse(certificates[0].validTo) + 1000;
  expect(() => getSettings({ ...snapshot, capturedAt: new Date(expired).toISOString() }, { now: expired })).toThrow('no vigente');
  expect(() => policiesForAlpha({ ...snapshot, capturedAt: '2000-01-01T00:00:00Z' })).toThrow();
});

it('rejects wrong host, mode, origin and untrusted transport metadata', () => {
  for (const mutation of [{ hostname: 'outside.example.test' }, { apiOrigin: 'https://outside.example.test' },
    { mode: 'pinning-lab-valid' }, { purpose: 'temporary-android-pinning-lab' }, { rotationRiskAccepted: false },
    { tlsAuthorized: false }, { hostnameVerified: false }, { tlsProtocol: 'TLSv1' }, { caSource: 'local-system-ca' }, { chain: [] },
    { trustAnchor: { ...snapshot.trustAnchor, spkiSha256: wrongPin } }]) {
    expect(() => getSettings({ ...snapshot, ...mutation }, { now: captured })).toThrow();
  }
});

it('verifies certificate signatures and public-root anchoring rather than trusting JSON flags', () => {
  const corrupted = structuredClone(snapshot);
  const bytes = Buffer.from(corrupted.chain[0].certificateDerBase64, 'base64');
  bytes[bytes.length - 1] ^= 1;
  corrupted.chain[0].certificateDerBase64 = bytes.toString('base64');
  expect(() => getSettings(corrupted, { now: captured })).toThrow('Firma/cadena');
  expect(() => verifyPublicChain(certificates, captured, [])).toThrow('CA pública');
  const withoutLeaf = certificates.slice(1);
  expect(() => verifyPublicChain(withoutLeaf, captured)).toThrow('clave leaf');
});

it('generates identical exact-host pins in native OkHttp CertificatePinner and Android XML', () => {
  const policy = policiesForAlpha(snapshot);
  const kotlin = certificatePinnerSource(snapshot);
  for (const variant of ['main', 'debug']) {
    expect([...policy[variant].matchAll(/<pin digest="SHA-256">(.*?)<\/pin>/g)].map(match => match[1])).toEqual([snapshot.spkiSha256]);
    expect(policy[variant]).toContain(`<domain includeSubdomains="false">${HOST}</domain>`);
    expect(policy[variant]).toContain('<certificates src="system" />');
    expect(policy[variant]).not.toMatch(/expiration=|overridePins|debug-overrides|src="user"/);
  }
  expect(policy.main).not.toContain('cleartextTrafficPermitted="true"');
  expect([...policy.debug.matchAll(/<domain>(.*?)<\/domain>/g)].map(match => match[1])).toEqual(['localhost', '127.0.0.1', '10.0.2.2']);
  expect(kotlin).toContain(`.add("${HOST}", "sha256/${snapshot.spkiSha256}")`);
  expect(kotlin).toContain('CertificatePinner.Builder()');
  expect(kotlin).toContain('OkHttpClientProvider.createClientBuilder(applicationContext)');
  expect(kotlin).toContain('.certificatePinner(pinner)');
  expect(kotlin).not.toMatch(/TrustManager|hostnameVerifier|sslSocketFactory|Log\.|TitaniumPinningLab/);
  expect(() => networkPlugin(app.expo, { labVariant: 'pinning-lab-invalid' })).toThrow();
});

it.each(['http://server-titanium.onrender.com', 'https://server-titanium.onrender.com/',
  'https://server-titanium.onrender.com/api', 'https://outside.example.test',
  'https://user@server-titanium.onrender.com', 'https://server-titanium.onrender.com:8443'])('rejects production endpoint %s', origin => {
  expect(() => configureApp(app.expo, { EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_API_URL: origin }, snapshot, eas)).toThrow();
});

it('keeps all official EAS profiles and refuses lab profiles, packages and public disable flags', () => {
  for (const [profile, build] of Object.entries(eas.build)) {
    const env = { EAS_BUILD_PROFILE: profile, ...build.env };
    expect(configureApp(app.expo, env, snapshot, eas)).toBe(app.expo);
  }
  for (const env of [{ APP_VARIANT: 'pinning-lab-valid' }, { TSG_PINNING_LAB_PROFILE: 'pinning-lab-invalid' },
    { EAS_BUILD_PROFILE: 'pinning-lab-valid' }, { EAS_BUILD: 'true' }]) {
    expect(() => configureApp(app.expo, env, snapshot, eas)).toThrow();
  }
  expect(() => configureApp({ ...app.expo, android: { ...app.expo.android, package: PACKAGE + '.lab.valid' } }, {}, snapshot, eas)).toThrow();
  const flags = { EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_API_URL: API_ORIGIN, EXPO_PUBLIC_PINNING_ENABLED: 'false' };
  expect(configureApp(app.expo, flags, snapshot, eas)).toBe(app.expo);
  expect(() => configureApp(app.expo, flags, { ...snapshot, capturedAt: '2000-01-01T00:00:00Z' }, eas)).toThrow();
});

it('preserves identity, remote versioning, AAB format, permission blocks and signing policy', () => {
  expect(app.expo.android.package).toBe(PACKAGE);
  expect(app.expo.version).toBe('1.0.0');
  expect(app.expo.extra.eas.projectId).toBe('e2d585a9-0d83-4bcb-ac53-d1a240ed6e74');
  expect(eas.cli.appVersionSource).toBe('remote');
  expect(eas.build.production.autoIncrement).toBe(true);
  expect(eas.build.production.android.buildType).toBe('app-bundle');
  expect(eas.submit.production).toEqual({});
  expect(eas.build.production).not.toHaveProperty('credentialsSource');
  expect(app.expo.android.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO']));
  expect(manifest.scripts['eas-build-post-install']).toBe('node scripts/verify-alpha-pinning.cjs --build');
  const workflow = readFileSync(path.join(root, '.github/workflows/eas-production.yml'), 'utf8');
  expect(workflow.match(/verify-alpha-pinning\.cjs --check/g)).toHaveLength(2);
  expect(workflow).toContain('--freeze-credentials');
  expect(workflow).toContain('build:version:get --platform android --profile production');
});

it('rejects version counters behind Alpha 4 and refuses finished AAB results with versionCode <=4', () => {
  expect(validateRemoteVersion({ versionCode: '4' })).toEqual({ currentVersionCode: 4, minimumNextVersionCode: 5 });
  for (const value of [null, {}, { versionCode: '3' }, { versionCode: '-1' }]) expect(() => validateRemoteVersion(value)).toThrow();
  const build = { id: '11111111-1111-4111-8111-111111111111', platform: 'ANDROID', buildProfile: 'production', status: 'FINISHED',
    distribution: 'STORE', appBuildVersion: '4', gitCommitHash: 'a'.repeat(40), app: { id: app.expo.extra.eas.projectId, slug: 'pry-app-tsg', ownerAccount: { name: 'fixture' } },
    artifacts: { applicationArchiveUrl: 'https://example.test/app.aab' } };
  expect(() => inspectBuild(build, 'a'.repeat(40))).toThrow('superior a 4');
  expect(inspectBuild({ ...build, appBuildVersion: '5' }, 'a'.repeat(40)).versionCode).toBe('5');
});

it('uses strict public TLS capture options and rejects unauthorized connections (mock transport only)', async () => {
  const peers = snapshot.chain.map(entry => ({ raw: Buffer.from(entry.certificateDerBase64, 'base64'),
    subjectaltname: new X509Certificate(Buffer.from(entry.certificateDerBase64, 'base64')).subjectAltName,
    issuerCertificate: undefined as unknown }));
  peers.forEach((peer, index) => { peer.issuerCertificate = peers[index + 1] || peer; });
  const socket = Object.assign(new EventEmitter(), { authorized: true, setTimeout: jest.fn(), destroy: jest.fn(),
    getPeerCertificate: () => peers[0], getProtocol: () => 'TLSv1.3' });
  const connect = jest.spyOn(tls, 'connect').mockImplementation(() => {
    queueMicrotask(() => socket.emit('secureConnect'));
    return socket;
  });
  await expect(capturePublicChain()).resolves.toMatchObject({ hostname: HOST, spkiSha256: snapshot.spkiSha256 });
  expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: HOST, servername: HOST, port: 443,
    rejectUnauthorized: true, checkServerIdentity: tls.checkServerIdentity, ca: tls.rootCertificates }));
  expect(socket.destroy).toHaveBeenCalled();
  const correctHostnames = peers[0].subjectaltname;
  peers[0].subjectaltname = 'DNS:outside.example.test';
  await expect(capturePublicChain()).rejects.toThrow();
  peers[0].subjectaltname = correctHostnames;
  socket.authorized = false;
  await expect(capturePublicChain()).rejects.toThrow();
});

it('has no laboratory screens or permissive TLS validators in application and native plugin code', () => {
  const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.(?:[jt]sx?|cjs|java|kt)$/.test(entry.name) ? [file] : [];
  });
  const source = [...files(path.join(root, 'src')), ...files(path.join(root, 'plugins'))].map(file => readFileSync(file, 'utf8')).join('\n');
  expect(source).not.toMatch(/TitaniumPinningLab|pinning-lab-panel|rejectUnauthorized\s*:\s*false|TrustAll|ALLOW_ALL_HOSTNAME_VERIFIER|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/);
  // This API client keeps the normal React Native fetch path and bearer policy.
  const client = readFileSync(path.join(root, 'src/services/apiClient.ts'), 'utf8');
  expect(client).toContain('await fetch(url,');
  expect(client).toContain('getAccessToken');
  expect(client).toContain('Bearer ${token}');
});
