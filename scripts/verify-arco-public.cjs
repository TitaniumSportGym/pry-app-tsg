// Read-only evidence. No login, credentials, account creation or mutations.
const fs = require('node:fs');
const { Buffer } = require('node:buffer');
const { createHash } = require('node:crypto');

const API = 'https://server-titanium.onrender.com';
const DOCUMENT = 'https://titaniumsportgym.vercel.app/avisos/aviso-privacidad-titanium-sport-gym.pdf';
const VERSION = '2026-11-08-v1';
const SHA256 = '7ae0e648561f1ba64aa4f3e09a8f271d644cc6dce4927abfd5c683d1a863c7ea';

async function verifyPublicArco(fetcher = fetch) {
  const results = [];
  const read = url => fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  try {
    const response = await read(`${API}/api/privacy/notice`);
    const notice = await response.json();
    const noticeValid = response.status === 200 && notice.noticeId === 'privacy-notice' &&
      notice.version === VERSION && notice.documentUrl === DOCUMENT &&
      notice.contentSha256 === SHA256 && typeof notice.requiredForRegistration === 'boolean';
    results.push({ caseId: 'PUBLIC-NOTICE', status: response.status, passed: noticeValid });
    const pdf = await read(DOCUMENT);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    results.push({ caseId: 'PUBLIC-PDF-HASH', status: pdf.status, passed: noticeValid && pdf.status === 200 &&
      bytes.subarray(0, 5).toString() === '%PDF-' && createHash('sha256').update(bytes).digest('hex') === notice.contentSha256 });
    for (const resource of ['profile', 'privacy-consents', 'privacy-preferences']) {
      const rejected = await read(`${API}/api/user/${resource}`);
      // Never persist private responses, even if authentication is misconfigured.
      await rejected.arrayBuffer();
      results.push({ caseId: `NO-TOKEN-${resource}`, status: rejected.status, passed: rejected.status === 401 });
    }
  } catch {
    // Network errors can include URL/proxy data. Evidence uses a fixed message.
    results.push({ caseId: 'TRANSPORT', passed: false, reason: 'Could not complete public verification.' });
  }
  return { checkedAtUtc: new Date().toISOString(), mode: 'read-only-public', credentialsSent: false,
    expectedVersion: VERSION, expectedDocumentSha256: SHA256, passed: results.length === 5 && results.every(item => item.passed), results };
}

if (require.main === module) {
  verifyPublicArco().then(report => {
    const directory = 'coverage/arco-activation';
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(`${directory}/public-verification.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  }).catch(() => { console.error('Could not save public ARCO evidence.'); process.exitCode = 1; });
}

module.exports = { verifyPublicArco };
