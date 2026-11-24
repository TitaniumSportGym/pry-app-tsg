import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  optional?: boolean;
  /** Mensaje de validación; marca el campo en rojo y se anuncia a los lectores de pantalla. */
  error?: string | null;
  /** Ayuda bajo el campo cuando no hay error, p. ej. "5 dígitos, por ejemplo 06000." */
  hint?: string;
}

/** Campo de formulario del sistema: etiqueta SemiBold, input #F3F3F4 radio 16 y error en rojo. */
export function FormField({
  label,
  required = false,
  optional = false,
  error,
  hint,
  multiline,
  onBlur,
  onFocus,
  ...props
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
      </Text>
      <TextInput
        accessibilityHint={error ?? hint}
        accessibilityLabel={label}
        cursorColor={AppColors.brand.primary}
        multiline={multiline}
        placeholderTextColor={AppColors.neutral.placeholder}
        selectionColor={AppColors.brand.primary}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        {...props}
      />
      {error ? (
        <View style={styles.messageRow}>
          <SymbolView
            name={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
            size={14}
            tintColor={AppColors.feedback.error}
          />
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 20,
  },
  required: { color: AppColors.brand.primary },
  optional: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: 12 },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    paddingHorizontal: 16,
  },
  inputMultiline: { minHeight: 80, paddingTop: 14, paddingBottom: 14 },
  inputFocused: { borderColor: AppColors.brand.primary, backgroundColor: AppColors.surface.default },
  inputError: { borderColor: AppColors.feedback.error, backgroundColor: AppColors.surface.soft },
  messageRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  error: {
    flex: 1,
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  hint: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
