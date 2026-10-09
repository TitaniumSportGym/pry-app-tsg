import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { useLoginOtpViewModel } from "@/features/authentication/viewmodels/use-login-otp-view-model";
import { AppColors, AppFonts, AppSpacing } from "@/theme/tokens";

interface LoginOtpViewProps {
  email?: string;
}

export function LoginOtpView({ email }: LoginOtpViewProps) {
  const viewModel = useLoginOtpViewModel(email);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verificar código</Text>
          <Text style={styles.description}>
            Ingresa el código enviado a {email ?? "tu correo"}.
          </Text>
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
          <AppButton
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.soft },
  keyboardView: { flex: 1, justifyContent: "center" },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.four,
    paddingVertical: AppSpacing.five,
  },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 24,
    lineHeight: 30,
  },
  description: {
    marginBottom: AppSpacing.two,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  backLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
