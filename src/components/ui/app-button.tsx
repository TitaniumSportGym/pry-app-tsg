import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'outline' | 'dark';

interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const [scale] = useState(() => new Animated.Value(1));

  function animateScale(toValue: number) {
    Animated.spring(scale, {
      toValue,
      speed: 36,
      bounciness: 2,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  return (
    <Animated.View style={[styles.animationContainer, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          isPrimary ? styles.primary : isDark ? styles.dark : styles.outline,
          pressed && isPrimary && styles.primaryPressed,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
        onPressIn={(event) => {
          if (!isDisabled) animateScale(0.97);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateScale(1);
          onPressOut?.(event);
        }}
        {...props}>
        {loading ? (
          <ActivityIndicator
            color={isPrimary || isDark ? AppColors.neutral.white : AppColors.neutral.text}
          />
        ) : (
          <>
            {leftIcon}
            <Text
              style={[
                styles.title,
                isPrimary || isDark ? styles.primaryTitle : styles.outlineTitle,
              ]}>
              {title}
            </Text>
            {rightIcon}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animationContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingHorizontal: AppSpacing.three,
  },
  primary: {
    backgroundColor: AppColors.brand.primary,
  },
  primaryPressed: {
    backgroundColor: AppColors.brand.pressed,
  },
  dark: {
    backgroundColor: AppColors.neutral.black,
  },
  outline: {
    borderWidth: 1,
    borderColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.56,
  },
  title: {
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryTitle: {
    color: AppColors.neutral.white,
    textTransform: 'uppercase',
  },
  outlineTitle: {
    color: AppColors.neutral.text,
  },
});
