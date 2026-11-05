import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const HOLD_PROGRESS_DURATION = 1100;
const MINIMUM_VISIBLE_DURATION = 1400;
const FADE_DURATION = 250;

interface AppSplashScreenProps {
  isReady: boolean;
}

export function AppSplashScreen({ isReady }: AppSplashScreenProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [progress] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const didHandleLayout = useRef(false);
  const startedAt = useRef<number | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    if (!hasStarted || isReady) {
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 0.82,
      duration: HOLD_PROGRESS_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();

    return () => animation.stop();
  }, [hasStarted, isReady, progress]);

  useEffect(() => {
    if (!hasStarted || !isReady) {
      return;
    }

    const elapsed = Date.now() - (startedAt.current ?? Date.now());
    const remainingDelay = Math.max(0, MINIMUM_VISIBLE_DURATION - elapsed);
    let animation: Animated.CompositeAnimation | null = null;

    const timeout = setTimeout(() => {
      animation = Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(120),
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }, remainingDelay);

    return () => {
      clearTimeout(timeout);
      animation?.stop();
    };
  }, [hasStarted, isReady, opacity, progress]);

  const handleLayout = useCallback(() => {
    if (didHandleLayout.current) {
      return;
    }

    didHandleLayout.current = true;
    startedAt.current = Date.now();

    if (Platform.OS === 'web') {
      setHasStarted(true);
      return;
    }

    SplashScreen.hideAsync()
      .catch((error: unknown) => {
        console.warn('No se pudo ocultar el splash nativo.', error);
      })
      .finally(() => setHasStarted(true));
  }, []);

  if (!isVisible) {
    return null;
  }

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['4%', '100%'],
  });

  return (
    <Animated.View onLayout={handleLayout} style={[styles.overlay, { opacity }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandArea}>
          <Image
            accessibilityLabel="Titanium Sport Gym"
            contentFit="contain"
            source={require('@/assets/images/imagesTSG/LogoSolo.png')}
            style={styles.logo}
            tintColor={AppColors.neutral.white}
          />
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.tagline}>
            {'FUERZA \u2022 DISCIPLINA \u2022 RESULTADOS'}
          </Text>
        </View>

        <View style={styles.loadingArea}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.loadingText}>Cargando...</Text>
          <Text style={styles.versionText}>{`Versi\u00f3n ${version}`}</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: AppColors.brand.primary,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.five,
  },
  logo: {
    width: 190,
    aspectRatio: 789 / 316,
  },
  tagline: {
    width: '100%',
    maxWidth: 280,
    marginTop: AppSpacing.two,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
  loadingArea: {
    minHeight: 174,
    alignItems: 'center',
    paddingHorizontal: AppSpacing.four,
    paddingBottom: AppSpacing.three,
  },
  progressTrack: {
    width: 132,
    height: 4,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: AppColors.overlay.whiteMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: AppColors.neutral.white,
  },
  loadingText: {
    marginTop: AppSpacing.three,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
  versionText: {
    marginTop: AppSpacing.four,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    opacity: 0.82,
    textAlign: 'center',
  },
});
