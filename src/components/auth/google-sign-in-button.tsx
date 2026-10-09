import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { GoogleAuthError } from '@/features/google-auth/google-auth-callback';
import { useAuth } from '@/hooks/use-auth';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(
        authError instanceof GoogleAuthError
          ? authError.message
          : 'No fue posible iniciar sesión con Google. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppButton
        leftIcon={
          <Image
            accessibilityLabel="Google"
            contentFit="contain"
            source={require('@/assets/images/tabIcons/googleIcon.png')}
            style={styles.icon}
          />
        }
        loading={isSubmitting}
        title="Google"
        variant="outline"
        onPress={() => void handlePress()}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: AppSpacing.two,
  },
  icon: {
    width: 18,
    height: 18,
  },
  error: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
