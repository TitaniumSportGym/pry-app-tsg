import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useGoogleSignInViewModel } from "@/features/authentication/viewmodels/use-google-sign-in-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function GoogleSignInView() {
  const viewModel = useGoogleSignInViewModel();
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Continuar con Google"
        accessibilityRole="button"
        disabled={viewModel.isSubmitting}
        onPress={() => void viewModel.submit()}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.pressed,
          viewModel.isSubmitting && styles.disabled,
        ]}>
        {viewModel.isSubmitting ? (
          <ActivityIndicator color={AppColors.neutral.text} />
        ) : (
          <Image
            accessibilityLabel="Google"
            contentFit="contain"
            source={require("@/assets/images/tabIcons/googleIcon.png")}
            style={styles.icon}
          />
        )}
      </Pressable>
      {viewModel.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {viewModel.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", gap: AppSpacing.two },
  googleButton: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 8,
    backgroundColor: AppColors.surface.default,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { width: 22, height: 22 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.56 },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
