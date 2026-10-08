/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

export const Colors = {
  light: {
    text: AppColors.neutral.text,
    background: AppColors.surface.default,
    backgroundElement: AppColors.surface.soft,
    backgroundSelected: AppColors.surface.softSelected,
    textSecondary: AppColors.neutral.muted,
  },
  dark: {
    text: AppColors.neutral.white,
    background: AppColors.surface.dark,
    backgroundElement: AppColors.surface.darkElevated,
    backgroundSelected: AppColors.surface.darkSelected,
    textSecondary: AppColors.neutral.mutedOnDark,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: AppFonts.body,
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: AppFonts.body,
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: AppFonts.body,
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = AppSpacing;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
