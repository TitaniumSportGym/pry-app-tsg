// Offline validation only: no k6 import, DNS lookup or HTTP request.
import { buildConfig, ENDPOINT } from './config.mjs';

const config = buildConfig(process.env);
console.log(JSON.stringify({
  endpoint: `GET ${ENDPOINT}`,
  peakVus: config.peakVus,
  durationSeconds: config.durationSeconds,
  pauseSeconds: config.pauseSeconds,
  requestTimeoutSeconds: config.timeoutSeconds,
  warmupTimeoutSeconds: config.warmupTimeoutSeconds,
  recoveryWaitSeconds: config.recoveryWaitSeconds,
  recoveryProbes: config.probes,
  recoveryMaxMs: config.recoveryMs,
  options: config.options,
}, null, 2));
