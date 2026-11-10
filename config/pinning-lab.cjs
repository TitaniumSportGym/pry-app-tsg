'use strict';

const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { createHash, X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const HOST = 'server-titanium.onrender.com';
const API_ORIGIN = `https://${HOST}`;
const NETWORK_PLUGIN = './plugins/with-network-security.cjs';
const SNAPSHOT_PATH = path.join(path.dirname(module.filename), 'pinning-lab-public-chain.json');
// This is a build-time freshness gate, never an Android pin-set expiration.
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EXISTING_PROFILES = ['development', 'preview', 'arco-debug', 'arco-release', 'production'];
const LAB_VARIANTS = {
  'pinning-lab-valid': { name: 'Titanium Lab Valid', package: 'com.titaniumsportgym.app.lab.valid', scheme: 'titaniumlabvalid' },
  'pinning-lab-invalid': { name: 'Titanium Lab Invalid', package: 'com.titaniumsportgym.app.lab.invalid', scheme: 'titaniumlabinvalid' },
};

function assertPin(value) {
  assert.equal(typeof value, 'string', 'El pin SPKI debe ser Base64.');
  assert.match(value, /^[A-Za-z0-9+/]{43}=$/, 'El pin debe ser un SHA-256 de 32 bytes en Base64 canónico.');
  const bytes = Buffer.from(value, 'base64');
  assert.equal(bytes.length, 32);
  assert.equal(bytes.toString('base64'), value, 'Base64 no canónico.');
  return value;
}

function spkiPin(certificate) {
  return createHash('sha256').update(certificate.publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
}

function readSnapshot() {
  assert.ok(fs.existsSync(SNAPSHOT_PATH), 'Falta un pin verificado. Ejecuta node scripts/capture-pinning-lab.cjs antes de compilar el laboratorio.');
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
}

function validateSnapshot(snapshot, now = Date.now()) {
  assert.equal(snapshot?.schemaVersion, 1, 'Captura TLS de laboratorio inválida.');
  assert.equal(snapshot.hostname, HOST);
  assert.equal(snapshot.port, 443);
  assert.equal(snapshot.tlsAuthorized, true, 'La captura debe proceder de TLS validado.');
  assert.equal(snapshot.hostnameVerified, true);
  assert.equal(snapshot.purpose, 'temporary-android-pinning-lab');
  const capturedAt = Date.parse(snapshot.capturedAt);
  assert.ok(Number.isFinite(capturedAt) && capturedAt <= now, 'Fecha de captura TLS inválida o futura.');
  assert.ok(now - capturedAt <= MAX_SNAPSHOT_AGE_MS, 'Captura TLS de más de siete días: vuelve a verificar Render antes de compilar.');
  assert.ok(Array.isArray(snapshot.chain) && snapshot.chain.length > 0, 'Falta la cadena pública validada.');
  const certificates = snapshot.chain.map((entry) => {
    const certificate = new X509Certificate(Buffer.from(entry.certificateDerBase64, 'base64'));
    assert.equal(entry.spkiSha256, spkiPin(certificate), 'El pin no coincide con el SPKI DER del certificado público.');
    assertPin(entry.spkiSha256);
    assert.ok(Date.parse(certificate.validFrom) <= capturedAt && capturedAt < Date.parse(certificate.validTo), 'Certificado no vigente en la captura.');
    return certificate;
  });
  const leaf = certificates[0];
  assert.ok(leaf.checkHost(HOST), 'El certificado público no corresponde al hostname.');
  assert.ok(now < Date.parse(leaf.validTo), 'El certificado capturado ya venció: vuelve a verificar Render.');
  assert.equal(assertPin(snapshot.validPin), snapshot.chain[0].spkiSha256, 'El pin correcto debe ser el SPKI del certificado leaf validado.');
  assertPin(snapshot.invalidPin);
  assert.ok(snapshot.chain.every(entry => entry.spkiSha256 !== snapshot.invalidPin), 'El pin negativo coincide con una clave de la cadena.');
  return { validPin: snapshot.validPin, invalidPin: snapshot.invalidPin, capturedAt: snapshot.capturedAt };
}

function getLabSettings(env = process.env, easConfig = require('../eas.json'), snapshot, now) {
  const variant = env.APP_VARIANT;
  const marker = env.TSG_PINNING_LAB_PROFILE;
  const profile = env.EAS_BUILD_PROFILE;
  const isLab = Object.hasOwn(LAB_VARIANTS, variant || '');
  if (!isLab) {
    assert.ok(!variant, 'APP_VARIANT desconocida: no se permite activar parcialmente el laboratorio.');
    assert.ok(!marker, 'TSG_PINNING_LAB_PROFILE requiere una variante de laboratorio.');
    assert.ok(!profile || EXISTING_PROFILES.includes(profile), 'Perfil EAS desconocido o laboratorio sin APP_VARIANT.');
    return null;
  }
  assert.equal(marker, variant, 'Falta TSG_PINNING_LAB_PROFILE o no coincide con APP_VARIANT.');
  assert.ok(!env.EAS_BUILD_PLATFORM || env.EAS_BUILD_PLATFORM === 'android', 'El laboratorio de pinning es exclusivo de Android.');
  assert.ok(!profile || profile === variant, 'La variante de laboratorio no coincide con EAS_BUILD_PROFILE.');
  const build = easConfig.build?.[variant];
  assert.ok(build, 'Falta el perfil EAS de laboratorio.');
  assert.equal(build.extends, undefined, 'El laboratorio debe tener un perfil independiente.');
  assert.equal(build.environment, 'development');
  assert.equal(build.distribution, 'internal');
  assert.equal(build.developmentClient, false);
  assert.equal(build.autoIncrement, false);
  assert.equal(build.android?.buildType, 'apk');
  assert.equal(build.android?.gradleCommand, undefined);
  assert.equal(build.android?.developmentClient, undefined);
  assert.equal(build.env?.APP_VARIANT, variant);
  assert.equal(build.env?.TSG_PINNING_LAB_PROFILE, variant);
  assert.equal(build.env?.EXPO_PUBLIC_API_URL, API_ORIGIN);
  assert.equal(build.env?.EXPO_PUBLIC_ARCO_BACKEND_ENABLED, 'false');
  assert.equal(env.EXPO_PUBLIC_API_URL, API_ORIGIN, 'La URL efectiva del laboratorio debe ser el origen HTTPS exacto de Render.');
  assert.equal(env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED, 'false', 'El laboratorio no activa operaciones ARCO.');
  const pins = validateSnapshot(snapshot === undefined ? readSnapshot() : snapshot, now);
  return {
    ...LAB_VARIANTS[variant], variant, host: HOST, capturedAt: pins.capturedAt,
    pin: variant === 'pinning-lab-valid' ? pins.validPin : pins.invalidPin,
  };
}

function configureApp(config, env = process.env) {
  const lab = getLabSettings(env);
  if (!lab) {
    assert.equal(config.extra?.pinningLab, undefined, 'La configuración base no debe contener opciones de laboratorio.');
    assert.ok(config.plugins.includes(NETWORK_PLUGIN), 'La política habitual debe permanecer sin opciones de laboratorio.');
    return config;
  }
  assert.equal(config.android?.package, 'com.titaniumsportgym.app', 'Conservar el paquete base de producción.');
  assert.ok(config.plugins.includes(NETWORK_PLUGIN));
  return {
    ...config,
    name: lab.name,
    scheme: lab.scheme,
    android: { ...config.android, package: lab.package },
    plugins: config.plugins.map(entry => entry === NETWORK_PLUGIN ? [entry, { labVariant: lab.variant }] : entry),
    extra: { ...config.extra, pinningLab: { variant: lab.variant, host: lab.host, capturedAt: lab.capturedAt } },
  };
}

module.exports = {
  HOST, API_ORIGIN, NETWORK_PLUGIN, SNAPSHOT_PATH, MAX_SNAPSHOT_AGE_MS, EXISTING_PROFILES, LAB_VARIANTS,
  assertPin, spkiPin, validateSnapshot, getLabSettings, configureApp,
};
