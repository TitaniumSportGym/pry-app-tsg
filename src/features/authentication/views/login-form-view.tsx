import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { useLoginViewModel } from "@/features/authentication/viewmodels/use-login-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function LoginFormView() {
  const viewModel = useLoginViewModel();

  return (
    <View style={styles.form}>
      <AppInput
        autoCapitalize="none"
        autoComplete="email"
        error={viewModel.fieldErrors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={{ ios: "envelope", android: "mail", web: "mail" }}
        placeholder="correo@ejemplo.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={viewModel.email}
        onChangeText={viewModel.setEmail}
      />
      <AppInput
        autoCapitalize="none"
        autoComplete="current-password"
        error={viewModel.fieldErrors.password}
        label="Contraseña"
        leftIcon={{ ios: "lock", android: "lock", web: "lock" }}
        placeholder="••••••••"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={viewModel.password}
        onChangeText={viewModel.setPassword}
        onSubmitEditing={() => void viewModel.submit()}
      />
      <Link href="/forgot-password" style={styles.forgotPassword}>
        Olvidé mi contraseña
      </Link>
      {viewModel.formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.formError}
        </Text>
      ) : null}
      <AppButton
        loading={viewModel.isSubmitting}
        title="Iniciar sesión"
        onPress={() => void viewModel.submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: AppSpacing.three },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -4,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textDecorationLine: "underline",
  },
  formError: {
    marginTop: -4,
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
