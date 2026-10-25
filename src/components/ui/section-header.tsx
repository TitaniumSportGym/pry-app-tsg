import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  /** Without onAction the action is shown as "Próximamente". */
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {actionLabel ? (
        onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={onAction}>
            <Text style={styles.actionText}>{actionLabel}</Text>
            <View style={styles.arrow}>
              <SymbolView
                name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                size={14}
                tintColor={AppColors.neutral.white}
              />
            </View>
          </Pressable>
        ) : (
          <View style={styles.action}>
            <Text style={[styles.actionText, styles.disabledText]}>{actionLabel}</Text>
            <ComingSoonBadge />
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  action: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.two },
  actionText: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  disabledText: { color: AppColors.neutral.placeholder },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
