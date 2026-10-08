import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'outline';

interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  leftIcon,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.outline,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? AppColors.neutral.white : AppColors.neutral.text} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.title, isPrimary ? styles.primaryTitle : styles.outlineTitle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 50,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingHorizontal: AppSpacing.three,
  },
  primary: {
    backgroundColor: AppColors.brand.primary,
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
