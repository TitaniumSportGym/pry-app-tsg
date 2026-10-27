import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface GuestAccountCardProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function GuestAccountCard({ onLogin, onRegister }: GuestAccountCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <SymbolView
          name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
          size={44}
          tintColor={AppColors.brand.primary}
        />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Inicia sesión
      </Text>
      <Text style={styles.description}>
        Entra con tu correo o Google para ver tu cuenta, tus pagos y tu membresía.
      </Text>
      <View style={styles.actions}>
        <AppButton title="Iniciar sesión" onPress={onLogin} />
        <AppButton title="Crear cuenta" variant="outline" onPress={onRegister} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    alignItems: 'center',
    gap: AppSpacing.two,
    borderRadius: 24,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.four,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: AppSpacing.two,
    borderRadius: 40,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 22,
    lineHeight: 28,
  },
  description: {
    maxWidth: 320,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: AppSpacing.three },
});
