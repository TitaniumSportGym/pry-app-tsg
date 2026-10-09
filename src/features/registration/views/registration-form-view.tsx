import { useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AppInput } from "@/components/ui/app-input";
import { PasswordRequirementsView } from "@/features/authentication/views/password-requirements-view";
import { useRegistrationViewModel } from "@/features/registration/viewmodels/use-registration-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function RegistrationFormView() {
  const viewModel = useRegistrationViewModel();
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);

  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={viewModel.fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={{ ios: "envelope", android: "mail", web: "mail" }}
        placeholder="correo@ejemplo.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={viewModel.email}
        onChangeText={viewModel.setEmail}
        onSubmitEditing={() => passwordInput.current?.focus()}
      />
      <AppInput
        ref={passwordInput}
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={viewModel.fieldErrors.password}
        label="Contraseña"
        leftIcon={{ ios: "lock", android: "lock", web: "lock" }}
        placeholder="••••••••"
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={viewModel.password}
        onChangeText={viewModel.setPassword}
        onSubmitEditing={() => confirmPasswordInput.current?.focus()}
      />
      <PasswordRequirementsView password={viewModel.password} />
      <AppInput
        ref={confirmPasswordInput}
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={viewModel.fieldErrors.confirmPassword}
        label="Confirmar contraseña"
        leftIcon={{ ios: "lock", android: "lock", web: "lock" }}
        placeholder="••••••••"
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={viewModel.confirmPassword}
        onChangeText={viewModel.setConfirmPassword}
        onSubmitEditing={() => void viewModel.submit()}
      />
      {viewModel.formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.formError}
        </Text>
      ) : null}
      <AuthSubmitButton
        loading={viewModel.isSubmitting}
        title="Crear cuenta"
        onPress={() => void viewModel.submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: AppSpacing.three },
  formError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
