import { StyleSheet, Text, View } from "react-native";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { useAccountVerificationViewModel } from "@/features/registration/viewmodels/use-account-verification-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

interface AccountVerificationFormViewProps {
  email?: string;
}

export function AccountVerificationFormView({
  email,
}: AccountVerificationFormViewProps) {
  const viewModel = useAccountVerificationViewModel(email);
  return (
    <View style={styles.form}>
      <View style={styles.emailArea}>
        <Text style={styles.emailLabel}>Código enviado a</Text>
        <Text numberOfLines={2} style={styles.email}>
          {viewModel.email ?? "correo no disponible"}
        </Text>
      </View>
      <AppInput
        autoComplete="one-time-code"
        error={viewModel.fieldError}
        keyboardType="number-pad"
        label="Código de verificación"
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
        disabled={!viewModel.email || viewModel.isResending}
        loading={viewModel.isSubmitting}
        title="Verificar correo"
        onPress={() => void viewModel.verify()}
      />
      <AppButton
        disabled={!viewModel.email || viewModel.isSubmitting}
        loading={viewModel.isResending}
        title="Reenviar código"
        variant="outline"
        onPress={() => void viewModel.resend()}
      />
      <Text style={styles.helpText}>
        Revisa también la carpeta de correo no deseado. El código puede tardar
        unos minutos.
      </Text>
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
  helpText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
