'use strict';

// Public TLS handshake only. Never sends HTTP, credentials, or generates keys.
const assert = require('node:assert/strict');
const { createHash, X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const tls = require('node:tls');
const { HOST, SNAPSHOT_PATH, spkiPin, validateSnapshot } = require('../config/pinning-lab.cjs');

function capturePublicChain() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: HOST, port: 443, servername: HOST,
      rejectUnauthorized: true,
      checkServerIdentity: tls.checkServerIdentity,
      // Explicit bundled public CAs; ignore additional local interception CAs.
      ca: tls.rootCertificates,
      minVersion: 'TLSv1.2',
    });
    socket.setTimeout(20000, () => socket.destroy(new Error('Timeout consultando TLS público de Render.')));
    socket.once('error', reject);
    socket.once('secureConnect', () => {
      try {
        assert.equal(socket.authorized, true, 'Render no superó la validación TLS.');
        let peer = socket.getPeerCertificate(true);
        const hostnameError = tls.checkServerIdentity(HOST, peer);
        if (hostnameError) throw hostnameError;
        const chain = [];
        const seen = new Set();
        while (peer?.raw) {
          const certificate = new X509Certificate(peer.raw);
          if (seen.has(certificate.fingerprint256)) break;
          seen.add(certificate.fingerprint256);
          chain.push({
            subject: certificate.subject, issuer: certificate.issuer,
            validFrom: certificate.validFrom, validTo: certificate.validTo,
            spkiSha256: spkiPin(certificate),
            certificateDerBase64: peer.raw.toString('base64'),
          });
          peer = peer.issuerCertificate;
        }
        assert.ok(chain.length > 0);
        const validPin = chain[0].spkiSha256;
        let counter = 0;
        let invalidPin;
        do {
          invalidPin = createHash('sha256').update(`Titanium laboratory negative control:${validPin}:${counter++}`).digest('base64');
        } while (chain.some(entry => entry.spkiSha256 === invalidPin));
        const snapshot = {
          schemaVersion: 1, purpose: 'temporary-android-pinning-lab', hostname: HOST, port: 443,
          capturedAt: new Date().toISOString(), tlsAuthorized: true, hostnameVerified: true,
          tlsProtocol: socket.getProtocol(), nodeVersion: process.version, validPin, invalidPin, chain,
        };
        validateSnapshot(snapshot);
        resolve(snapshot);
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
  });
}

async function main() {
  const snapshot = await capturePublicChain();
  if (process.argv.includes('--check')) {
    const saved = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    validateSnapshot(saved);
    assert.equal(snapshot.validPin, saved.validPin, 'Render cambió el SPKI leaf: recaptura, valida y recompila ambas APK de laboratorio.');
    assert.ok(snapshot.chain.every(entry => entry.spkiSha256 !== saved.invalidPin), 'El control negativo ya no es válido.');
    console.log(`TLS público validado; SPKI capturado sigue vigente para ${HOST}.`);
    return;
  }
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ hostname: HOST, capturedAt: snapshot.capturedAt, validPin: snapshot.validPin, invalidPin: snapshot.invalidPin, certificates: snapshot.chain.length }, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { capturePublicChain };
