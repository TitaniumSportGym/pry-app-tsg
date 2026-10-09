import { useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { PasswordRequirementsView } from "@/features/authentication/views/password-requirements-view";
import { useResetPasswordViewModel } from "@/features/password-recovery/viewmodels/use-reset-password-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function ResetPasswordFormView() {
  const viewModel = useResetPasswordViewModel();
  const confirmPasswordInput = useRef<TextInput>(null);

  if (!viewModel.hasRecoveryData) {
    return (
      <View style={styles.form}>
        <Text accessibilityRole="alert" style={styles.formError}>
          Faltan los datos de recuperación. Solicita un código nuevamente.
        </Text>
        <AppButton title="Solicitar código" onPress={viewModel.restart} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={viewModel.fieldErrors.password}
        label="Nueva contraseña"
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
      <AppButton
        loading={viewModel.isSubmitting}
        title="Cambiar contraseña"
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
