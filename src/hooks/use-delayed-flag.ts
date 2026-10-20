import { useEffect, useState } from 'react';

/**
 * Turns true only after `active` has stayed true for `delayMs`.
 * Used to avoid flashing a skeleton when the API answers quickly.
 */
export function useDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;

    const timeout = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(timeout);
      setElapsed(false);
    };
  }, [active, delayMs]);

  return active && elapsed;
}
