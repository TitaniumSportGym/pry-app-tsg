import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { passwordRequirements } from "@/features/authentication/models/password-policy";
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from "@/theme/tokens";

interface PasswordRequirementsViewProps {
  password: string;
}

export function PasswordRequirementsView({
  password,
}: PasswordRequirementsViewProps) {
  return (
    <View accessibilityLabel="Requisitos de contraseña" style={styles.list}>
      {requirementRows.map(({ requirement, fulfilled, pending }) =>
        requirement.validate(password) ? fulfilled : pending,
      )}
    </View>
  );
}

function createRequirementRow(
  requirement: (typeof passwordRequirements)[number],
  isValid: boolean,
) {
  return (
    <View
      key={requirement.key}
      accessibilityLabel={`${requirement.label}: ${isValid ? "cumplido" : "pendiente"}`}
      style={styles.item}
    >
      <SymbolView
        name={{
          ios: isValid ? "checkmark.circle.fill" : "circle",
          android: isValid ? "check_circle" : "radio_button_unchecked",
          web: isValid ? "check_circle" : "radio_button_unchecked",
        }}
        size={17}
        tintColor={isValid ? AppColors.feedback.success : AppColors.neutral.placeholder}
      />
      <Text style={[styles.label, isValid && styles.validLabel]}>
        {requirement.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: "100%", gap: AppSpacing.two },
  item: {
    minHeight: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: AppSpacing.two,
  },
  label: {
    flex: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  validLabel: { color: AppColors.feedback.success },
});

// Each requirement has two immutable presentations. Reuse them while typing;
// only validation depends on the password, which is never kept in this cache.
const requirementRows = passwordRequirements.map((requirement) => ({
  requirement,
  fulfilled: createRequirementRow(requirement, true),
  pending: createRequirementRow(requirement, false),
}));
