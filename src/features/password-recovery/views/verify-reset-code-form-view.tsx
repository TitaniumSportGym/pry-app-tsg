import { StyleSheet, Text, View } from "react-native";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { useVerifyResetCodeViewModel } from "@/features/password-recovery/viewmodels/use-verify-reset-code-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function VerifyResetCodeFormView() {
  const viewModel = useVerifyResetCodeViewModel();

  if (!viewModel.email) {
    return (
      <View style={styles.form}>
        <Text accessibilityRole="alert" style={styles.formError}>
          Faltan los datos de recuperación. Solicita un código nuevamente.
        </Text>
        <AuthSubmitButton title="Solicitar código" onPress={viewModel.restart} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.emailArea}>
        <Text style={styles.emailLabel}>Código enviado a</Text>
        <Text numberOfLines={2} style={styles.email}>
          {viewModel.email}
        </Text>
      </View>
      <AppInput
        autoComplete="one-time-code"
        error={viewModel.fieldError}
        keyboardType="number-pad"
        label="Código de recuperación"
        leftIcon={{ ios: "number", android: "pin", web: "pin" }}
        maxLength={6}
        placeholder="000000"
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={viewModel.otp}
        onChangeText={viewModel.setOtp}
        onSubmitEditing={() => void viewModel.verify()}
      />
      {viewModel.formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.formError}
        </Text>
      ) : null}
      {viewModel.statusMessage ? (
        <Text accessibilityRole="alert" style={styles.statusMessage}>
          {viewModel.statusMessage}
        </Text>
      ) : null}
      <AuthSubmitButton
        disabled={viewModel.isResending}
        loading={viewModel.isSubmitting}
        title="Verificar código"
        onPress={() => void viewModel.verify()}
      />
      <AppButton
        disabled={viewModel.isSubmitting || viewModel.cooldown > 0}
        loading={viewModel.isResending}
        title={
          viewModel.cooldown > 0
            ? `Reenviar código (${viewModel.cooldown}s)`
            : "Reenviar código"
        }
        variant="outline"
        onPress={() => void viewModel.resend()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: AppSpacing.three },
  emailArea: { gap: AppSpacing.one },
  emailLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  email: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  formError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
  statusMessage: {
    color: AppColors.feedback.success,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
