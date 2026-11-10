import { useEffect, useRef, useState } from 'react';

import { checkLabHealth, type HealthCheckResult } from '../data/health-check';

export function usePinningLabViewModel() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  async function run() {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setRunning(true);
    setResult(null);
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const response = await checkLabHealth(request.signal);
      if (controller.current === request) setResult(response);
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) { controller.current = null; setRunning(false); }
    }
  }

  return { result, running, run };
}
