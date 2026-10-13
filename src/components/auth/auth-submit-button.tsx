import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AppColors } from '@/theme/tokens';

type AppButtonProps = ComponentProps<typeof AppButton>;

type AuthSubmitButtonProps = Pick<
  AppButtonProps,
  'disabled' | 'loading' | 'onPress' | 'title'
>;

export function AuthSubmitButton(props: AuthSubmitButtonProps) {
  return (
    <AppButton
      {...props}
      rightIcon={
        <SymbolView
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          size={20}
          tintColor={AppColors.neutral.white}
        />
      }
      variant="primary"
    />
  );
}
