const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

/** No credentials, control characters or backslashes may hide the actual host. */
export function validateApiUrl(value: string, allowLocalHttp: boolean): URL {
  if (/\s|\\/.test(value) || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new Error('Invalid API URL.');
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid API URL.'); }
  if (url.username || url.password || url.hash) throw new Error('Invalid API URL.');
  if (url.protocol !== 'https:' &&
      !(allowLocalHttp && url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('The API requires HTTPS. HTTP is only available for local development.');
  }
  return url;
}

/** This HTTP client is dedicated to one API; public requests also carry sensitive forms. */
export function resolveApiRequestUrl(baseUrl: string, path: string, allowLocalHttp: boolean): string {
  const base = validateApiUrl(baseUrl, allowLocalHttp);
  if (base.search) throw new Error('The API base URL cannot contain a query.');
  if (path.startsWith('//') || path.trim() !== path) throw new Error('Invalid API path.');
  const absolute = /^[a-z][a-z\d+.-]*:/i.test(path);
  const value = absolute ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const target = validateApiUrl(value, allowLocalHttp);
  if (target.origin !== base.origin) throw new Error('API requests must stay on the configured origin.');
  return target.href;
}
