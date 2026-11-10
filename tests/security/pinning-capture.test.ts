import { EventEmitter } from 'node:events';
import { X509Certificate } from 'node:crypto';
import { createRequire } from 'node:module';
import { rootCertificates } from 'node:tls';

const loadCjs = createRequire(__filename);
const tls = loadCjs('node:tls');
const { capturePublicChain } = loadCjs('../../scripts/capture-pinning-lab.cjs');
const { HOST, spkiPin } = loadCjs('../../config/pinning-lab.cjs');
const certificate = rootCertificates.map(pem => new X509Certificate(pem))
  .find(value => Date.parse(value.validFrom) < Date.now() && Date.now() < Date.parse(value.validTo))!;

class PublicHandshakeFixture extends EventEmitter {
  authorized = true;
  destroy = jest.fn();
  setTimeout = jest.fn();
  getProtocol = () => 'TLSv1.3';
  getPeerCertificate = () => ({ raw: certificate.raw });
}

function mockHandshake(socket: PublicHandshakeFixture) {
  jest.spyOn(tls, 'connect').mockImplementation(() => {
    queueMicrotask(() => socket.emit('secureConnect'));
    return socket;
  });
}

afterEach(() => jest.restoreAllMocks());

it('extracts DER SPKI only after successful trust and hostname verification; sends no HTTP', async () => {
  const socket = new PublicHandshakeFixture();
  mockHandshake(socket);
  // Offline PUBLIC certificate fixture only; never saved as a Render snapshot.
  jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(undefined);
  jest.spyOn(X509Certificate.prototype, 'checkHost').mockReturnValue(HOST);
  const snapshot = await capturePublicChain();
  expect(tls.connect).toHaveBeenCalledWith(expect.objectContaining({ host: HOST, servername: HOST, port: 443, rejectUnauthorized: true, ca: rootCertificates, checkServerIdentity: tls.checkServerIdentity }));
  expect(snapshot).toMatchObject({ tlsAuthorized: true, hostnameVerified: true, validPin: spkiPin(certificate) });
  expect(snapshot.invalidPin).not.toBe(snapshot.validPin);
  expect(socket.destroy).toHaveBeenCalledTimes(1);
});

it('refuses an unauthorized TLS connection, hostname mismatch and transport errors', async () => {
  const socket = new PublicHandshakeFixture();
  socket.authorized = false;
  mockHandshake(socket);
  await expect(capturePublicChain()).rejects.toThrow('validación TLS');
  socket.authorized = true;
  jest.spyOn(tls, 'checkServerIdentity').mockReturnValue(new Error('Hostname mismatch'));
  await expect(capturePublicChain()).rejects.toThrow('Hostname mismatch');
  jest.mocked(tls.connect).mockImplementation(() => {
    queueMicrotask(() => socket.emit('error', new Error('TLS chain unavailable')));
    return socket;
  });
  await expect(capturePublicChain()).rejects.toThrow('TLS chain unavailable');
});
