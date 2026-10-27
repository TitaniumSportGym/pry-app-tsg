// Run with: node --experimental-vm-modules --test tests/stress/offline.check.mjs
// No network APIs are exposed to the k6 script in this harness.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

import { buildConfig, ENDPOINT } from './config.mjs';

const env = {
  K6_BASE_URL: 'http://127.0.0.1:6565',
  K6_ALLOWED_ORIGIN: 'http://127.0.0.1:6565',
  K6_ENVIRONMENT: 'isolated',
  K6_CONFIRM_ISOLATED: 'true',
};

test('sin configuración aislada o confirmación se bloquea antes de cualquier solicitud', () => {
  assert.throws(() => buildConfig({}), /K6_ENVIRONMENT/);
  for (const name of Object.keys(env)) {
    assert.throws(() => buildConfig({ ...env, [name]: '' }), name);
  }
  assert.throws(() => buildConfig({ ...env, K6_CONFIRM_ISOLATED: 'false' }));
  assert.throws(() => buildConfig({ ...env, K6_ENVIRONMENT: 'production' }));
  assert.throws(() => buildConfig({ ...env, K6_ALLOWED_ORIGIN: 'https://other.invalid' }));
});

test('la URL admite solo un origen autorizado, sin credenciales ni rutas arbitrarias', () => {
  for (const url of [
    'https://user:secret@example.invalid', 'https://example.invalid/api',
    'https://example.invalid?query=1', 'https://example.invalid#fragment',
    'http://example.invalid', 'https://example.invalid:99999', 'file:///tmp/api',
    'https://example.invalid/path/../',
  ]) {
    assert.throws(() => buildConfig({ ...env, K6_BASE_URL: url, K6_ALLOWED_ORIGIN: url }), url);
  }
  const remote = buildConfig({
    ...env, K6_BASE_URL: 'https://isolated.invalid/', K6_ALLOWED_ORIGIN: 'https://isolated.invalid',
  });
  assert.equal(remote.url, `https://isolated.invalid${ENDPOINT}`);
});

test('el perfil inicial y los umbrales distinguen carga y recuperación', () => {
  const config = buildConfig(env);
  assert.equal(config.url, `${env.K6_BASE_URL}/api/memberships/plans`);
  assert.equal(config.peakVus, 3);
  assert.equal(config.durationSeconds, 31);
  assert.equal(config.pauseSeconds, 3);
  assert.equal(config.warmupTimeoutSeconds, 90);
  assert.equal(config.options.setupTimeout, '105s');
  assert.equal(config.options.scenarios.consulta_membresias.startVUs, 1);
  assert.deepEqual(config.options.scenarios.consulta_membresias.stages.map(s => s.target), [2, 3, 3, 0]);
  assert.deepEqual(config.options.scenarios.consulta_membresias.stages.map(s => s.duration), ['7s', '7s', '10s', '7s']);
  assert.deepEqual(config.options.thresholds['http_req_duration{phase:load}'], ['p(95)<3000']);
  assert.deepEqual(config.options.thresholds['http_req_failed{phase:load}'], ['rate<0.05']);
  assert.deepEqual(config.options.thresholds['checks{phase:load,kind:contract}'], ['rate==1']);
  assert.equal(config.options.thresholds['checks{phase:load}'], undefined);
  assert.deepEqual(config.options.thresholds.recovery_ok, ['rate==1']);
  assert.deepEqual(config.options.thresholds.recovery_probes, ['count==3']);
  assert.deepEqual(config.options.thresholds.recovery_duration, ['max<3000']);
});

test('los parámetros rechazan límites excesivos, valores inválidos y pausas nulas', () => {
  const limits = {
    K6_PEAK_VUS: [2, 3], K6_RAMP_SECONDS: [5, 10], K6_HOLD_SECONDS: [5, 10],
    K6_PAUSE_SECONDS: [2, 3], K6_REQUEST_TIMEOUT_SECONDS: [1, 10],
    K6_WARMUP_TIMEOUT_SECONDS: [15, 90],
    K6_RECOVERY_WAIT_SECONDS: [1, 30], K6_RECOVERY_PROBES: [3, 3],
    K6_P95_MS: [100, 5000], K6_RECOVERY_MAX_MS: [100, 5000],
  };
  for (const [name, [min, max]] of Object.entries(limits)) {
    for (const value of [min - 1, max + 1, '', 'NaN', 'Infinity', '1.5', '-1', '5s']) {
      assert.throws(() => buildConfig({ ...env, [name]: String(value) }), `${name}=${value}`);
    }
    buildConfig({ ...env, [name]: String(min) });
    buildConfig({ ...env, [name]: String(max) });
  }
});

