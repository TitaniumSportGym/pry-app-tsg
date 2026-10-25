import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import type { HomeAction, HomeActionId } from '@/features/home/models/home-actions';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

interface QuickActionsProps {
  actions: readonly HomeAction[];
  onPress: (actionId: HomeActionId) => void;
}

export function QuickActions({ actions, onPress }: QuickActionsProps) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityLabel={action.available ? action.label : `${action.label}, próximamente`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !action.available }}
          disabled={!action.available}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          onPress={() => onPress(action.id)}>
          <View style={[styles.icon, !action.available && styles.iconDisabled]}>
            <SymbolView
              name={action.icon}
              size={20}
              tintColor={action.available ? AppColors.brand.primary : AppColors.neutral.placeholder}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.label, !action.available && styles.labelDisabled]}>
            {action.label}
          </Text>
          {action.available ? null : <ComingSoonBadge label="PRONTO" />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: AppSpacing.two },
  tile: {
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    minHeight: 96,
    flex: 1,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: AppSpacing.one,
    paddingVertical: AppSpacing.three,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDisabled: { backgroundColor: AppColors.surface.muted },
  label: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: 12,
    lineHeight: 16,
  },
  labelDisabled: { color: AppColors.neutral.placeholder },
  pressed: { opacity: 0.7 },
});
