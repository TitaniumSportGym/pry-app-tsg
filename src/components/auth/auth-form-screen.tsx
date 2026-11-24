import { router, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface AuthFormScreenProps extends PropsWithChildren {
  title: string;
  description: string;
  fallbackHref: Href;
  compact?: boolean;
}

export function AuthFormScreen({
  title,
  description,
  fallbackHref,
  compact = false,
  children,
}: AuthFormScreenProps) {
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View
              style={[
                styles.hero,
                compact && styles.heroCompact,
                { height: (compact ? 164 : 210) + insets.top },
              ]}>
              <Image
                accessibilityLabel="Equipo de entrenamiento Titanium Sport Gym"
                contentFit="cover"
                contentPosition="center"
                source={require('@/assets/images/imagesTSG/auth-gym-hero.png')}
                style={styles.heroImage}
              />
              <IconButton
                icon={BACK_ICON}
                label="Volver"
                style={[styles.backButton, { top: insets.top + AppSpacing.two }]}
                onPress={handleBack}
              />
              <View style={styles.brandBadge}>
                <Image
                  accessibilityLabel="Titanium Sport Gym"
                  contentFit="contain"
                  source={require('@/assets/images/imagesTSG/LogoSolo.png')}
                  style={styles.brandLogo}
                  tintColor={AppColors.neutral.white}
                />
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.heading}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: AppSpacing.five,
    backgroundColor: AppColors.surface.default,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    flexGrow: 1,
    backgroundColor: AppColors.surface.default,
  },
  hero: {
    width: '100%',
    borderBottomWidth: 3,
    borderBottomColor: AppColors.brand.primary,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroCompact: {
    minHeight: 164,
  },
  backButton: {
    position: 'absolute',
    top: AppSpacing.two,
    left: AppSpacing.two,
  },
  brandBadge: {
    width: 70,
    height: 70,
    position: 'absolute',
    bottom: -35,
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: AppColors.neutral.white,
    borderRadius: 8,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 50,
    height: 38,
  },
  body: {
    width: '100%',
    paddingHorizontal: AppSpacing.four,
    paddingBottom: AppSpacing.five,
  },
  heading: {
    marginTop: 52,
    marginBottom: AppSpacing.four,
    gap: AppSpacing.two,
    alignItems: 'center',
  },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.title,
    lineHeight: 38,
    textAlign: 'center',
  },
  description: {
    maxWidth: 360,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 21,
    textAlign: 'center',
  },
});
