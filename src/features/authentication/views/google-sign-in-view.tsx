import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { useGoogleSignInViewModel } from "@/features/authentication/viewmodels/use-google-sign-in-view-model";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

export function GoogleSignInView() {
  const viewModel = useGoogleSignInViewModel();
  return (
    <View style={styles.container}>
      <AppButton
        leftIcon={
          <Image
            accessibilityLabel="Google"
            contentFit="contain"
            source={require("@/assets/images/tabIcons/googleIcon.png")}
            style={styles.icon}
          />
        }
        loading={viewModel.isSubmitting}
        title="Google"
        variant="outline"
        onPress={() => void viewModel.submit()}
      />
      {viewModel.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {viewModel.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: AppSpacing.two },
  icon: { width: 18, height: 18 },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: "center",
  },
});
