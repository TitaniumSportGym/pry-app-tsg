import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface IllustratedEmptyStateProps {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onRefresh?: () => void;
}

/** Full-screen empty state: large icon, display title and an optional call to action. */
export function IllustratedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  onRefresh,
}: IllustratedEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <SymbolView name={icon} size={44} tintColor={AppColors.brand.primary} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} /> : null}
      {onRefresh ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
          onPress={onRefresh}>
          <SymbolView
            name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
            size={16}
            tintColor={AppColors.neutral.muted}
          />
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: AppSpacing.three,
    paddingVertical: AppSpacing.five,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.sectionTitle,
    letterSpacing: 0.5,
    lineHeight: 30,
    textAlign: 'center',
  },
  description: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  refresh: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  refreshText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  pressed: { opacity: 0.7 },
});
