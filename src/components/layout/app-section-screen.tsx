import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

interface AppSectionScreenProps {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
}

/**
 * Pantalla de sección del sistema: fondo blanco, flecha de regreso sin marco, overline gris,
 * título en Bebas y descripción. El contenido se acomoda en una columna con márgenes de 20.
 */
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
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[AppColors.brand.primary]}
              refreshing={refreshing}
              tintColor={AppColors.brand.primary}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {onBack ? <IconButton icon={BACK_ICON} label="Regresar" style={styles.back} onPress={onBack} /> : null}
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  scrollContent: { width: '100%', maxWidth: 680, flexGrow: 1, alignSelf: 'center', paddingBottom: 124 },
  header: { gap: 2, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { marginLeft: -10, marginBottom: 6 },
  eyebrow: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: 11, letterSpacing: 0.8, lineHeight: 14 },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  description: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  content: { flex: 1, gap: 16, paddingHorizontal: 20, paddingTop: 12 },
});
