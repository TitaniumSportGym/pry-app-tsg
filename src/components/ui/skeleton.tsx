import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { AppColors } from '@/theme/tokens';

const SHIMMER_DURATION_MS = 1200;

const ShimmerContext = createContext<Animated.Value | null>(null);

interface SkeletonGroupProps {
  children: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a skeleton layout. All blocks share one shimmer animation, and screen
 * readers announce the whole group once instead of every block.
 */
export function SkeletonGroup({ children, label = 'Cargando', style }: SkeletonGroupProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [progress, reduceMotion]);

  return (
    <ShimmerContext.Provider value={reduceMotion ? null : progress}>
      <View
        accessible
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={style}>
        <View importantForAccessibility="no-hide-descendants">{children}</View>
      </View>
    </ShimmerContext.Provider>
  );
}

interface SkeletonBlockProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width = '100%',
  height,
  radius = 6,
  tone = 'light',
  style,
}: SkeletonBlockProps) {
  const progress = useContext(ShimmerContext);
  const [blockWidth, setBlockWidth] = useState(0);
  const isDark = tone === 'dark';

  return (
    <View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? AppColors.skeleton.dark : AppColors.skeleton.light,
        },
        style,
      ]}
      onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)}>
      {progress && blockWidth > 0 ? (
        <Animated.View
          style={[
            styles.highlight,
            {
              width: blockWidth * 0.6,
              backgroundColor: isDark
                ? AppColors.skeleton.highlightDark
                : AppColors.skeleton.highlightLight,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-blockWidth * 0.6, blockWidth],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  highlight: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
