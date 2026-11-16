import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' };

/** Piezas de las pantallas "Verificando pago" y su resultado (33, 34, 40, 57–59). */

export function PaymentStep({ label, state }: { label: string; state: 'done' | 'current' | 'pending' }) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepMark,
          state === 'done' && styles.stepDone,
          state === 'current' && styles.stepCurrent,
        ]}>
        {state === 'done' ? (
          <SymbolView name={CHECK_ICON} size={14} tintColor={AppColors.neutral.white} />
        ) : state === 'current' ? (
          <View style={styles.stepDot} />
        ) : null}
      </View>
      <Text style={[styles.stepLabel, state === 'pending' && styles.stepLabelPending]}>{label}</Text>
    </View>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/** Anillo de carga; se queda quieto si el sistema pide reducir el movimiento. */
export function PaymentSpinner({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active || reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View accessibilityLabel="Verificando pago" accessible style={styles.spinner}>
      <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]} />
      <View style={styles.spinnerCore} />
    </View>
  );
}

type ResultTone = 'success' | 'error' | 'pending';

const RESULT_ICONS: Record<ResultTone, SymbolViewProps['name']> = {
  success: CHECK_ICON,
  error: { ios: 'xmark', android: 'close', web: 'close' },
  pending: { ios: 'clock', android: 'schedule', web: 'schedule' },
};

/** Insignia circular del resultado: verde (aprobado), roja (rechazado) o negra (en proceso). */
export function ResultBadge({ tone }: { tone: ResultTone }) {
  return (
    <View style={[styles.halo, tone === 'success' ? styles.haloSuccess : tone === 'error' ? styles.haloError : styles.haloPending]}>
      <View
        style={[
          styles.circle,
          tone === 'success' ? styles.circleSuccess : tone === 'error' ? styles.circleError : styles.circlePending,
        ]}>
        <SymbolView name={RESULT_ICONS[tone]} size={32} tintColor={AppColors.neutral.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  link: { paddingVertical: AppSpacing.two },
  linkText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  spinner: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  spinnerRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 10,
    borderColor: AppColors.surface.softSelected,
    borderTopColor: AppColors.brand.primary,
  },
  spinnerCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.surface.default,
  },
  step: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  stepMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { borderWidth: 0, backgroundColor: AppColors.feedback.success },
  stepCurrent: { borderColor: AppColors.brand.primary },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.brand.primary },
  stepLabel: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  stepLabelPending: { color: AppColors.neutral.muted },
  halo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloSuccess: { backgroundColor: AppColors.surface.default, boxShadow: '0 10px 24px rgba(23, 120, 74, 0.25)' },
  haloError: { backgroundColor: AppColors.surface.softSelected },
  haloPending: { backgroundColor: AppColors.surface.input },
  circle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  circleSuccess: { backgroundColor: AppColors.feedback.success },
  circleError: { backgroundColor: AppColors.feedback.error },
  circlePending: { backgroundColor: AppColors.surface.dark },
});
