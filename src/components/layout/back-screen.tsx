import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
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
        <IconButton icon={BACK_ICON} label="Regresar" style={styles.back} onPress={onBack} />
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
  back: { marginLeft: -10 },
  body: { flex: 1, gap: AppSpacing.four, marginTop: AppSpacing.three },
});
