'use strict';

const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { createHash, X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');

const HOST = 'server-titanium.onrender.com';
const API_ORIGIN = `https://${HOST}`;
const PACKAGE = 'com.titaniumsportgym.app';
const PROJECT_ID = 'e2d585a9-0d83-4bcb-ac53-d1a240ed6e74';
const NETWORK_PLUGIN = './plugins/with-network-security.cjs';
const SNAPSHOT_PATH = path.join(path.dirname(module.filename), 'alpha-pinning-public-chain.json');
// Build freshness only: installed Android pins NEVER expire or fail open.
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;
const PROFILES = ['development', 'preview', 'production', 'arco-debug', 'arco-release'];
const RELEASE_PROFILES = ['preview', 'production', 'arco-release'];

function assertPin(value) {
  assert.equal(typeof value, 'string', 'Falta el pin SPKI verificado.');
  assert.match(value, /^[A-Za-z0-9+/]{43}=$/, 'Usar SHA-256 SPKI Base64 canónico.');
  const bytes = Buffer.from(value, 'base64');
  assert.equal(bytes.length, 32);
  assert.equal(bytes.toString('base64'), value);
  assert.ok(bytes.some(byte => byte !== 0), 'No se permiten pins vacíos de control.');
  return value;
}

function spkiPin(certificate) {
  return createHash('sha256').update(certificate.publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
}

function verifyPublicChain(certificates, now = Date.now(), roots = tls.rootCertificates) {
  assert.ok(certificates.length >= 2, 'Falta la cadena TLS pública.');
  assert.equal(certificates[0].ca, false, 'El pin debe pertenecer a una clave leaf, no a una CA compartida.');
  assert.ok(certificates[0].checkHost(HOST), 'El certificado no corresponde al hostname de Render.');
  for (const [index, certificate] of certificates.entries()) {
    assert.ok(Date.parse(certificate.validFrom) <= now && now < Date.parse(certificate.validTo), 'Certificado/cadena no vigente.');
    if (index > 0) assert.equal(certificate.ca, true);
    const issuer = certificates[index + 1];
    if (issuer) {
      assert.ok(certificate.checkIssued(issuer) && certificate.verify(issuer.publicKey), 'Firma/cadena TLS no confiable.');
    }
  }
  // Cross-signed roots may have a different DER fingerprint than their bundled
  // self-signed version. Match subject + SPKI, or verify issuance by a public root.
  const tail = certificates[certificates.length - 1];
  const anchor = roots.map(pem => new X509Certificate(pem)).find(root => root.ca &&
    Date.parse(root.validFrom) <= now && now < Date.parse(root.validTo) &&
    ((tail.subject === root.subject && spkiPin(tail) === spkiPin(root)) ||
      (tail.checkIssued(root) && tail.verify(root.publicKey))));
  assert.ok(anchor, 'La cadena no termina en una CA pública incluida en Node; posible interceptación.');
  return { subject: anchor.subject, spkiSha256: spkiPin(anchor), fingerprint256: anchor.fingerprint256 };
}

function readConfig() {
  assert.ok(fs.existsSync(SNAPSHOT_PATH), 'Falta captura Alpha. Ejecuta node scripts/verify-alpha-pinning.cjs --capture.');
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
}

function getSettings(snapshot = readConfig(), { now = Date.now() } = {}) {
  assert.equal(snapshot?.schemaVersion, 1);
  assert.equal(snapshot.mode, 'academic-alpha', 'Solo se autoriza el modo académico Alpha explícito.');
  assert.equal(snapshot.purpose, 'temporary-official-google-play-closed-alpha');
  assert.equal(snapshot.rotationRiskAccepted, true);
  assert.equal(snapshot.apiOrigin, API_ORIGIN);
  assert.equal(snapshot.hostname, HOST);
  assert.equal(snapshot.port, 443);
  assert.equal(snapshot.tlsAuthorized, true, 'TLS de captura no autorizado.');
  assert.equal(snapshot.hostnameVerified, true);
  assert.equal(snapshot.caSource, 'node-bundled-public');
  assert.ok(['TLSv1.2', 'TLSv1.3'].includes(snapshot.tlsProtocol), 'Captura TLS con protocolo no admitido.');
  const capturedAt = Date.parse(snapshot.capturedAt);
  assert.ok(Number.isFinite(capturedAt) && capturedAt <= now && now - capturedAt <= MAX_SNAPSHOT_AGE_MS,
    'Captura Alpha futura o de más de 24 horas: recaptura y verifica antes de compilar.');
  assert.ok(Array.isArray(snapshot.chain) && snapshot.chain.length >= 2);
  const certificates = snapshot.chain.map(entry => {
    const certificate = new X509Certificate(Buffer.from(entry.certificateDerBase64, 'base64'));
    assert.equal(certificate.raw.toString('base64'), entry.certificateDerBase64);
    assert.equal(assertPin(entry.spkiSha256), spkiPin(certificate), 'El hash no corresponde al SPKI DER.');
    return certificate;
  });
  verifyPublicChain(certificates, capturedAt);
  assert.deepEqual(snapshot.trustAnchor, verifyPublicChain(certificates, now));
  assert.equal(assertPin(snapshot.spkiSha256), spkiPin(certificates[0]), 'El pin Alpha debe ser el leaf verificado.');
  assert.equal(snapshot.operationalBackup, null, 'No presentar una CA compartida como respaldo operativo.');
  return { host: HOST, apiOrigin: API_ORIGIN, pins: [snapshot.spkiSha256], capturedAt: snapshot.capturedAt };
}

function assertEnvironment(env = process.env) {
  assert.ok(!env.APP_VARIANT && !env.TSG_PINNING_LAB_PROFILE, 'El laboratorio permanece aislado en su rama.');
  assert.ok(!env.EAS_BUILD_PROFILE || PROFILES.includes(env.EAS_BUILD_PROFILE), 'Perfil EAS desconocido.');
  if (env.EAS_BUILD === 'true') assert.ok(env.EAS_BUILD_PROFILE, 'Un build EAS debe identificar su perfil.');
}

function configureApp(config, env = process.env, snapshot = readConfig(), eas = require('../eas.json')) {
  assertEnvironment(env);
  assert.equal(config.name, 'Titanium Sport Gym');
  assert.equal(config.scheme, 'pryapptsg');
  assert.equal(config.version, '1.0.0');
  assert.equal(config.android?.package, PACKAGE);
  assert.equal(config.extra?.eas?.projectId, PROJECT_ID);
  assert.equal(config.extra?.pinningLab, undefined);
  assert.ok(config.plugins.includes(NETWORK_PLUGIN), 'Conservar el plugin sin overrides de laboratorio.');
  const active = getSettings(snapshot);
  for (const profile of RELEASE_PROFILES) {
    assert.equal(eas.build[profile].env.EXPO_PUBLIC_API_URL, API_ORIGIN);
  }
  if (RELEASE_PROFILES.includes(env.EAS_BUILD_PROFILE) || (env.EXPO_PUBLIC_API_URL && !['development', 'arco-debug'].includes(env.EAS_BUILD_PROFILE))) {
    assert.equal(env.EXPO_PUBLIC_API_URL, active.apiOrigin, 'La URL efectiva Release debe ser el origen HTTPS exacto fijado.');
  }
  return config;
}

module.exports = { HOST, API_ORIGIN, PACKAGE, PROJECT_ID, NETWORK_PLUGIN, SNAPSHOT_PATH,
  MAX_SNAPSHOT_AGE_MS, PROFILES, RELEASE_PROFILES, assertPin, spkiPin, verifyPublicChain,
  readConfig, getSettings, assertEnvironment, configureApp };
