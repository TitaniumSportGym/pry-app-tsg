import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface AppSectionScreenProps {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}

export function AppSectionScreen({
  children,
  description,
  eyebrow = 'TITANIUM SPORT GYM',
  title,
}: AppSectionScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.brand.primary },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: AppColors.surface.soft,
    paddingBottom: 112,
  },
  header: {
    backgroundColor: AppColors.brand.primary,
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.four,
    paddingBottom: AppSpacing.five,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  title: {
    marginTop: AppSpacing.one,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.title,
    lineHeight: 38,
  },
  description: {
    maxWidth: 480,
    marginTop: AppSpacing.one,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 21,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    flex: 1,
    alignSelf: 'center',
    padding: AppSpacing.four,
  },
});
