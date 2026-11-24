/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import eas from '../../eas.json';
import app from '../../app.json';

jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));
const { selectProfile, validateConfig, verifyResult, verifyApk: verifyArtifact, summary } = jest.requireActual('../../scripts/eas-preview.cjs');
const yaml = jest.requireActual('js-yaml');
const buildId = '11111111-1111-4111-8111-111111111111';
const commit = 'a'.repeat(40);
const originalEnv = { ...process.env };
const originalFetch = global.fetch;
let directory: string;
let resultFile: string;
const verifyApk = (result: unknown) => verifyArtifact(result, directory);

function build(overrides = {}) {
  return { id: buildId, platform: 'ANDROID', buildProfile: 'arco-release', status: 'FINISHED',
    gitCommitHash: commit, app: { id: app.expo.extra.eas.projectId, slug: 'gym', ownerAccount: { name: 'test' } },
    artifacts: { applicationArchiveUrl: 'https://expo.dev/artifacts/eas/test.apk?private-download=not-a-secret' }, ...overrides };
}
function metadata(overrides = {}) {
  fs.writeFileSync(resultFile, JSON.stringify([build(overrides)]));
  return verifyResult(resultFile, path.join(directory, 'build.log'));
}
function response(status: number, bytes: Buffer, location?: string) {
  return { status, headers: { get: () => location }, body: {
    cancel: jest.fn(),
    async *[Symbol.asyncIterator]() { yield bytes; },
  } };
}

beforeEach(() => {
  fs.mkdirSync('coverage', { recursive: true });
  directory = fs.mkdtempSync(path.join(process.cwd(), 'coverage/eas-script-test-'));
  resultFile = path.join(directory, 'build.json');
  process.env.GITHUB_REF = 'refs/heads/feature/actividad6-seguridad-api';
  process.env.GITHUB_SHA = commit;
  process.env.GITHUB_OUTPUT = path.join(directory, 'output');
  process.env.GITHUB_STEP_SUMMARY = path.join(directory, 'summary');
  process.env.ANDROID_HOME = path.join(directory, 'sdk');
  const tools = path.join(process.env.ANDROID_HOME, 'build-tools', '36.0.0');
  fs.mkdirSync(tools, { recursive: true });
  for (const name of ['aapt', 'apksigner']) fs.writeFileSync(path.join(tools, name), '');
  jest.mocked(spawnSync).mockImplementation((tool) => ({
    status: 0, stdout: String(tool).endsWith('aapt') ? `package: name='${app.expo.android.package}' versionCode='1'\n` : '',
    stderr: '', pid: 1, output: [], signal: null,
  }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
  jest.mocked(spawnSync).mockReset();
  // Only the explicitly created test directory inside coverage may be removed.
  expect(path.resolve(directory).startsWith(path.join(process.cwd(), 'coverage', 'eas-script-test-'))).toBe(true);
  fs.rmSync(directory, { recursive: true });
});

it.each([
  ['refs/heads/feature/actividad6-seguridad-api', 'arco-release'],
  ['refs/heads/develop', 'preview'], ['refs/heads/main', 'preview'],
  ['refs/tags/feature/actividad6-seguridad-api', 'preview'], ['refs/pull/85/merge', 'preview'],
])('selects the profile for %s without accepting arbitrary inputs', (ref, expected) => {
  expect(selectProfile(ref)).toBe(expected);
});

it.each([
  ['refs/heads/feature/actividad6-seguridad-api', 'arco-release', 'true'],
  ['refs/heads/develop', 'preview', 'false'],
])('validates the real configuration for %s', (ref, profile, enabled) => {
  process.env.GITHUB_REF = ref;
  expect(validateConfig()).toMatchObject({ profile, arcoEnabled: enabled, apiOrigin: 'https://server-titanium.onrender.com' });
});

it('rejects accidental ARCO deactivation before a remote build', () => {
  const config = JSON.parse(JSON.stringify(eas));
  config.build['arco-release'].env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED = 'false';
  const read = fs.readFileSync;
  jest.spyOn(fs, 'readFileSync').mockImplementation((filename, options) => filename === 'eas.json'
    ? JSON.stringify(config) : read(filename, options));
  expect(() => validateConfig()).toThrow();
});

it.each([
  { buildProfile: 'preview' }, { platform: 'IOS' }, { status: 'ERRORED' }, { status: 'IN_PROGRESS' },
  { gitCommitHash: 'b'.repeat(40) }, { app: { ...build().app, id: buildId } },
  { artifacts: { applicationArchiveUrl: 'https://expo.dev/artifacts/test.aab' } },
  { artifacts: { applicationArchiveUrl: 'http://expo.dev/artifacts/test.apk' } },
])('rejects an incorrect or incomplete remote result: %j', overrides => {
  expect(() => metadata(overrides)).toThrow();
  expect(spawnSync).not.toHaveBeenCalled();
});

it('accepts the existing preview result on develop', () => {
  process.env.GITHUB_REF = 'refs/heads/develop';
  expect(metadata({ buildProfile: 'preview' }).config.profile).toBe('preview');
  expect(spawnSync).not.toHaveBeenCalled();
});

it('recovers only the build page from a failed CLI log', () => {
  fs.writeFileSync(resultFile, '');
  fs.writeFileSync(path.join(directory, 'build.log'), `private-token https://expo.dev/accounts/test/projects/gym/builds/${buildId}`);
  expect(() => verifyResult(resultFile, path.join(directory, 'build.log'))).toThrow(/JSON verificable/);
  expect(fs.readFileSync(process.env.GITHUB_OUTPUT!, 'utf8')).not.toContain('private-token');
});

it('downloads without credentials and checks the real manifest and APK signature', async () => {
  const bytes = Buffer.from('504b03040011223344556677', 'hex');
  global.fetch = jest.fn().mockResolvedValue(response(200, bytes));
  process.env.EXPO_TOKEN = 'private-token';
  const result = metadata();
  await verifyApk(result);
  expect(global.fetch).toHaveBeenCalledWith(result.artifact, expect.objectContaining({ redirect: 'manual' }));
  expect(jest.mocked(global.fetch).mock.calls[0][1]).not.toHaveProperty('headers');
  expect(spawnSync).toHaveBeenNthCalledWith(1, expect.stringMatching(/aapt$/), ['dump', 'badging', expect.stringMatching(/application\.apk$/)], expect.anything());
  expect(spawnSync).toHaveBeenNthCalledWith(2, expect.stringMatching(/apksigner$/), ['verify', expect.anything()], expect.anything());
  const evidence = fs.readFileSync(path.join(directory, 'apk-verification.json'), 'utf8');
  expect(JSON.parse(evidence)).toMatchObject({ sha256: createHash('sha256').update(bytes).digest('hex'), signatureVerified: true, profile: 'arco-release' });
  expect(evidence).not.toMatch(/private-token|private-download/);
  expect(fs.readFileSync(process.env.GITHUB_OUTPUT!, 'utf8')).toContain('apk_verified=true');
});

it.each(['html', 'package', 'signature', 'debuggable'])('rejects an artifact failing %s validation', async fault => {
  global.fetch = jest.fn().mockResolvedValue(response(200, fault === 'html' ? Buffer.from('<html>Error</html>') : Buffer.from('504b030400112233', 'hex')));
  if (fault === 'package' || fault === 'debuggable') {
    jest.mocked(spawnSync).mockReturnValue({ status: 0, stdout: fault === 'package' ? "package: name='other.app'" : `package: name='${app.expo.android.package}'\napplication-debuggable`, stderr: '', pid: 1, output: [], signal: null });
  }
  if (fault === 'signature') jest.mocked(spawnSync).mockReturnValueOnce({ status: 0, stdout: `package: name='${app.expo.android.package}'`, stderr: '', pid: 1, output: [], signal: null })
    .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'private-data', pid: 1, output: [], signal: null });
  await expect(verifyApk(metadata())).rejects.toThrow();
  expect(fs.readFileSync(process.env.GITHUB_OUTPUT!, 'utf8')).not.toContain('apk_verified=true');
});

