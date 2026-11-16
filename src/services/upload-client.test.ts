import { getAccessToken, invalidateAccessToken } from '@/services/sessionService';
import { ApiError } from '@/types/auth';

import { isUploadCancelled, uploadRequest } from './upload-client';

jest.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.test' }));
jest.mock('@/config/api-url-policy', () => ({ resolveApiRequestUrl: (base: string, path: string) => `${base}${path}` }));
jest.mock('@/services/sessionService', () => ({
  getAccessToken: jest.fn(),
  invalidateAccessToken: jest.fn(async () => undefined),
}));

class FakeXhr {
  static last: FakeXhr;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  status = 0;
  responseText = '';
  body: unknown;
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
    this.onload?.();
  }
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('Cliente de subidas con progreso', () => {
  const original = global.XMLHttpRequest;
  beforeEach(() => {
    global.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
    jest.mocked(getAccessToken).mockResolvedValue('token-1');
  });
  afterEach(() => {
    global.XMLHttpRequest = original;
    jest.clearAllMocks();
  });

  it('envía con la sesión, informa el avance y devuelve el JSON', async () => {
    const onProgress = jest.fn();
    const body = new FormData();
    const promise = uploadRequest('/api/trainer/routines', { method: 'PUT', body, onProgress });
    await flush();

    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('https://api.example.test/api/trainer/routines');
    expect(xhr.headers.Authorization).toBe('Bearer token-1');
    expect(xhr.body).toBe(body);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    xhr.respond(200, { ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
    expect(onProgress.mock.calls).toEqual([[0.25], [1]]);
  });

  it('convierte las respuestas de error en ApiError y cierra la sesión rechazada', async () => {
    const promise = uploadRequest('/x', { body: new FormData() });
    await flush();
    FakeXhr.last.respond(401, { message: 'jwt expired' });

    await expect(promise).rejects.toMatchObject({ status: 401 });
    expect(invalidateAccessToken).toHaveBeenCalledWith('token-1');
  });

  it('no envía nada sin sesión', async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    await expect(uploadRequest('/x', { body: new FormData() })).rejects.toMatchObject({ status: 401 });
    expect(invalidateAccessToken).toHaveBeenCalledWith(null);
  });

  it('se cancela con AbortController y lo marca como cancelación', async () => {
    const controller = new AbortController();
    const promise = uploadRequest('/x', { body: new FormData(), signal: controller.signal });
    await flush();
    controller.abort();

    const error = await promise.catch((reason: unknown) => reason);
    expect(isUploadCancelled(error)).toBe(true);
    expect(isUploadCancelled(new ApiError('otro', 500))).toBe(false);
  });

  it('rechaza de inmediato si ya estaba cancelada', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await uploadRequest('/x', { body: new FormData(), signal: controller.signal }).catch((reason: unknown) => reason);
    expect(isUploadCancelled(error)).toBe(true);
  });

  it('reporta los fallos de red', async () => {
    const promise = uploadRequest('/x', { body: new FormData() });
    await flush();
    FakeXhr.last.onerror?.();
    await expect(promise).rejects.toThrow('Network request failed');
  });
});
