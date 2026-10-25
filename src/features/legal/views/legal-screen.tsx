import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
          <Pressable
            accessibilityLabel="Regresar"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={onBack}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={20}
              tintColor={AppColors.neutral.text}
            />
          </Pressable>
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
  header: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 14,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  pressed: { opacity: 0.7 },
});
