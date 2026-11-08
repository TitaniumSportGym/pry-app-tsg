'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const API_ORIGIN = 'https://server-titanium.onrender.com';
const PROJECT_ID = 'e2d585a9-0d83-4bcb-ac53-d1a240ed6e74';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function validateConfig(eas = read('eas.json'), app = read('app.json').expo, manifest = read('package.json')) {
  const build = eas.build?.production;
  assert.equal(app.name, 'Titanium Sport Gym');
  assert.equal(app.android?.package, 'com.titaniumsportgym.app');
  assert.equal(app.extra?.eas?.projectId, PROJECT_ID, 'Conservar el proyecto EAS existente.');
  assert.match(manifest.dependencies?.expo || '', /^[~^]?58\./, 'Conservar Expo SDK 58.');
  assert.equal(build?.android?.buildType, 'app-bundle', 'Production debe generar AAB.');
  assert.equal(build.environment, 'production');
  assert.ok(!build.distribution || build.distribution === 'store');
  assert.notEqual(build.developmentClient, true);
  assert.equal(build.extends, undefined);
  assert.equal(build.android.gradleCommand, undefined, 'No se permiten overrides del formato Gradle.');
  assert.equal(build.android.developmentClient, undefined);
  assert.equal(build.env?.EXPO_PUBLIC_API_URL, API_ORIGIN, 'Origen HTTPS fijo, sin /api, query o credenciales.');
  assert.equal(build.env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED, 'true');
  assert.equal(eas.cli?.appVersionSource, 'remote');
  assert.equal(build.autoIncrement, true);
  const plugin = app.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-build-properties');
  assert.equal(plugin?.[1]?.android?.enableMinifyInReleaseBuilds, true);
  assert.equal(plugin?.[1]?.android?.enableShrinkResourcesInReleaseBuilds, true);
  assert.ok(plugin?.[1]?.android?.targetSdkVersion >= 36, 'Se requiere targetSdk 36 o superior.');
  assert.ok(app.plugins.includes('./plugins/with-network-security.cjs'));
  assert.ok(build.android.buildArtifactPaths.includes('android/app/build/outputs/mapping/release/**'));
  return { projectId: PROJECT_ID, apiOrigin: API_ORIGIN, profile: 'production', format: 'aab' };
}
async function verifyBackend(fetcher = fetch) {
  const get = async (path, expected) => {
    let response;
    try { response = await fetcher(API_ORIGIN + path, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30000) }); }
    catch { throw new Error('No se pudo verificar el backend por HTTPS.'); }
    assert.equal(response.status, expected, 'El backend no está listo para el cliente de producción.');
    try { return await response.json(); } catch { throw new Error('El backend no devolvió JSON válido.'); }
  };
  const health = await get('/health', 200); assert.equal(health.ok, true);
  const notice = await get('/api/privacy/notice', 200);
  assert.equal(notice.noticeId, 'privacy-notice');
  assert.ok(typeof notice.version === 'string' && notice.version.length > 0);
  assert.match(notice.contentSha256 || '', /^[a-f0-9]{64}$/);
  let document;
  try { document = new URL(notice.documentUrl); } catch { throw new Error('El aviso necesita una URL válida.'); }
  assert.equal(document.protocol, 'https:'); assert.equal(document.username + document.password + document.hash, '');
  const capabilities = await get('/api/privacy/capabilities', 200);
  assert.equal(capabilities.schemaVersion, 2);
  assert.equal(capabilities.databaseReady, true, 'El esquema y la auditoría deben estar preparados.');
  assert.equal(capabilities.cancellationStatusLookup, true);
  assert.equal(capabilities.googleEmailStepUp, true);
  assert.equal(capabilities.deletionRequiresApprovedPolicy, true);
  await get('/api/user/account-cancellation-requests', 401);
  return { health: 'ok', notice: 'available', reviewApi: 'v2', anonymousLookup: 'denied' };
}
function buildIdentity(build) {
  assert.ok(build && UUID.test(build.id), 'Identificador EAS inválido.');
  const account = build.app?.ownerAccount?.name, slug = build.app?.slug;
  assert.ok(typeof account === 'string' && /^[\w-]+$/.test(account) && typeof slug === 'string' && /^[\w-]+$/.test(slug), 'Identidad EAS inválida.');
  return { id: build.id, buildUrl: `https://expo.dev/accounts/${account}/projects/${slug}/builds/${build.id}` };
}
function inspectBuild(build, sha = process.env.GITHUB_SHA) {
  const identity = buildIdentity(build);
  assert.equal(build.platform, 'ANDROID'); assert.equal(build.buildProfile, 'production');
  assert.equal(build.app.id, PROJECT_ID); assert.equal(build.distribution, 'STORE');
  if (sha) assert.equal(build.gitCommitHash, sha, 'La compilación debe usar el commit validado.');
  assert.equal(build.status, 'FINISHED', 'La compilación remota no terminó correctamente.');
  assert.match(String(build.appBuildVersion || ''), /^[1-9][0-9]*$/, 'Falta el versionCode remoto.');
  let archive;
  try { archive = new URL(build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl); }
  catch { throw new Error('Falta el artefacto AAB.'); }
  assert.equal(archive.protocol, 'https:'); assert.equal(archive.username + archive.password, '');
  assert.match(archive.pathname, /\.aab$/i, 'El artefacto de producción debe ser AAB.');
  // Never return the signed archive URL or remote logs to Actions output/artifacts.
  return { ...identity, remoteStatus: 'FINISHED', format: 'aab', versionCode: build.appBuildVersion, commit: build.gitCommitHash };
}
function output(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
function recordIdentity(build) {
  const identity = buildIdentity(build);
  output('build_url', identity.buildUrl);
  output('remote_status', ['FINISHED','ERRORED','CANCELED','IN_PROGRESS','IN_QUEUE','NEW'].includes(build.status) ? build.status : 'UNKNOWN');
  return identity;
}
async function main(command, filename, logFile) {
  validateConfig();
  if (command === 'validate') return console.log('Configuración de producción AAB validada; no se ejecutó EAS.');
  if (command === 'backend') {
    await verifyBackend(async (url, options) => {
      const response = await fetch(url, options);
      console.log(`GET ${new URL(url).pathname}: ${response.status}`);
      return response;
    });
    return console.log('Backend HTTPS, aviso y contrato ARCO v2 verificados sin escrituras.');
  }
  assert.equal(command, 'result', 'Comando inválido.');
  let builds;
  try { builds = read(filename); } catch {
    const log = logFile && fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    const link = log.match(/https:\/\/expo\.dev\/accounts\/[\w-]+\/projects\/[\w-]+\/builds\/[a-f0-9-]{36}/i)?.[0];
    if (link) output('build_url', link);
    throw new Error('No se recibió un resultado EAS verificable. Revisa el build en Expo.');
  }
  assert.ok(Array.isArray(builds) && builds.length === 1, 'Se requiere una compilación Android.');
  const initial = builds[0];
  const identity = recordIdentity(initial);
  // Query EAS again: --wait alone or the absence of a CLI error does not prove
  // that the remote build is FINISHED or belongs to this commit/project.
  const fresh = spawnSync('npx', ['eas-cli@latest', 'build:view', identity.id, '--json'], { encoding:'utf8', timeout:120000, maxBuffer:4*1024*1024 });
  assert.ok(!fresh.error && fresh.status === 0, 'No se pudo consultar el estado final en EAS.');
  let build; try { build = JSON.parse(fresh.stdout); } catch { throw new Error('Estado EAS final inválido.'); }
  assert.equal(build.id, initial.id); recordIdentity(build);
  const safe = inspectBuild(build);
  output('aab_verified', 'true');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `\nAAB de producción: [Ver compilación](${safe.buildUrl}) · ${safe.remoteStatus} · versionCode ${safe.versionCode}.\n\nNo se envió a Google Play.\n`);
  console.log(JSON.stringify(safe));
}
module.exports = { validateConfig, verifyBackend, inspectBuild, buildIdentity };
if (require.main === module) main(...process.argv.slice(2)).catch(() => {
  // Assertions may include untrusted URLs/data. Keep diagnostics bounded and
  // public; the sanitized build link/status are emitted before validation.
  console.error('La validación de producción falló. Revisa configuración, backend y estado de EAS. No se certificó un AAB.');
  process.exitCode = 1;
});
