/** Build-time rollout; production explicitly enables this after backend validation. */
export function isArcoBackendEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED === 'true';
}
