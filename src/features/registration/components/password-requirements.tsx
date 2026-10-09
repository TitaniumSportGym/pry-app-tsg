import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { passwordRequirements } from '@/features/registration/password-policy';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <View accessibilityLabel="Requisitos de contraseña" style={styles.list}>
      {passwordRequirements.map((requirement) => {
        const isValid = requirement.validate(password);

        return (
          <View
            key={requirement.key}
            accessibilityLabel={`${requirement.label}: ${isValid ? 'cumplido' : 'pendiente'}`}
            style={styles.item}>
            <SymbolView
              name={{
                ios: isValid ? 'checkmark.circle.fill' : 'circle',
                android: isValid ? 'check_circle' : 'radio_button_unchecked',
                web: isValid ? 'check_circle' : 'radio_button_unchecked',
              }}
              size={17}
              tintColor={isValid ? AppColors.feedback.success : AppColors.neutral.placeholder}
            />
            <Text style={[styles.label, isValid && styles.validLabel]}>{requirement.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    gap: AppSpacing.two,
  },
  item: {
    minHeight: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
  },
  label: {
    flex: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  validLabel: {
    color: AppColors.feedback.success,
  },
});
