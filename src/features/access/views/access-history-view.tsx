import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/layout/page-header';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import {
  useAccessHistoryViewModel,
  type AccessHistoryItem,
  type AccessHistoryMode,
} from '@/features/access/viewmodels/use-access-history-view-model';
import { AppColors, AppFonts, AppFontSizes, AppShadows, AppSpacing } from '@/theme/tokens';

const QR_ICON = { ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' } as const;

/** Historial de entradas del cliente o de todos los socios (administrador). */
export function AccessHistoryView({ mode }: { mode: AccessHistoryMode }) {
  const viewModel = useAccessHistoryViewModel(mode);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        showsVerticalScrollIndicator={false}>
        <PageHeader
          action={{
            icon: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
            label: 'Actualizar historial',
            onPress: viewModel.refresh,
          }}
          subtitle={viewModel.subtitle}
          title={viewModel.title}
          onBack={viewModel.goBack}
        />

        {viewModel.isLoading ? (
          <LoadingState label="Cargando historial…" />
        ) : viewModel.errorMessage ? (
          <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
        ) : viewModel.isEmpty ? (
          <IllustratedEmptyState
            description={
              mode === 'admin'
                ? 'Cuando recepción escanee el código de un socio, la entrada aparecerá aquí.'
                : 'Cuando muestres tu código QR en recepción, tus entradas aparecerán aquí.'
            }
            icon={QR_ICON}
            title="AÚN NO HAY ENTRADAS"
          />
        ) : (
          <>
            {viewModel.items.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
            <Pagination
              itemLabel="entradas"
              onPageChange={viewModel.changePage}
              {...viewModel.pagination}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryRow({ item }: { item: AccessHistoryItem }) {
  return (
    <View
      accessible
      accessibilityLabel={`${item.title}. ${item.detail}`}
      style={styles.row}>
      <View style={[styles.icon, item.granted ? styles.iconGranted : styles.iconDenied]}>
        <SymbolView
          name={
            item.granted
              ? { ios: 'checkmark', android: 'check', web: 'check' }
              : { ios: 'xmark', android: 'close', web: 'close' }
          }
          size={18}
          tintColor={AppColors.neutral.white}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.detail}>
          {item.detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 680,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
    paddingBottom: 112,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGranted: { backgroundColor: AppColors.feedback.success },
  iconDenied: { backgroundColor: AppColors.feedback.error },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  detail: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
