import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** True mientras la app está en primer plano (no en segundo plano ni en el selector de apps). */
export function useAppActive() {
  const [active, setActive] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return active;
}
