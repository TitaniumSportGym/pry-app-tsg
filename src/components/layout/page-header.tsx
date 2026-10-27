import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

interface PageHeaderAction {
  icon: SymbolViewProps['name'];
  label: string;
  selected?: boolean;
  onPress: () => void;
}

interface PageHeaderProps {
  title: string;
  /** A text, or a skeleton while the data that feeds it loads. */
  subtitle: ReactNode;
  action?: PageHeaderAction;
  onBack: () => void;
}

/** Back button, display title with a caption and an optional icon action. */
export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton icon={BACK_ICON} label="Regresar" style={styles.back} onPress={onBack} />
      <View style={styles.copy}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {typeof subtitle === 'string' ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {action ? <IconButton {...action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  // Lines the icon up with the content edge while keeping the full touch target.
  back: { marginLeft: -10 },
  copy: { flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  subtitle: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
