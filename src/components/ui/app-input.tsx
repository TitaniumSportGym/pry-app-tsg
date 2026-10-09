import { SymbolView } from 'expo-symbols';
import { forwardRef, useState, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon: SymbolName;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { label, error, leftIcon, secureTextEntry = false, onBlur, onFocus, style, ...props },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const hidesPassword = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}>
        <SymbolView name={leftIcon} size={19} tintColor={AppColors.neutral.muted} />
        <TextInput
          ref={ref}
          cursorColor={AppColors.brand.primary}
          placeholderTextColor={AppColors.neutral.placeholder}
          secureTextEntry={hidesPassword}
          selectionColor={AppColors.brand.primary}
          style={[styles.input, style]}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          {...props}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}>
            <SymbolView
              name={{
                ios: isPasswordVisible ? 'eye.slash' : 'eye',
                android: isPasswordVisible ? 'visibility_off' : 'visibility',
                web: isPasswordVisible ? 'visibility_off' : 'visibility',
              }}
              size={19}
              tintColor={AppColors.neutral.muted}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    width: '100%',
    gap: 6,
  },
  label: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  inputContainer: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 7,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: AppColors.brand.primary,
  },
  inputContainerError: {
    borderColor: AppColors.feedback.error,
  },
  input: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    paddingVertical: 0,
  },
  passwordToggle: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
