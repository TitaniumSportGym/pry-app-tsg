import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/navigation/app-tab-bar';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { AppColors } from '@/theme/tokens';

const SIZE = 64;
const DURATION_MS = 750;
/** How far above the start the arc rises before dropping into the cart. */
const ARC_HEIGHT = 140;

interface Point {
  x: number;
  y: number;
}

interface Flight {
  from: Point;
  to: Point;
  imageUrl: string | null;
}

/**
 * "Fly to cart" animation: the product photo leaves the button, arcs up and
 * drops into the Carrito tab, which sits in the middle of the tab bar.
 * It is purely visual, so it lives in the view layer; with "reduce motion"
 * enabled the item is added at once.
 *
 * Coordinates are window coordinates: the detail screen starts at the top of the
 * window, so the touch position (pageX/pageY) is also the position on screen.
 */
export function useFlyToCart() {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [flight, setFlight] = useState<Flight | null>(null);

  function launch(origin: Point, imageUrl: string | null, onArrive: () => void) {
    if (reduceMotion) {
      onArrive();
      return;
    }

    const from = { x: origin.x - SIZE / 2, y: origin.y - SIZE / 2 };
    const to = {
      x: width / 2 - SIZE / 2,
      y: height - insets.bottom - TAB_BAR_HEIGHT / 2 - SIZE / 2,
    };

    progress.setValue(0);
    setFlight({ from, to, imageUrl });
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setFlight(null);
      onArrive();
    });
  }

  const flyer = flight ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyer,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [flight.from.x, flight.to.x],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [flight.from.y, flight.from.y - ARC_HEIGHT, flight.to.y],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0.6, 1.05, 0.3],
              }),
            },
            {
              rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-18deg'] }),
            },
          ],
        },
      ]}
    >
      {flight.imageUrl ? (
        <Image contentFit="contain" source={{ uri: flight.imageUrl }} style={styles.image} />
      ) : (
        <SymbolView
          name={{ ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }}
          size={28}
          tintColor={AppColors.brand.primary}
        />
      )}
    </Animated.View>
  ) : null;

  return { isFlying: flight !== null, launch, flyer };
}

const styles = StyleSheet.create({
  flyer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    width: SIZE,
    height: SIZE,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: AppColors.brand.primary,
    borderRadius: SIZE / 2,
    backgroundColor: AppColors.surface.default,
    boxShadow: '0 6px 16px rgba(15, 15, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
});
