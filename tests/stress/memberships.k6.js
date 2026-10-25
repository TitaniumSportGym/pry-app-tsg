/* global __ENV */
// k6 modules are provided by its runtime, not by npm or Expo.
// eslint-disable-next-line import/no-unresolved
import http from 'k6/http';
// eslint-disable-next-line import/no-unresolved
import { check, sleep } from 'k6';
// eslint-disable-next-line import/no-unresolved
import { Counter, Rate, Trend } from 'k6/metrics';

import { buildConfig, ENDPOINT, RESULTS_DIR } from './config.mjs';

const config = buildConfig(__ENV);
export const options = config.options;

const recoveryOk = new Rate('recovery_ok');
const recoveryDuration = new Trend('recovery_duration', true);
const recoveryProbes = new Counter('recovery_probes');

function queryPlans(phase, timeoutSeconds = config.timeoutSeconds) {
  const response = http.get(config.url, {
    redirects: 0,
    timeout: `${timeoutSeconds}s`,
    responseCallback: http.expectedStatuses(200),
    headers: { Accept: 'application/json' },
    tags: { name: `GET ${ENDPOINT}`, phase },
  });
  let hasPlans = false;
  try {
    hasPlans = Array.isArray(response.json().plans);
  } catch {
    // HTML, invalid JSON and timeouts must fail the functional check.
  }
  const statusOk = check(response, {
    'consulta responde HTTP 200': (r) => r.status === 200,
  }, { phase, kind: 'status' });
  // HTTP failures stay in http_req_failed and the status checks. Validate the
  // success payload separately so the <5% HTTP error budget is not forced to 0%.
  if (response.status === 200) {
    check(response, {
      'respuesta contiene plans como arreglo': () => hasPlans,
    }, { phase, kind: 'contract' });
  }
  return { response, valid: statusOk && hasPlans };
}

export function setup() {
  // One bounded warmup request, with no retries. Cold-start time is excluded
  // from load thresholds, but failures are logged and abort setup with an error.
  try {
    const { response, valid } = queryPlans('warmup', config.warmupTimeoutSeconds);
    if (!valid) {
      throw new Error(`HTTP ${response.status}; contrato válido: ${valid}; error: ${response.error || 'sin detalle'}`);
    }
    console.info(`[warmup] Completado en ${response.timings.duration} ms.`);
  } catch (error) {
    console.error(`[warmup] Calentamiento fallido; medición cancelada: ${error.message}`);
    throw new Error('Calentamiento fallido; no se inició la medición de carga.');
  }

  // A failing preflight prevents the load scenario from starting.
  const { response, valid } = queryPlans('baseline');
  if (!valid || response.timings.duration >= config.recoveryMs) {
    throw new Error('La consulta base no cumple estado, contrato o latencia; carga cancelada.');
  }
}

export default function () {
  queryPlans('load');
  // One GET per iteration, with pacing even when the request fails immediately.
  sleep(config.pauseSeconds);
}

export function teardown() {
  // Runs after all VUs have stopped. No load scenario overlaps these probes.
  sleep(config.recoveryWaitSeconds);
  for (let index = 0; index < config.probes; index += 1) {
    const { response, valid } = queryPlans('recovery');
    recoveryProbes.add(1);
    recoveryDuration.add(response.timings.duration);
    recoveryOk.add(valid && response.timings.duration < config.recoveryMs);
    if (index < config.probes - 1) sleep(config.pauseSeconds);
  }
}

export function handleSummary(data) {
  const lines = [
    '# Carga ligera HTTP: consulta de membresías',
    '',
    `Endpoint: GET ${ENDPOINT}`,
    `Perfil: 1 → 2 → ${config.peakVus} → 0 VUs; ${config.durationSeconds}s de etapas, ${config.pauseSeconds}s de pausa por iteración.`,
    `Calentamiento separado: timeout ${config.warmupTimeoutSeconds}s; sus fallos cancelan la medición.`,
    '',
    '| Métrica | Valores |',
    '| --- | --- |',
  ];
  for (const [name, metric] of Object.entries(data.metrics)) {
    lines.push(`| ${name} | ${JSON.stringify(metric.values)} |`);
  }
  lines.push('', '| Umbral | Condición | Resultado |', '| --- | --- | --- |');
  for (const [name, metric] of Object.entries(data.metrics)) {
    for (const [condition, result] of Object.entries(metric.thresholds || {})) {
      lines.push(`| ${name} | ${condition} | ${result.ok ? 'APROBADO' : 'FALLIDO'} |`);
    }
  }
  const summary = `${lines.join('\n')}\n`;
  return {
    stdout: summary,
    [`${RESULTS_DIR}/summary.json`]: JSON.stringify(data, null, 2),
    [`${RESULTS_DIR}/summary.md`]: summary,
  };
}
