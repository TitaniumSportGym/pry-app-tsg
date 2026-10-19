import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, AppSpacing } from '@/theme/tokens';

interface BackScreenProps {
  children: ReactNode;
  background?: string;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

/** Screen with a back button and pull to refresh; the back button never depends on the API. */
export function BackScreen({
  children,
  background = AppColors.surface.default,
  refreshing,
  onBack,
  onRefresh,
}: BackScreenProps) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: background }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={refreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Regresar"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={onBack}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={AppColors.neutral.text}
          />
        </Pressable>
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
    flexGrow: 1,
    alignSelf: 'center',
    paddingHorizontal: AppSpacing.four,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
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
  body: { flex: 1, gap: AppSpacing.four, marginTop: AppSpacing.three },
  pressed: { opacity: 0.7 },
});
