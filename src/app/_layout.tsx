import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { AppSplashScreen } from '@/components/splash/app-splash-screen';
import { useAuth } from '@/hooks/use-auth';
import { AuthProvider } from '@/providers/auth-provider';
import { AppFonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    [AppFonts.display]: BebasNeue_400Regular,
    [AppFonts.body]: Manrope_400Regular,
    [AppFonts.label]: Manrope_600SemiBold,
    [AppFonts.button]: Manrope_700Bold,
    [AppFonts.emphasis]: Manrope_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const sessionReady = status !== 'loading';

  return (
    <View style={styles.app}>
      {sessionReady ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={status === 'authenticated'}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={status === 'unauthenticated'}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      ) : null}
      <AppSplashScreen isReady={sessionReady} />
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});
