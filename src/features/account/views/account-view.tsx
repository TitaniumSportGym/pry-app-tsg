import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { InfoListCard } from '@/components/ui/info-list-card';
import { useAccountViewModel } from '@/features/account/viewmodels/use-account-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function AccountView() {
  const viewModel = useAccountViewModel();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TITANIUM SPORT GYM</Text>
          <Text style={styles.title}>MI CUENTA</Text>
          <Text style={styles.headerDescription}>
            {viewModel.isAuthenticated
              ? 'Consulta y administra tu sesión.'
              : 'Inicia sesión para acceder a tu perfil.'}
          </Text>
        </View>

        <View style={styles.content}>
          {viewModel.isAuthenticated ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <SymbolView
                    name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                    size={30}
                    tintColor={AppColors.neutral.white}
                  />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={styles.profileLabel}>Sesión iniciada como</Text>
                  <Text numberOfLines={2} style={styles.email}>{viewModel.email}</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <SymbolView
                  name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
                  size={22}
                  tintColor={AppColors.feedback.success}
                />
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>Sesión segura</Text>
                  <Text style={styles.statusDescription}>
                    Tu cuenta está disponible en este dispositivo.
                  </Text>
                </View>
              </View>

              {viewModel.showMembershipsLink ? (
                <Pressable
                  accessibilityLabel="Membresías"
                  accessibilityRole="link"
                  style={({ pressed }) => pressed && styles.pressed}
                  onPress={viewModel.openMemberships}>
                  <InfoListCard
                    icon={{ ios: 'creditcard.fill', android: 'card_membership', web: 'card_membership' }}
                    title="Membresías"
                    description="Consulta los planes del gimnasio para orientar a tus clientes."
                  />
                </Pressable>
              ) : null}

              <AppButton
                leftIcon={
                  <SymbolView
                    name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
                    size={19}
                    tintColor={AppColors.neutral.text}
                  />
                }
                loading={viewModel.isSigningOut}
                title="Cerrar sesión"
                variant="outline"
                onPress={() => void viewModel.logout()}
              />
            </>
          ) : (
            <View style={styles.guestContent}>
              <View style={styles.guestIcon}>
                <SymbolView
                  name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
                  size={48}
                  tintColor={AppColors.brand.primary}
                />
              </View>
              <Text style={styles.guestTitle}>Aún no has iniciado sesión</Text>
              <Text style={styles.guestDescription}>
                Entra con tu correo o Google para acceder a tu cuenta Titanium.
              </Text>
              <View style={styles.actions}>
                <AppButton title="Iniciar sesión" onPress={viewModel.openLogin} />
                <AppButton title="Crear cuenta" variant="outline" onPress={viewModel.openRegister} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.brand.primary },
  scrollContent: { flexGrow: 1, backgroundColor: AppColors.surface.soft, paddingBottom: 112 },
  header: { backgroundColor: AppColors.brand.primary, paddingHorizontal: AppSpacing.four, paddingTop: AppSpacing.four, paddingBottom: AppSpacing.five },
  eyebrow: { color: 'rgba(255,255,255,0.78)', fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, lineHeight: 17 },
  title: { marginTop: AppSpacing.one, color: AppColors.neutral.white, fontFamily: AppFonts.display, fontSize: AppFontSizes.title, lineHeight: 38 },
  headerDescription: { marginTop: AppSpacing.one, color: AppColors.neutral.white, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 21 },
  content: { width: '100%', maxWidth: 560, flex: 1, alignSelf: 'center', gap: AppSpacing.four, padding: AppSpacing.four },
  profileCard: { minHeight: 108, borderRadius: 8, backgroundColor: AppColors.neutral.black, alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three, padding: AppSpacing.three },
  avatar: { width: 54, height: 54, borderRadius: 8, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { minWidth: 0, flex: 1 },
  profileLabel: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 17 },
  email: { marginTop: AppSpacing.one, color: AppColors.neutral.white, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.label, lineHeight: 21 },
  statusRow: { minHeight: 76, borderWidth: 1, borderColor: AppColors.border.default, borderRadius: 8, backgroundColor: AppColors.surface.default, alignItems: 'center', flexDirection: 'row', gap: 12, padding: AppSpacing.three },
  statusCopy: { minWidth: 0, flex: 1 },
  statusTitle: { color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.label, lineHeight: 20 },
  statusDescription: { marginTop: AppSpacing.one, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 18 },
  guestContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: AppSpacing.five },
  guestIcon: { width: 84, height: 84, borderRadius: 8, backgroundColor: AppColors.surface.softSelected, alignItems: 'center', justifyContent: 'center' },
  guestTitle: { marginTop: AppSpacing.four, color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  guestDescription: { maxWidth: 340, marginTop: AppSpacing.two, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 22, textAlign: 'center' },
  actions: { width: '100%', marginTop: AppSpacing.four, gap: 10 },
  pressed: { opacity: 0.7 },
});
