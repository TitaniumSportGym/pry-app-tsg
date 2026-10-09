import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { useRequestResetViewModel } from "@/features/password-recovery/viewmodels/use-request-reset-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function RequestResetFormView() {
  const viewModel = useRequestResetViewModel();
  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={viewModel.fieldError}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={{ ios: "envelope", android: "mail", web: "mail" }}
        placeholder="correo@ejemplo.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={viewModel.email}
        onChangeText={viewModel.setEmail}
        onSubmitEditing={() => void viewModel.submit()}
      />
      {viewModel.formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.formError}
        </Text>
      ) : null}
      <AppButton
        loading={viewModel.isSubmitting}
        title="Enviar código"
        onPress={() => void viewModel.submit()}
      />
      <Text style={styles.privacyText}>
        Por seguridad, recibirás la misma confirmación aunque el correo no esté
        registrado.
      </Text>
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
  privacyText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
