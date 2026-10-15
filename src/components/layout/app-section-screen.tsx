import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface AppSectionScreenProps {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
}

export function AppSectionScreen({
  children,
  description,
  eyebrow = 'TITANIUM SPORT GYM',
  title,
  refreshing = false,
  onRefresh,
  onBack,
}: AppSectionScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[AppColors.brand.primary]}
              refreshing={refreshing}
              tintColor={AppColors.neutral.white}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Regresar"
              accessibilityRole="button"
              hitSlop={12}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              onPress={onBack}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                size={22}
                tintColor={AppColors.neutral.white}
              />
            </Pressable>
          ) : null}
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
  backButton: {
    width: 40,
    height: 40,
    marginBottom: AppSpacing.two,
    marginLeft: -AppSpacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
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
    gap: AppSpacing.three,
    padding: AppSpacing.four,
  },
});
