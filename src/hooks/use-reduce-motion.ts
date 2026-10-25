import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Follows the system "reduce motion" setting. */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Promise.resolve guards against platforms or mocks that do not return a promise.
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled === true);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}
