import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface MenuSectionProps {
  title: string;
  children: ReactNode;
}

export function MenuSection({ title, children }: MenuSectionProps) {
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

interface MenuRowProps {
  icon: SymbolViewProps['name'];
  label: string;
  /** Without onPress the row is disabled and marked as "Próximamente". */
  onPress?: () => void;
}

export function MenuRow({ icon, label, onPress }: MenuRowProps) {
  const available = onPress !== undefined;

  return (
    <Pressable
      accessibilityLabel={available ? label : `${label}, próximamente`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !available }}
      disabled={!available}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.icon}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={available ? AppColors.brand.primary : AppColors.neutral.placeholder}
        />
      </View>
      <Text numberOfLines={1} style={[styles.label, !available && styles.labelDisabled]}>
        {label}
      </Text>
      {available ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={AppColors.neutral.placeholder}
        />
      ) : (
        <ComingSoonBadge />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppSpacing.two },
  sectionTitle: {
    marginLeft: AppSpacing.one,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.button,
    fontSize: 11,
    lineHeight: 15,
  },
  card: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
  },
  divider: {
    height: 1,
    marginLeft: 60,
    backgroundColor: AppColors.border.soft,
  },
  row: {
    minHeight: 56,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.three,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: AppColors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  labelDisabled: { color: AppColors.neutral.muted },
  pressed: { backgroundColor: AppColors.surface.soft },
});
