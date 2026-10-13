import { Platform } from 'react-native';

import { AppColors } from '@/theme/tokens';

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
