'use strict';

// Adapted from the lab capture: public TLS only, no HTTP, credentials or keys.
const assert = require('node:assert/strict');
const { createHash, X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const tls = require('node:tls');
const { HOST, API_ORIGIN, SNAPSHOT_PATH, RELEASE_PROFILES, spkiPin, verifyPublicChain,
  readConfig, getSettings, assertEnvironment } = require('../config/alpha-pinning.cjs');

function capturePublicChain() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: HOST, port: 443, servername: HOST,
      rejectUnauthorized: true, checkServerIdentity: tls.checkServerIdentity,
      ca: tls.rootCertificates, minVersion: 'TLSv1.2' });
    socket.setTimeout(20000, () => socket.destroy(new Error('Timeout verificando TLS público de Render.')));
    socket.once('error', reject);
    socket.once('secureConnect', () => {
      try {
        assert.equal(socket.authorized, true);
        let peer = socket.getPeerCertificate(true);
        const error = tls.checkServerIdentity(HOST, peer);
        if (error) throw error;
        const seen = new Set(), chain = [], certificates = [];
        while (peer?.raw) {
          const certificate = new X509Certificate(peer.raw);
          if (seen.has(certificate.fingerprint256)) break;
          seen.add(certificate.fingerprint256);
          certificates.push(certificate);
          chain.push({ subject: certificate.subject, issuer: certificate.issuer,
            validFrom: certificate.validFrom, validTo: certificate.validTo,
            spkiSha256: spkiPin(certificate), certificateDerBase64: peer.raw.toString('base64') });
          peer = peer.issuerCertificate;
        }
        const snapshot = { schemaVersion: 1, mode: 'academic-alpha', purpose: 'temporary-official-google-play-closed-alpha',
          rotationRiskAccepted: true, apiOrigin: API_ORIGIN, hostname: HOST, port: 443,
          capturedAt: new Date().toISOString(), tlsAuthorized: true, hostnameVerified: true,
          caSource: 'node-bundled-public', tlsProtocol: socket.getProtocol(), nodeVersion: process.version,
          spkiSha256: chain[0]?.spkiSha256, operationalBackup: null,
          trustAnchor: verifyPublicChain(certificates), chain };
        getSettings(snapshot);
        resolve(snapshot);
      } catch (error) { reject(error); } finally { socket.destroy(); }
    });
  });
}

function assertPeerPin(snapshot, expectedPin) {
  const active = getSettings(snapshot);
  assert.equal(active.pins[0], expectedPin, 'SPKI_PIN_MISMATCH: Render cambió la clave; no compilar con el pin anterior.');
}

async function main(command = '--check') {
  assert.ok(['--capture', '--check', '--build', '--negative-control'].includes(command), 'Comando desconocido.');
  assertEnvironment();
  if (command === '--build') {
    if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== 'android') return;
    if (!RELEASE_PROFILES.includes(process.env.EAS_BUILD_PROFILE)) return;
    assert.equal(process.env.EXPO_PUBLIC_API_URL, API_ORIGIN);
  }
  const saved = command === '--capture' ? null : getSettings(readConfig());
  const snapshot = await capturePublicChain();
  if (command === '--capture') {
    fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  } else {
    assertPeerPin(snapshot, saved.pins[0]);
    if (command === '--negative-control') {
      const invalid = createHash('sha256').update(`Academic Alpha negative control:${snapshot.spkiSha256}`).digest('base64');
      assert.ok(snapshot.chain.every(entry => entry.spkiSha256 !== invalid));
      assert.throws(() => assertPeerPin(snapshot, invalid), /SPKI_PIN_MISMATCH/);
      console.log('Control negativo SPKI rechazado en Node; no equivale a pinning Android.');
    }
  }
  console.log(JSON.stringify({ hostname: HOST, capturedAt: snapshot.capturedAt, spkiSha256: snapshot.spkiSha256,
    tlsAuthorized: true, hostnameVerified: true, operationalBackup: null }, null, 2));
}

module.exports = { capturePublicChain, assertPeerPin };
if (require.main === module) main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
