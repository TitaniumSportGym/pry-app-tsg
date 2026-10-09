import { StyleSheet, Text, View } from "react-native";

import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AppInput } from "@/components/ui/app-input";
import { useLoginOtpViewModel } from "@/features/authentication/viewmodels/use-login-otp-view-model";
import { AppColors, AppFonts, AppSpacing } from "@/theme/tokens";

interface LoginOtpViewProps {
  email?: string;
}

export function LoginOtpView({ email }: LoginOtpViewProps) {
  const viewModel = useLoginOtpViewModel(email);
  return (
    <AuthFormScreen
      compact
      description={`Ingresa el código enviado a ${email ?? "tu correo"}.`}
      fallbackHref="/login"
      title="VERIFICA TU ACCESO">
      <View style={styles.form}>
          <AppInput
            autoComplete="one-time-code"
            error={viewModel.error ?? undefined}
            keyboardType="number-pad"
            label="Código de verificación"
            leftIcon={{ ios: "number", android: "pin", web: "pin" }}
            maxLength={8}
            placeholder="000000"
            textContentType="oneTimeCode"
            value={viewModel.otp}
            onChangeText={viewModel.setOtp}
            onSubmitEditing={() => void viewModel.submit()}
          />
          <AuthSubmitButton
            loading={viewModel.isSubmitting}
            title="Verificar"
            onPress={() => void viewModel.submit()}
          />
          <Text
            accessibilityRole="link"
            onPress={viewModel.goBack}
            style={styles.backLink}
          >
            Volver al inicio de sesión
          </Text>
      </View>
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: AppSpacing.three },
  backLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
