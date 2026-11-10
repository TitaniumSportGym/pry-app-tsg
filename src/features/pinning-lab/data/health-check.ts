import { getApiBaseUrl } from '@/config/env';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

export type HealthCheckResult =
  | { kind: 'success'; status: number }
  | { kind: 'http-error'; status: number }
  | { kind: 'connection-error' }
  | { kind: 'unexpected-response' }
  | { kind: 'configuration-error' };

export async function checkLabHealth(signal: AbortSignal): Promise<HealthCheckResult> {
  try {
    if (getApiBaseUrl() !== 'https://server-titanium.onrender.com') return { kind: 'configuration-error' };
    let status = 0;
    const body = await apiRequest<{ ok?: unknown }>('/health', {
      method: 'GET', auth: false, credentials: 'omit', signal,
      headers: { 'Cache-Control': 'no-cache, no-store' },
      onResponse: metadata => { status = metadata.status; },
    });
    return status === 200 && body?.ok === true ? { kind: 'success', status } : { kind: 'unexpected-response' };
  } catch (error) {
    // A TLS failure has no HTTP status. Never label a generic network error as pinning.
    return error instanceof ApiError ? { kind: 'http-error', status: error.status } : { kind: 'connection-error' };
  }
}
