import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { LogoutButton } from '@/components/ui/logout-button';
import type { AdminMenuItem } from '@/features/admin/models/admin-more-menu';
import { useAdminMoreViewModel } from '@/features/admin/viewmodels/use-admin-more-view-model';
import {
  ADMIN_BOTTOM_SPACE,
  AdminAvatar,
  AdminCard,
  AdminHeader,
  CHEVRON,
  IconTile,
} from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Pantalla 50 · Admin — Más. */
export function AdminMoreView() {
  const viewModel = useAdminMoreViewModel();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AdminHeader subtitle="Administración de Titanium" title="MÁS" />

        <AdminCard style={styles.profile}>
          <AdminAvatar initials={viewModel.profile.initials} size={52} />
          <View style={styles.flexCopy}>
            <Text numberOfLines={1} style={styles.profileName}>
              {viewModel.profile.name}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {viewModel.profile.roleLabel}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {viewModel.profile.email}
            </Text>
          </View>
        </AdminCard>

        {viewModel.sections.map((section) => (
          <View key={section.title} style={styles.group}>
            <Text accessibilityRole="header" style={styles.overline}>
              {section.title}
            </Text>
            <AdminCard style={styles.groupCard}>
              {section.items.map((item, index) => (
                <Fragment key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <MenuOption item={item} onOpen={viewModel.open} />
                </Fragment>
              ))}
            </AdminCard>
          </View>
        ))}

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.overline}>
            CUENTA
          </Text>
          <AdminCard style={styles.groupCard}>
            <MenuOption
              item={{
                id: 'settings',
                label: 'Configuración',
                icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
              }}
              onOpen={viewModel.open}
            />
          </AdminCard>
        </View>

        <LogoutButton isSigningOut={viewModel.isSigningOut} onPress={viewModel.confirmLogout} />

        {viewModel.appVersion ? (
          <Text style={styles.footer}>Titanium Sport Gym · Versión {viewModel.appVersion}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuOption({ item, onOpen }: { item: AdminMenuItem; onOpen: (route: NonNullable<AdminMenuItem['route']>) => void }) {
  const route = item.route;

  return (
    <Pressable
      accessibilityLabel={route ? item.label : `${item.label}, próximamente`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !route }}
      disabled={!route}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={route ? () => onOpen(route) : undefined}>
      <IconTile background={AppColors.surface.soft} icon={item.icon} size={38} />
      <Text numberOfLines={1} style={[styles.label, !route && styles.labelMuted]}>
        {item.label}
      </Text>
      {item.meta ? <Text style={styles.caption}>{item.meta}</Text> : null}
      {route ? (
        <SymbolView name={CHEVRON} size={16} tintColor={AppColors.neutral.muted} />
      ) : (
        <ComingSoonBadge />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: ADMIN_BOTTOM_SPACE },
  profile: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 16 },
  flexCopy: { minWidth: 0, flex: 1, gap: 2 },
  profileName: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  group: { gap: 8 },
  overline: {
    paddingLeft: 4,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  groupCard: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  row: { minHeight: 62, alignItems: 'center', flexDirection: 'row', gap: 14, paddingVertical: 12 },
  label: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: 15,
    lineHeight: 22,
  },
  labelMuted: { color: AppColors.neutral.muted },
  footer: {
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.body,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
