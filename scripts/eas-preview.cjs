'use strict';

// Never invokes EAS. Only the ARCO result command downloads the finished APK.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Buffer } = require('node:buffer');

const API_ORIGIN = 'https://server-titanium.onrender.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUILD_URL = /^https:\/\/expo\.dev\/accounts\/[\w%-]+\/projects\/[\w%-]+\/builds\/[0-9a-f-]{36}$/i;
const json = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));

function selectProfile(ref = process.env.GITHUB_REF) {
  return ref === 'refs/heads/feature/actividad6-seguridad-api' ? 'arco-release' : 'preview';
}

function validateConfig() {
  const profileName = selectProfile();
  const profile = json('eas.json').build?.[profileName];
  const app = json('app.json').expo;
  assert.equal(profile?.android?.buildType, 'apk', `${profileName} debe generar APK.`);
  assert.equal(profile.distribution, 'internal');
  assert.equal(profile.environment, 'preview');
  assert.equal(profile.android.gradleCommand, undefined, 'Un comando Gradle personalizado podría cambiar el formato.');
  assert.equal(profile.extends, undefined, 'El perfil validado debe ser independiente.');
  assert.notEqual(profile.developmentClient, true, 'La APK debe ser Release.');
  assert.equal(profile.env?.EXPO_PUBLIC_API_URL, API_ORIGIN, 'Se requiere el origen API sin /api ni credenciales.');
  const arcoEnabled = profileName === 'arco-release' ? 'true' : 'false';
  assert.equal(profile.env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED, arcoEnabled);
  const properties = app.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-build-properties');
  assert.equal(properties?.[1]?.android?.enableMinifyInReleaseBuilds, true);
  assert.equal(properties?.[1]?.android?.enableShrinkResourcesInReleaseBuilds, true);
  assert.ok(profile.android.buildArtifactPaths.includes('android/app/build/outputs/mapping/release/**'));
  assert.ok(UUID.test(app.extra?.eas?.projectId), 'Falta un projectId de EAS válido.');
  assert.match(app.android?.package || '', /^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/, 'Falta el identificador Android.');
  return { profile: profileName, arcoEnabled, projectId: app.extra.eas.projectId, androidPackage: app.android.package, apiOrigin: API_ORIGIN };
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function verifyResult(filename, logFile) {
  const config = validateConfig();
  let builds;
  try { builds = json(filename); } catch {
    // A request/network failure can leave stdout empty; preserve a build link
    // from EAS stderr if a build was created before the error.
    const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    const link = log.match(/https:\/\/expo\.dev\/accounts\/[\w%-]+\/projects\/[\w%-]+\/builds\/[0-9a-f-]{36}/i)?.[0];
    if (link && BUILD_URL.test(link)) output('build_url', link);
    throw new Error('EAS no devolvió un resultado JSON verificable. Revisa el paso de compilación.');
  }
  assert.ok(Array.isArray(builds) && builds.length === 1 && builds[0], 'Se esperaba un único resultado de Android.');
  const build = builds[0];
  const account = build.app?.ownerAccount?.name;
  const slug = build.app?.slug;
  assert.ok(UUID.test(build.id) && account && slug, 'El resultado no permite identificar la compilación.');
  const link = `https://expo.dev/accounts/${encodeURIComponent(account)}/projects/${encodeURIComponent(slug)}/builds/${build.id}`;
  assert.ok(BUILD_URL.test(link), 'Enlace de EAS inválido.');
  // Publish identity before rejecting failed/cancelled builds, so the summary
  // still links to their diagnostics. Never publish the token or signed URLs.
  output('build_url', link);
  const status = ['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED', 'ERRORED', 'CANCELED', 'PENDING_CANCEL'].includes(build.status)
    ? build.status : 'UNKNOWN';
  output('remote_status', status);
  console.log(`Build EAS: ${link}; estado: ${status}`);
  assert.equal(build.platform, 'ANDROID');
  assert.equal(build.buildProfile, config.profile);
  assert.equal(build.app.id, config.projectId);
  if (process.env.GITHUB_SHA) assert.equal(build.gitCommitHash, process.env.GITHUB_SHA, 'El commit remoto debe coincidir con el validado.');
  assert.equal(status, 'FINISHED', 'La compilación debe haber terminado correctamente.');
  const artifact = new URL(build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl || '');
  assert.equal(artifact.protocol, 'https:');
  assert.equal(artifact.username + artifact.password, '');
  assert.match(artifact.pathname, /\.apk$/i, 'El artefacto final debe ser APK, no AAB.');
  console.log('Resultado final y extensión APK verificados.');
  return { build, artifact, config };
}

function androidTools() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  assert.ok(sdk, 'El runner necesita Android SDK Build Tools.');
  const root = path.join(sdk, 'build-tools');
  const versions = fs.readdirSync(root).filter(version => /^\d+\.\d+\.\d+$/.test(version))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const directory = versions.map(version => path.join(root, version))
    .find(dir => ['aapt', 'apksigner'].every(tool => fs.existsSync(path.join(dir, tool))));
  assert.ok(directory, 'No se encontraron aapt y apksigner en el runner Linux.');
  return { aapt: path.join(directory, 'aapt'), apksigner: path.join(directory, 'apksigner') };
}

