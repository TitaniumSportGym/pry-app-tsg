import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CurrentPlan } from '@/features/memberships/viewmodels/use-my-subscription';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface MembershipCardProps {
  isAuthenticated: boolean;
  /** Plan vigente del socio; null si no tiene membresía activa (o aún carga). */
  plan: CurrentPlan | null;
  onOpenMemberships: () => void;
  onOpenAccess: () => void;
  onLogin: () => void;
}

/**
 * Plan vigente del socio con su vigencia y días restantes; sin membresía invita a
 * elegir un plan. Los socios abren su QR desde aquí ("Inicio → Mi acceso").
 */
export function MembershipCard({
  isAuthenticated,
  plan,
  onOpenMemberships,
  onOpenAccess,
  onLogin,
}: MembershipCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.decoration} />
      <Text style={styles.label}>{plan ? 'TU MEMBRESÍA ACTIVA' : 'TU MEMBRESÍA'}</Text>
      <Text numberOfLines={1} style={styles.title}>
        {plan ? plan.name.toUpperCase() : 'TITANIUM'}
      </Text>
      <Text style={styles.description}>
        {plan
          ? plan.validity
          : isAuthenticated
            ? 'Aún no tienes una membresía activa. Consulta los planes y elige el tuyo.'
            : 'Conoce los planes y crea tu cuenta para empezar a entrenar.'}
      </Text>

      <View style={styles.actions}>
        {isAuthenticated ? (
          <Pressable
            accessibilityLabel="Mi acceso"
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
            onPress={onOpenAccess}>
            <SymbolView
              name={{ ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' }}
              size={18}
              tintColor={AppColors.neutral.text}
            />
            <Text style={styles.secondaryText}>MI ACCESO</Text>
          </Pressable>
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
          <Text style={styles.primaryText}>{plan ? 'RENOVAR' : 'VER PLANES'}</Text>
        </Pressable>
      </View>
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
  pressed: { opacity: 0.8 },
});
