import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { AppColors, AppFonts } from '@/theme/tokens';

const MAX_VISIBLE = 9;

export function formatBadgeCount(count: number) {
  return count > MAX_VISIBLE ? `${MAX_VISIBLE}+` : String(count);
}

/** Red counter over a tab icon; it bounces when the number goes up. */
export function TabBadge({ count }: { count: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef(count);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const increased = count > previous.current;
    previous.current = count;
    if (!increased || reduceMotion) return;

    const bounce = Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.45,
        speed: 40,
        bounciness: 12,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 20,
        bounciness: 10,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    bounce.start();

    return () => bounce.stop();
  }, [count, reduceMotion, scale]);

  if (count <= 0) return null;

  return (
    <Animated.Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.badge, { transform: [{ scale }] }]}
    >
      {formatBadgeCount(count)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: AppColors.surface.default,
    borderRadius: 9,
    backgroundColor: AppColors.brand.primary,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 3,
    textAlign: 'center',
  },
});
