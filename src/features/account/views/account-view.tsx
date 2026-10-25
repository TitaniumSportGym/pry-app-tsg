import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuRow, MenuSection } from '@/components/ui/menu-list';
import { useAccountViewModel } from '@/features/account/viewmodels/use-account-view-model';
import { AccountProfileCard } from '@/features/account/views/account-profile-card';
import { GuestAccountCard } from '@/features/account/views/guest-account-card';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

/** "Más" screen: account menu for every role, or the sign-in card for guests. */
export function AccountView() {
  const viewModel = useAccountViewModel();
  const { profile, shortcut } = viewModel;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            MÁS
          </Text>
          {viewModel.isClient ? (
            <View
              accessible
              accessibilityLabel="Mi acceso con código QR, próximamente"
              accessibilityState={{ disabled: true }}
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' }}
                size={20}
                tintColor={AppColors.neutral.placeholder}
              />
            </View>
          ) : null}
        </View>

        {viewModel.isAuthenticated && profile && shortcut ? (
          <>
            <AccountProfileCard
              profile={profile}
              shortcut={shortcut}
              onOpenShortcut={() => viewModel.open(shortcut.route)}
            />

            {viewModel.sections.map((section) => (
              <MenuSection key={section.title} title={section.title}>
                {section.items.map((item) => {
                  const route = item.route;

                  return (
                    <MenuRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      onPress={route ? () => viewModel.open(route) : undefined}
                    />
                  );
                })}
              </MenuSection>
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: viewModel.isSigningOut }}
              disabled={viewModel.isSigningOut}
              style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
              onPress={viewModel.confirmLogout}>
              {viewModel.isSigningOut ? (
                <ActivityIndicator color={AppColors.brand.primary} />
              ) : (
                <>
                  <SymbolView
                    name={{
                      ios: 'rectangle.portrait.and.arrow.right',
                      android: 'logout',
                      web: 'logout',
                    }}
                    size={18}
                    tintColor={AppColors.brand.primary}
                  />
                  <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <GuestAccountCard onLogin={viewModel.openLogin} onRegister={viewModel.openRegister} />
        )}

        {viewModel.appVersion ? (
          <Text style={styles.footer}>Titanium Sport Gym · Versión {viewModel.appVersion}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: AppSpacing.four,
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 14,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: AppColors.surface.softSelected,
    borderRadius: 16,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
  },
  logoutText: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
  },
  footer: {
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.body,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  pressed: { opacity: 0.75 },
});
