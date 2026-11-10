export type PinningLabVariant = 'pinning-lab-valid' | 'pinning-lab-invalid';

export interface PinningLabIdentity {
  variant: PinningLabVariant;
  host: 'server-titanium.onrender.com';
}

/** Check the embedded variant AND its package; a public JS flag alone is insufficient. */
export function resolvePinningLabIdentity(
  platform: string,
  storeClient: boolean,
  config: { android?: { package?: string }; extra?: Record<string, unknown> } | null | undefined,
): PinningLabIdentity | null {
  if (platform !== 'android' || storeClient) return null;
  const extra = config?.extra?.pinningLab;
  if (!extra || typeof extra !== 'object') return null;
  const lab = extra as Record<string, unknown>;
  if (lab.host !== 'server-titanium.onrender.com') return null;
  if (lab.variant === 'pinning-lab-valid' && config?.android?.package === 'com.titaniumsportgym.app.lab.valid') {
    return { variant: lab.variant, host: lab.host };
  }
  if (lab.variant === 'pinning-lab-invalid' && config?.android?.package === 'com.titaniumsportgym.app.lab.invalid') {
    return { variant: lab.variant, host: lab.host };
  }
  return null;
}
