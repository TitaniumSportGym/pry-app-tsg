import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  isLast?: boolean;
}

export function AccordionItem({ title, children, isLast = false }: AccordionItemProps) {
  // Open or closed is purely visual state, so it lives in the component.
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.item, !isLast && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={4}
        style={styles.header}
        onPress={() => setExpanded((current) => !current)}
      >
        <Text style={styles.title}>{title}</Text>
        <SymbolView
          name={
            expanded
              ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
              : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
          }
          size={18}
          tintColor={AppColors.neutral.muted}
        />
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: AppSpacing.one },
  divider: { borderBottomWidth: 1, borderBottomColor: AppColors.border.soft },
  header: {
    minHeight: 48,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.three,
  },
  title: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  content: { gap: AppSpacing.two, paddingBottom: AppSpacing.three },
});