function checkTool(tool, args) {
  const result = spawnSync(tool, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  // Tool output is not printed: unexpected manifests/errors may contain private data.
  assert.ok(!result.error && result.status === 0, `La APK no pasó la verificación con ${path.basename(tool)}.`);
  return result.stdout;
}

async function downloadApk(artifact, filename) {
  try {
    let url = artifact;
    const signal = AbortSignal.timeout(600000);
    for (let redirects = 0; redirects <= 5; redirects++) {
      assert.equal(url.protocol, 'https:');
      assert.equal(url.username + url.password, '');
      // Never forward EXPO_TOKEN, Authorization or cookies to the artifact host.
      const response = await fetch(url, { redirect: 'manual', signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        assert.ok(location);
        url = new URL(location, url);
        continue;
      }
      assert.equal(response.status, 200);
      assert.ok(response.body);
      const file = await fs.promises.open(filename, 'wx');
      let bytes = 0;
      const digest = createHash('sha256');
      try {
        for await (const chunk of response.body) {
          bytes += chunk.length;
          assert.ok(bytes <= 512 * 1024 * 1024, 'APK demasiado grande.');
          digest.update(chunk);
          await file.writeFile(chunk);
        }
      } finally { await file.close(); }
      assert.ok(bytes > 4);
      return { bytes, sha256: digest.digest('hex') };
    }
    throw new Error('Demasiadas redirecciones.');
  } catch {
    // Fetch errors can include signed download URLs. Keep them out of logs.
    throw new Error('No se pudo descargar la APK por HTTPS para verificarla.');
  }
}

async function verifyApk({ build, artifact, config }, directory = 'coverage/eas-preview') {
  const tools = androidTools();
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(fs.mkdtempSync(path.join(directory, 'apk-check-')), 'application.apk');
  try {
    const downloaded = await downloadApk(artifact, filename);
    const header = Buffer.alloc(4);
    const file = fs.openSync(filename, 'r');
    try { fs.readSync(file, header, 0, 4, 0); } finally { fs.closeSync(file); }
    assert.equal(header.toString('hex'), '504b0304', 'La descarga no es un archivo APK/ZIP.');
    const manifest = checkTool(tools.aapt, ['dump', 'badging', filename]);
    assert.equal(manifest.match(/^package: name='([^']+)'/m)?.[1], config.androidPackage, 'Paquete Android inesperado.');
    assert.doesNotMatch(manifest, /^application-debuggable\b/m, 'Se esperaba una APK Release.');
    checkTool(tools.apksigner, ['verify', filename]);
    const evidence = { buildId: build.id, profile: config.profile, gitCommitHash: build.gitCommitHash,
      androidPackage: config.androidPackage, ...downloaded, manifestVerified: true, signatureVerified: true };
    fs.writeFileSync(path.join(directory, 'apk-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    output('apk_verified', 'true');
    output('apk_sha256', downloaded.sha256);
    console.log(`APK Release: paquete y firma verificados; SHA-256 ${downloaded.sha256}; ${downloaded.bytes} bytes.`);
  } finally {
    // Remove only the exact temporary file created here, never the enclosing workspace.
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.rmdirSync(path.dirname(filename));
  }
}

function summary() {
  const profile = selectProfile();
  const quality = process.env.QUALITY_RESULT || 'skipped';
  const build = process.env.BUILD_RESULT || 'skipped';
  const link = process.env.BUILD_URL || '';
  const lines = [
    `## EAS Build ${profile} — Android APK`,
    `- Calidad (ESLint, TypeScript, unitarias, integración, aceptación y regresión): **${quality}**`,
    `- Resultado del job de compilación: **${build}**`,
    `- Estado remoto: **${process.env.REMOTE_STATUS || 'Sin resultado verificable'}**`,
    `- Commit: \`${process.env.GITHUB_SHA}\``,
    `- Perfil: \`${profile}\``,
    '- Plataforma: `android`',
    '- Formato requerido: `.apk`',
    BUILD_URL.test(link) ? `- Compilación y descarga: [Abrir en Expo](${link})` : '- Enlace de compilación: no disponible.',
  ];
  if (profile === 'arco-release') {
    const verified = process.env.APK_VERIFIED === 'true' && /^[a-f0-9]{64}$/.test(process.env.APK_SHA256 || '');
    lines.push(`- APK descargada, manifiesto y firma verificados: **${verified ? 'sí' : 'pendiente / falló'}**`);
    if (verified) lines.push(`- APK SHA-256: \`${process.env.APK_SHA256}\``);
  }
  if (quality !== 'success') lines.push('- La calidad no fue aprobada; el job de build queda bloqueado.');
  if (build !== 'success') lines.push('- No hay una APK aprobada por este workflow. Revisar los pasos fallidos y el estado remoto si existe enlace.');
  const content = `${lines.join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, content);
  process.stdout.write(content);
}

async function main() {
  try {
    switch (process.argv[2]) {
      case 'validate': {
        const config = validateConfig();
        if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV,
          `EXPO_PUBLIC_API_URL=${config.apiOrigin}\nEAS_BUILD_PROFILE=${config.profile}\n`);
        console.log(JSON.stringify(config, null, 2));
        break;
      }
      case 'result': {
        const result = verifyResult(process.argv[3], process.argv[4]);
        // Preserve the existing preview flow; inspect the binary for this ARCO campaign.
        if (result.config.profile === 'arco-release') await verifyApk(result);
        break;
      }
      case 'summary': summary(); break;
      default: throw new Error('Uso: node scripts/eas-preview.cjs validate | result <json> <log> | summary');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();

module.exports = { selectProfile, validateConfig, verifyResult, verifyApk, summary };
