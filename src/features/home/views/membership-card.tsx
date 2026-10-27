import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface MembershipCardProps {
  isAuthenticated: boolean;
  onOpenMemberships: () => void;
  onLogin: () => void;
}

/**
 * The backend does not expose the member's active membership yet, so the card
 * invites to choose a plan instead of showing made-up dates.
 */
export function MembershipCard({ isAuthenticated, onOpenMemberships, onLogin }: MembershipCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.decoration} />
      <Text style={styles.label}>TU MEMBRESÍA</Text>
      <Text style={styles.title}>TITANIUM</Text>
      <Text style={styles.description}>
        {isAuthenticated
          ? 'Consulta los planes y elige el que se adapte a tus objetivos.'
          : 'Conoce los planes y crea tu cuenta para empezar a entrenar.'}
      </Text>

      <View style={styles.actions}>
        {isAuthenticated ? (
          <View
            accessible
            accessibilityLabel="Mi acceso, próximamente"
            accessibilityState={{ disabled: true }}
            style={[styles.button, styles.secondaryButton, styles.disabled]}>
            <SymbolView
              name={{ ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' }}
              size={18}
              tintColor={AppColors.neutral.text}
            />
            <Text style={styles.secondaryText}>MI ACCESO</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
            onPress={onLogin}>
            <Text style={styles.secondaryText}>INICIAR SESIÓN</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}
          onPress={onOpenMemberships}>
          <Text style={styles.primaryText}>VER PLANES</Text>
        </Pressable>
      </View>
      {isAuthenticated ? (
        <View style={styles.footnote}>
          <ComingSoonBadge />
          <Text style={styles.footnoteText}>Pronto verás aquí tu plan y días restantes.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    gap: AppSpacing.one,
    borderRadius: 24,
    backgroundColor: AppColors.neutral.black,
    padding: AppSpacing.four,
  },
  decoration: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: AppColors.surface.darkElevated,
  },
  label: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 15,
  },
  title: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: 38,
    lineHeight: 42,
  },
  description: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: AppSpacing.three, marginTop: AppSpacing.three },
  button: {
    minHeight: 48,
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
  },
  secondaryButton: { backgroundColor: AppColors.surface.default },
  primaryButton: { backgroundColor: AppColors.brand.primary },
  secondaryText: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
  },
  primaryText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
  },
  disabled: { opacity: 0.55 },
  footnote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    marginTop: AppSpacing.two,
  },
  footnoteText: {
    flex: 1,
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: { opacity: 0.8 },
});