async function loadScript(responses, overrides = {}) {
  const requests = [];
  const pauses = [];
  const samples = {};
  const logs = [];
  const checks = [];
  const context = createContext({
    __ENV: { ...env, ...overrides },
    console: {
      info: (message) => logs.push({ level: 'info', message }),
      error: (message) => logs.push({ level: 'error', message }),
    },
  });
  class Metric {
    constructor(name) { this.name = name; samples[name] = []; }
    add(value) { samples[this.name].push(value); }
  }
  const http = {
    expectedStatuses: (...statuses) => statuses,
    get(url, params) {
      requests.push({ url, params });
      const response = responses.shift();
      assert.ok(response, 'La prueba intentó una solicitud simulada no prevista.');
      if (response instanceof Error) throw response;
      return response;
    },
  };
  const runtime = {
    check(response, predicates, tags) {
      const valid = Object.values(predicates).map(fn => fn(response)).every(Boolean);
      checks.push({ tags, valid });
      return valid;
    },
    sleep: (seconds) => pauses.push(seconds),
  };
  const mockedModules = { 'k6/http': { default: http }, k6: runtime, 'k6/metrics': {
    Counter: Metric, Rate: Metric, Trend: Metric,
  } };
  const script = new SourceTextModule(await readFile(new URL('./memberships.k6.js', import.meta.url), 'utf8'), { context });
  await script.link(async (specifier) => {
    if (specifier === './config.mjs') {
      return new SourceTextModule(await readFile(new URL('./config.mjs', import.meta.url), 'utf8'), { context });
    }
    const exports = mockedModules[specifier];
    assert.ok(exports, `Importación inesperada: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await script.evaluate();
  return { script: script.namespace, requests, pauses, samples, logs, checks };
}

function response(status = 200, duration = 100, body = { plans: [] }) {
  return { status, timings: { duration }, json: () => body };
}

test('calentamiento, preflight, una iteración y recuperación solo solicitan GET al endpoint fijo', async () => {
  const h = await loadScript(Array.from({ length: 6 }, () => response()));
  h.script.setup();
  h.script.default();
  h.script.teardown();
  assert.equal(h.requests.length, 6);
  assert.deepEqual(h.requests.map(r => r.params.tags.phase), ['warmup', 'baseline', 'load', 'recovery', 'recovery', 'recovery']);
  for (const request of h.requests) {
    assert.equal(request.url, `${env.K6_BASE_URL}${ENDPOINT}`);
    assert.equal(request.params.redirects, 0);
    assert.equal(request.params.timeout, request.params.tags.phase === 'warmup' ? '90s' : '5s');
    assert.equal(request.params.headers.Authorization, undefined);
  }
  assert.deepEqual(h.pauses, [3, 5, 3, 3]);
  assert.deepEqual(h.samples.recovery_ok, [true, true, true]);
  assert.deepEqual(h.samples.recovery_probes, [1, 1, 1]);
});

test('preflight rechaza HTTP fallido, contrato incorrecto, JSON inválido y latencia excesiva', async () => {
  const invalidJson = { ...response(), json() { throw new Error('invalid JSON'); } };
  for (const initial of [response(503), response(200, 100, {}), invalidJson, response(200, 3000)]) {
    const h = await loadScript([response(), initial]);
    assert.throws(() => h.script.setup(), /carga cancelada/);
    assert.equal(h.requests.length, 2);
  }
});

test('calentamiento lento válido no contamina los umbrales de la medición', async () => {
  const h = await loadScript([response(200, 60000), response()]);
  h.script.setup();
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests.map(r => r.params.tags.phase), ['warmup', 'baseline']);
  assert.match(h.logs[0].message, /60000 ms/);
  assert.equal(h.logs[0].level, 'info');
  assert.ok(h.checks.every(c => c.tags.phase !== 'load'));
});

test('calentamiento fallido registra el error y aborta antes del preflight y la medición, sin reintentos', async () => {
  const invalidJson = { ...response(), json() { throw new Error('invalid JSON'); } };
  const timeout = { ...response(0, 90000), error: 'request timeout' };
  for (const initial of [response(503), response(200, 100, {}), invalidJson, timeout, new Error('transport failed')]) {
    const h = await loadScript([initial]);
    assert.throws(() => h.script.setup(), /Calentamiento fallido/);
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].params.tags.phase, 'warmup');
    assert.equal(h.logs.length, 1);
    assert.equal(h.logs[0].level, 'error');
    assert.match(h.logs[0].message, /medición cancelada/);
  }
});

test('los errores y contratos inválidos de la carga se registran después de calentar, sin reintentos', async () => {
  const h = await loadScript([response(), response(), response(503), response(200, 4000, {})]);
  h.script.setup();
  h.script.default();
  h.script.default();
  const loadRequests = h.requests.filter(r => r.params.tags.phase === 'load');
  assert.equal(loadRequests.length, 2);
  assert.equal(loadRequests[0].params.timeout, '5s');
  assert.deepEqual(h.pauses, [3, 3]);
  assert.ok(h.checks.some(c => c.tags.phase === 'load' && c.tags.kind === 'status' && !c.valid));
  assert.ok(h.checks.some(c => c.tags.phase === 'load' && c.tags.kind === 'contract' && !c.valid));
  assert.ok(!h.checks.some(c => c.tags.phase === 'load' && c.tags.kind === 'contract' && c.valid));
});

test('recuperación fallida o lenta registra muestras fallidas y completa las tres sondas', async () => {
  const h = await loadScript([response(503), response(200, 3200), response()]);
  h.script.teardown();
  assert.deepEqual(h.samples.recovery_ok, [false, false, true]);
  assert.deepEqual(h.samples.recovery_duration, [100, 3200, 100]);
  assert.equal(h.requests.length, 3);
});

test('el informe conserva métricas y umbrales fallidos sin publicar el origen', async () => {
  const h = await loadScript([]);
  const data = { metrics: { http_reqs: { values: { count: 42 } }, recovery_ok: {
    values: { rate: 0 }, thresholds: { 'rate==1': { ok: false } },
  } } };
  const report = h.script.handleSummary(data);
  assert.deepEqual(JSON.parse(report['coverage/stress/summary.json']), data);
  assert.match(report['coverage/stress/summary.md'], /FALLIDO/);
  assert.match(report.stdout, /http_reqs/);
  assert.doesNotMatch(report.stdout, /127\.0\.0\.1/);
  assert.equal(h.requests.length, 0);
});
