import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface LegalScreenProps {
  title: string;
  caption?: string;
  background: string;
  children: ReactNode;
  onBack: () => void;
}

/** Header with the back button shared by the terms and privacy screens. */
export function LegalScreen({
  title,
  caption,
  background,
  children,
  onBack,
}: LegalScreenProps) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: background }]}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton icon={BACK_ICON} label="Regresar" style={styles.back} onPress={onBack} />
          <View style={styles.titleBlock}>
            <Text
              accessibilityRole="header"
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          </View>
        </View>


        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: AppSpacing.four,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  back: { marginLeft: -10 },
  titleBlock: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.title,
    lineHeight: 34,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  body: { gap: 22 },
});