it('rejects HTTPS downgrade and never logs signed URLs from transport errors', async () => {
  global.fetch = jest.fn().mockResolvedValue(response(302, Buffer.alloc(0), 'http://other.test/private.apk'));
  await expect(verifyApk(metadata())).rejects.toThrow('No se pudo descargar la APK por HTTPS para verificarla.');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  global.fetch = jest.fn().mockRejectedValue(new Error('https://other.test/private.apk?secret=private-token'));
  await expect(verifyApk(metadata())).rejects.toThrow('No se pudo descargar la APK por HTTPS para verificarla.');
  expect(JSON.stringify(jest.mocked(console.log).mock.calls)).not.toContain('private-token');
});

it('reports the selected profile without claiming binary success prematurely', () => {
  process.env.QUALITY_RESULT = 'success'; process.env.BUILD_RESULT = 'failure';
  summary();
  const content = fs.readFileSync(process.env.GITHUB_STEP_SUMMARY!, 'utf8');
  expect(content).toContain('arco-release');
  expect(content).toContain('pendiente / falló');
  expect(content).toContain('No hay una APK aprobada');
});

it('keeps manual dispatch, quality gates and the GitHub token in the workflow', () => {
  const workflow = yaml.load(fs.readFileSync('.github/workflows/eas-preview.yml', 'utf8'));
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflow.jobs.build.needs).toEqual(['calidad']);
  const quality = workflow.jobs.calidad.steps.map((step: { run?: string }) => step.run).filter(Boolean).join('\n');
  for (const command of ['npm run lint', 'npx tsc --noEmit', 'npm run test:unit', 'npm run test:integration', 'npm run test:acceptance', 'npm test', 'node scripts/verify-android-release.cjs']) expect(quality).toContain(command);
  const steps = workflow.jobs.build.steps;
  const compile = steps.find((step: { id?: string }) => step.id === 'compilar');
  expect(compile.run).toContain('--profile "$EAS_BUILD_PROFILE" --non-interactive --wait --json');
  expect(steps.find((step: { uses?: string }) => step.uses?.startsWith('expo/expo-github-action')).with.token).toBe('${{ secrets.EXPO_TOKEN }}');
  expect(steps.some((step: { run?: string }) => step.run === 'node scripts/eas-preview.cjs validate')).toBe(true);
  expect(JSON.stringify(workflow)).not.toContain('aviso-publicado.pdf');
});
