import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface HomeHeaderProps {
  eyebrow: string;
  greeting: string;
  initials: string | null;
}

export function HomeHeader({ eyebrow, greeting, initials }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {initials ? (
          <Text style={styles.initials}>{initials}</Text>
        ) : (
          <SymbolView
            name={{ ios: 'person.fill', android: 'person', web: 'person' }}
            size={20}
            tintColor={AppColors.brand.primary}
          />
        )}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.greeting}>
          {greeting}
        </Text>
      </View>
      <IconButton
        icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
        label="Notificaciones, próximamente"
        style={styles.bell}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
  },
  copy: { minWidth: 0, flex: 1 },
  eyebrow: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  greeting: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  bell: {
    marginRight: -10,
  },
});
