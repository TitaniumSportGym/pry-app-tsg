/** Opt-in rollout for authorized test builds; production is explicitly disabled in eas.json. */
export function isArcoBackendEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED === 'true';
}
