import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppColors } from '@/theme/tokens';

export const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
};

interface IconButtonProps {
  icon: SymbolViewProps['name'];
  /** Read by screen readers; the button has no visible text. */
  label: string;
  /** Without onPress the button is shown as unavailable ("próximamente"). */
  onPress?: () => void;
  color?: string;
  /** Highlights the icon in the brand color, e.g. while a filter is active. */
  selected?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button used in headers; keeps a 44 pt touch target without any frame. */
export function IconButton({
  icon,
  label,
  onPress,
  color = AppColors.neutral.text,
  selected = false,
  size = 22,
  style,
}: IconButtonProps) {
  const disabled = !onPress;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      onPress={onPress}>
      <SymbolView
        name={icon}
        size={size}
        tintColor={
          disabled ? AppColors.neutral.placeholder : selected ? AppColors.brand.primary : color
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
