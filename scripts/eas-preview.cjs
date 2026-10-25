'use strict';

// Local configuration/result checks only. This script never invokes EAS or HTTP.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const API_ORIGIN = 'https://server-titanium.onrender.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUILD_URL = /^https:\/\/expo\.dev\/accounts\/[\w%-]+\/projects\/[\w%-]+\/builds\/[0-9a-f-]{36}$/i;
const json = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));

function validateConfig() {
  const profile = json('eas.json').build?.preview;
  const app = json('app.json').expo;
  assert.equal(profile?.android?.buildType, 'apk', 'preview debe generar APK.');
  assert.equal(profile.distribution, 'internal');
  assert.equal(profile.environment, 'preview');
  assert.equal(profile.android.gradleCommand, undefined, 'Un comando Gradle personalizado podría cambiar el formato.');
  assert.equal(profile.extends, undefined, 'Revisar la validación antes de añadir herencia al perfil preview.');
  assert.equal(profile.env?.EXPO_PUBLIC_API_URL, API_ORIGIN, 'preview requiere el origen API sin /api ni credenciales.');
  assert.ok(UUID.test(app.extra?.eas?.projectId), 'Falta un projectId de EAS válido.');
  assert.match(app.android?.package || '', /^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/, 'Falta el identificador Android.');
  return { projectId: app.extra.eas.projectId, androidPackage: app.android.package, apiOrigin: API_ORIGIN };
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function verifyResult(filename, logFile) {
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
  assert.equal(build.buildProfile, 'preview');
  assert.equal(build.app.id, json('app.json').expo.extra.eas.projectId);
  if (process.env.GITHUB_SHA) assert.equal(build.gitCommitHash, process.env.GITHUB_SHA, 'El commit remoto debe coincidir con el validado.');
  assert.equal(status, 'FINISHED', 'La compilación debe haber terminado correctamente.');
  const artifact = new URL(build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl || '');
  assert.equal(artifact.protocol, 'https:');
  assert.equal(artifact.username + artifact.password, '');
  assert.match(artifact.pathname, /\.apk$/i, 'El artefacto final debe ser APK, no AAB.');
  console.log('Resultado final y extensión APK verificados.');
}

function summary() {
  const quality = process.env.QUALITY_RESULT || 'skipped';
  const build = process.env.BUILD_RESULT || 'skipped';
  const link = process.env.BUILD_URL || '';
  const lines = [
    '## EAS Build preview — Android APK',
    `- Calidad (ESLint, TypeScript, unitarias, integración, aceptación y regresión): **${quality}**`,
    `- Resultado del job de compilación: **${build}**`,
    `- Estado remoto: **${process.env.REMOTE_STATUS || 'Sin resultado verificable'}**`,
    `- Commit: \`${process.env.GITHUB_SHA}\``,
    '- Perfil: `preview`',
    '- Plataforma: `android`',
    '- Formato requerido: `.apk`',
    BUILD_URL.test(link) ? `- Compilación y descarga: [Abrir en Expo](${link})` : '- Enlace de compilación: no disponible.',
  ];
  if (quality !== 'success') lines.push('- La calidad no fue aprobada; el job de build queda bloqueado.');
  if (build !== 'success') lines.push('- No hay una APK aprobada por este workflow. Revisar los pasos fallidos y el estado remoto si existe enlace.');
  const content = `${lines.join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, content);
  process.stdout.write(content);
}

if (require.main === module) {
  try {
    switch (process.argv[2]) {
      case 'validate': {
        const config = validateConfig();
        if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `EXPO_PUBLIC_API_URL=${config.apiOrigin}\n`);
        console.log(JSON.stringify(config, null, 2));
        break;
      }
      case 'result': verifyResult(process.argv[3], process.argv[4]); break;
      case 'summary': summary(); break;
      default: throw new Error('Uso: node scripts/eas-preview.cjs validate | result <json> <log> | summary');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateConfig, verifyResult, summary };
