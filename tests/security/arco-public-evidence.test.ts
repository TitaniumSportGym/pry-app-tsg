import { verifyPublicArco } from '../../scripts/verify-arco-public.cjs';

it('redacts unexpected private responses and sends no credentials', async () => {
  const fetcher = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/notice')) return new Response(JSON.stringify({
      noticeId: 'privacy-notice', version: '2026-11-08-v1', requiredForRegistration: false,
      documentUrl: 'https://titaniumsportgym.vercel.app/avisos/aviso-privacidad-titanium-sport-gym.pdf',
      contentSha256: '7ae0e648561f1ba64aa4f3e09a8f271d644cc6dce4927abfd5c683d1a863c7ea',
    }));
    if (url.endsWith('.pdf')) return new Response('%PDF-synthetic-document');
    return new Response(JSON.stringify({ password: 'do-not-record', accessToken: 'private-jwt', email: 'private@example.test' }));
  });
  const report = await verifyPublicArco(fetcher);
  expect(report.passed).toBe(false);
  expect(report.results.filter((item: { caseId: string }) => item.caseId.startsWith('NO-TOKEN')).every((item: { passed: boolean }) => !item.passed)).toBe(true);
  for (const secret of ['do-not-record', 'private-jwt', 'private@example.test']) expect(JSON.stringify(report)).not.toContain(secret);
  for (const [, options] of (fetcher.mock.calls as unknown as [string, RequestInit?][])) {
    expect(new Headers(options?.headers).has('authorization')).toBe(false);
  }
});

it('does not expose transport error contents in evidence', async () => {
  const report = await verifyPublicArco(async () => { throw new Error('private-password secret-otp private-jwt'); });
  expect(report.passed).toBe(false);
  expect(JSON.stringify(report)).not.toMatch(/private-password|secret-otp|private-jwt/);
});
