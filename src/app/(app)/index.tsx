import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/auth/logout-button';
import { BottomTabInset } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView
      edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View>
          <Text style={styles.title}>Inicio</Text>
          <Text style={styles.brand}>TITANIUM SPORT GYM</Text>
          <Text style={styles.description}>Tu espacio de entrenamiento.</Text>
        </View>

        <View style={styles.sessionArea}>
          <Text style={styles.sessionLabel}>Sesión iniciada como</Text>
          <Text numberOfLines={1} style={styles.email}>
            {user?.email ?? 'Usuario'}
          </Text>
          <LogoutButton />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.surface.soft,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.five,
    paddingBottom: Platform.select({
      ios: BottomTabInset + AppSpacing.five,
      default: AppSpacing.five,
    }),
  },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.sectionTitle,
    lineHeight: 34,
  },
  brand: {
    marginTop: AppSpacing.five,
    color: AppColors.brand.primary,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.title,
    lineHeight: 38,
  },
  description: {
    marginTop: AppSpacing.one,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 24,
  },
  sessionArea: {
    width: '100%',
    gap: AppSpacing.two,
  },
  sessionLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
  },
  email: {
    marginBottom: AppSpacing.two,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
});
