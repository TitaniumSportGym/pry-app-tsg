export const ENDPOINT = '/api/memberships/plans';
export const RESULTS_DIR = 'coverage/stress';

function integer(env, name, fallback, min, max) {
  const value = env[name] === undefined ? String(fallback) : String(env[name]);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
  return Number(value);
}

function origin(value, name) {
  // Accept origins only: no credentials, query, fragments or configurable paths.
  const normalized = String(value || '').trim().replace(/\/$/, '').toLowerCase();
  const match = /^(https?):\/\/(localhost|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[a-f0-9:]+\])(?::([0-9]{1,5}))?$/.exec(normalized);
  if (!match || (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535))) {
    throw new Error(`${name} debe contener un origen HTTP(S) sin ruta ni credenciales.`);
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(match[2]);
  if (match[1] === 'http' && !loopback) {
    throw new Error(`${name}: HTTP solo se permite en loopback; usa HTTPS en el entorno aislado.`);
  }
  return normalized;
}

export function buildConfig(env) {
  if (env.K6_ENVIRONMENT !== 'isolated' || env.K6_CONFIRM_ISOLATED !== 'true') {
    throw new Error('Configura K6_ENVIRONMENT=isolated y K6_CONFIRM_ISOLATED=true antes de cualquier solicitud.');
  }
  const baseUrl = origin(env.K6_BASE_URL, 'K6_BASE_URL');
  if (baseUrl !== origin(env.K6_ALLOWED_ORIGIN, 'K6_ALLOWED_ORIGIN')) {
    throw new Error('K6_BASE_URL debe coincidir con K6_ALLOWED_ORIGIN del entorno aislado.');
  }

  const peakVus = integer(env, 'K6_PEAK_VUS', 3, 2, 3);
  const rampSeconds = integer(env, 'K6_RAMP_SECONDS', 7, 5, 10);
  const holdSeconds = integer(env, 'K6_HOLD_SECONDS', 10, 5, 10);
  const pauseSeconds = integer(env, 'K6_PAUSE_SECONDS', 3, 2, 3);
  const timeoutSeconds = integer(env, 'K6_REQUEST_TIMEOUT_SECONDS', 5, 1, 10);
  const warmupTimeoutSeconds = integer(env, 'K6_WARMUP_TIMEOUT_SECONDS', 90, 15, 90);
  const recoveryWaitSeconds = integer(env, 'K6_RECOVERY_WAIT_SECONDS', 5, 1, 30);
  const probes = integer(env, 'K6_RECOVERY_PROBES', 3, 3, 3);
  const p95Ms = integer(env, 'K6_P95_MS', 3000, 100, 5000);
  const recoveryMs = integer(env, 'K6_RECOVERY_MAX_MS', 3000, 100, 5000);
  const durationSeconds = rampSeconds * 3 + holdSeconds;

  return {
    url: `${baseUrl}${ENDPOINT}`,
    peakVus, durationSeconds, pauseSeconds, timeoutSeconds, warmupTimeoutSeconds,
    recoveryWaitSeconds, probes, recoveryMs,
    options: {
      scenarios: {
        consulta_membresias: {
          executor: 'ramping-vus',
          startVUs: 1,
          stages: [
            { duration: `${rampSeconds}s`, target: 2 },
            { duration: `${rampSeconds}s`, target: peakVus },
            { duration: `${holdSeconds}s`, target: peakVus },
            { duration: `${rampSeconds}s`, target: 0 },
          ],
          gracefulRampDown: `${timeoutSeconds + pauseSeconds + 1}s`,
          gracefulStop: `${timeoutSeconds + pauseSeconds + 1}s`,
        },
      },
      setupTimeout: `${warmupTimeoutSeconds + timeoutSeconds + 10}s`,
      teardownTimeout: '120s',
      summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)'],
      thresholds: {
        'http_req_duration{phase:load}': [`p(95)<${p95Ms}`],
        'http_req_failed{phase:load}': ['rate<0.05'],
        'checks{phase:load,kind:contract}': ['rate==1'],
        'http_reqs{phase:load}': ['count>0'],
        iterations: ['count>0'],
        recovery_ok: ['rate==1'],
        recovery_duration: [`max<${recoveryMs}`],
        recovery_probes: [`count==${probes}`],
      },
    },
  };
}
