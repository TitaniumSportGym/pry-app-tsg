/** Opt-in rollout. Never enable against the undeployed production backend. */
export function isArcoBackendEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED === 'true';
}
