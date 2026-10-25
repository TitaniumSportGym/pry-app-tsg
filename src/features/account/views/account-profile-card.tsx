import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface AccountProfileCardProps {
  profile: {
    title: string;
    email: string;
    initials: string | null;
    roleLabel: string;
  };
  shortcut: { title: string; description: string };
  onOpenShortcut: () => void;
}

export function AccountProfileCard({ profile, shortcut, onOpenShortcut }: AccountProfileCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {profile.initials ? (
            <Text style={styles.initials}>{profile.initials}</Text>
          ) : (
            <SymbolView
              name={{ ios: 'person.fill', android: 'person', web: 'person' }}
              size={24}
              tintColor={AppColors.brand.primary}
            />
          )}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {profile.title}
          </Text>
          <Text numberOfLines={1} style={styles.email}>
            {profile.email}
          </Text>
        </View>
        <Text style={styles.role}>{profile.roleLabel}</Text>
      </View>

      <Pressable
        accessibilityHint={shortcut.description}
        accessibilityLabel={shortcut.title}
        accessibilityRole="button"
        style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
        onPress={onOpenShortcut}>
        <View style={styles.shortcutIcon}>
          <SymbolView
            name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }}
            size={18}
            tintColor={AppColors.neutral.white}
          />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.shortcutTitle}>
            {shortcut.title}
          </Text>
          <Text numberOfLines={1} style={styles.shortcutDescription}>
            {shortcut.description}
          </Text>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={AppColors.neutral.mutedOnDark}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    gap: AppSpacing.three,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.body,
  },
  copy: { minWidth: 0, flex: 1 },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  email: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  role: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: AppColors.surface.softSelected,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  shortcut: {
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: AppColors.neutral.black,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.three,
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  shortcutDescription: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: { opacity: 0.8 },
});
