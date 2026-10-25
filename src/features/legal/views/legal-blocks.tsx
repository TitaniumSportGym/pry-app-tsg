import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LegalBlock } from '@/features/legal/models/legal-content';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface LegalBlocksProps {
  blocks: readonly LegalBlock[];
  onOpenPrivacy?: () => void;
}

/** Renders legal text as plain text: nothing from it is ever interpreted as markup. */
export function LegalBlocks({ blocks, onOpenPrivacy }: LegalBlocksProps) {
  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <Text key={index} style={styles.paragraph}>
              {block.text}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item) => (
                <View key={item} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={[styles.paragraph, styles.listText]}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }

        return onOpenPrivacy ? (
          <Pressable key={index} accessibilityRole="link" hitSlop={8} onPress={onOpenPrivacy}>
            <Text style={styles.link}>{block.text}</Text>
          </Pressable>
        ) : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: AppSpacing.two },
  paragraph: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  list: { gap: AppSpacing.one },
  listItem: { flexDirection: 'row', gap: AppSpacing.two },
  bullet: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  listText: { flex: 1 },
  link: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
});
