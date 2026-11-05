import { useRef } from "react";
import { Pressable, StyleSheet, Text, View, type TextInputInstance } from "react-native";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AppInput } from "@/components/ui/app-input";
import { PasswordRequirementsView } from "@/features/authentication/views/password-requirements-view";
import { useRegistrationViewModel } from "@/features/registration/viewmodels/use-registration-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function RegistrationFormView() {
  const viewModel = useRegistrationViewModel();
  const passwordInput = useRef<TextInputInstance>(null);
  const confirmPasswordInput = useRef<TextInputInstance>(null);

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
      <Pressable
        accessibilityLabel="Acepto el Aviso de Privacidad para crear mi cuenta"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: viewModel.privacyAccepted, disabled: viewModel.isSubmitting || (viewModel.privacyEnabled && !viewModel.notice) }}
        disabled={viewModel.isSubmitting || (viewModel.privacyEnabled && !viewModel.notice)}
        style={styles.consent}
        onPress={() => viewModel.setPrivacyAccepted(!viewModel.privacyAccepted)}>
        <Text aria-hidden style={styles.checkbox}>{viewModel.privacyAccepted ? '☑' : '☐'}</Text>
        <Text style={styles.consentText}>Acepto el Aviso de Privacidad para crear mi cuenta.</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={viewModel.openPrivacyNotice}>
        <Text style={styles.privacyLink}>Consultar Aviso de Privacidad</Text>
      </Pressable>
      <Text style={styles.consentNote}>
        Esta aceptación no incluye promociones ni otros usos opcionales.{' '}
        {viewModel.privacyEnabled
          ? 'El servidor debe confirmar la versión y emitir un comprobante.'
          : 'Por ahora no se emite un comprobante de consentimiento.'}
      </Text>
      {viewModel.privacyEnabled && viewModel.notice ? <Text style={styles.consentNote}>Versión del aviso: {viewModel.notice.version}</Text> : null}
      {viewModel.noticeLoading ? <Text style={styles.consentNote}>Consultando aviso aprobado…</Text> : null}
      {viewModel.noticeError ? (
        <>
          <Text accessibilityRole="alert" style={styles.formError}>{viewModel.noticeError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void viewModel.reloadNotice()}>
            <Text style={styles.privacyLink}>Reintentar consulta del aviso</Text>
          </Pressable>
        </>
      ) : null}
      {viewModel.fieldErrors.privacyAccepted ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.fieldErrors.privacyAccepted}
        </Text>
      ) : null}
      {viewModel.formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {viewModel.formError}
        </Text>
      ) : null}
      <AuthSubmitButton
        loading={viewModel.isSubmitting}
        disabled={viewModel.privacyEnabled && !viewModel.notice}
        title="Crear cuenta"
        onPress={() => void viewModel.submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: AppSpacing.three },
  consent: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.two, minHeight: 48 },
  checkbox: { color: AppColors.brand.primary, fontSize: 26 },
  consentText: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
  },
  privacyLink: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    textDecorationLine: 'underline',
    paddingVertical: AppSpacing.two,
  },
  consentNote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  formError: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
