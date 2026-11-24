import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/**
 * Entrenador — Clientes. El backend todavía no asigna socios a los entrenadores, así que la
 * pestaña muestra "Próximamente" en lugar de una lista que siempre estaría vacía.
 */
export function TrainerClientsView() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            CLIENTES
          </Text>
          <Text style={styles.subtitle}>Socios que entrenan contigo</Text>
        </View>
        <IllustratedEmptyState
          description="Pronto podrás ver aquí a los socios que entrenan contigo, asignarles tus rutinas y seguir su avance."
          icon={{ ios: 'person.2', android: 'group', web: 'group' }}
          title="PRÓXIMAMENTE"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 124 },
  header: { gap: 2 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  subtitle: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
});
