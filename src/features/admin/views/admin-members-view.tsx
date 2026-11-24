import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { memo, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState } from '@/components/ui/screen-state';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { useAdminMembersViewModel } from '@/features/admin/viewmodels/use-admin-members-view-model';
import { ADMIN_BOTTOM_SPACE, AdminAvatar, AdminHeader, StatusPill } from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

type MemberItem = ReturnType<typeof useAdminMembersViewModel>['members'][number];

const DOT_COLORS = {
  success: AppColors.feedback.success,
  brand: AppColors.brand.primary,
  error: AppColors.feedback.error,
} as const;

/** Pantalla 49 · Admin — Socios. */
export function AdminMembersView() {
  const viewModel = useAdminMembersViewModel();
  const ready = !viewModel.isLoading && !viewModel.errorMessage;
  const { pagination } = viewModel;
  const listRef = useRef<FlatList<MemberItem>>(null);

  function changePage(page: number) {
    pagination.setPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const header = (
    <View style={styles.headerBlock}>
      <AdminHeader
        action={
          <View
            accessibilityLabel="Agregar socio, próximamente"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessible
            style={styles.addButton}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={20}
              tintColor={AppColors.neutral.white}
            />
          </View>
        }
        subtitle={viewModel.subtitle}
        title="SOCIOS"
      />
      <SearchField
        maxLength={viewModel.searchMaxLength}
        placeholder="Número de socio o correo"
        value={viewModel.query}
        variant="outlined"
        onChangeText={viewModel.setQuery}
      />
      {ready ? (
        <View style={styles.summary}>
          {viewModel.summary.map((item) => (
            <View
              key={item.id}
              accessible
              accessibilityLabel={`${item.value} ${item.label}`}
              style={[styles.summaryCard, item.highlighted && styles.summaryCardDark]}>
              <Text style={[styles.summaryValue, item.highlighted && styles.textWhite]}>
                {item.value.toLocaleString('en-US')}
              </Text>
              <View style={styles.summaryLabelRow}>
                <View style={[styles.dot, { backgroundColor: DOT_COLORS[item.dot] }]} />
                <Text
                  numberOfLines={1}
                  style={[styles.summaryLabel, item.highlighted && styles.textOnDark]}>
                  {item.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        contentContainerStyle={styles.content}
        data={ready ? viewModel.members : []}
        initialNumToRender={12}
        keyExtractor={(member) => member.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          viewModel.showSkeleton ? (
            <MembersSkeleton />
          ) : viewModel.errorMessage ? (
            <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} />
          ) : viewModel.isLoading ? undefined : (
            <EmptyState
              description={
                viewModel.isSearchEmpty
                  ? 'Ningún socio coincide con tu búsqueda.'
                  : 'Aún no hay socios registrados.'
              }
              icon={{ ios: 'person.2', android: 'group', web: 'group' }}
              title={viewModel.isSearchEmpty ? 'SIN RESULTADOS' : 'SIN SOCIOS'}
            />
          )
        }
        ListFooterComponent={
          ready ? (
            <Pagination
              itemLabel="socios"
              page={pagination.page}
              pageCount={pagination.pageCount}
              rangeEnd={pagination.rangeEnd}
              rangeStart={pagination.rangeStart}
              totalItems={pagination.totalItems}
              onPageChange={changePage}
            />
          ) : undefined
        }
        ListHeaderComponent={header}
        ref={listRef}
        refreshControl={
          <RefreshControl
            colors={[AppColors.brand.primary]}
            refreshing={viewModel.isRefreshing}
            tintColor={AppColors.brand.primary}
            onRefresh={viewModel.refresh}
          />
        }
        renderItem={({ item }) => <MemberRow member={item} />}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const MemberRow = memo(function MemberRow({ member }: { member: MemberItem }) {
  return (
    <View
      accessible
      accessibilityLabel={`${member.name}, ${member.email}, ${member.verified ? 'verificado' : 'sin verificar'}`}
      style={styles.memberCard}>
      <AdminAvatar initials={member.initials} />
      <View style={styles.memberCopy}>
        <Text numberOfLines={1} style={styles.memberName}>
          {member.name}
        </Text>
        <Text numberOfLines={1} style={styles.caption}>
          {member.email}
        </Text>
        <Text numberOfLines={1} style={styles.joined}>
          {member.joinedLabel}
        </Text>
      </View>
      <StatusPill
        label={member.verified ? 'Verificado' : 'Sin verificar'}
        tone={member.verified ? 'success' : 'brand'}
      />
    </View>
  );
});

function MembersSkeleton() {
  return (
    <SkeletonGroup label="Cargando socios" style={styles.skeleton}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View key={index} style={styles.memberCard}>
          <SkeletonBlock height={44} radius={22} width={44} />
          <View style={styles.memberCopy}>
            <SkeletonBlock height={14} width="55%" />
            <SkeletonBlock height={12} width="70%" />
          </View>
          <SkeletonBlock height={22} radius={10} width={64} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { gap: 10, paddingHorizontal: 20, paddingBottom: ADMIN_BOTTOM_SPACE },
  headerBlock: { gap: 12, paddingBottom: 6 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.56,
  },
  summary: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    minWidth: 0,
    flex: 1,
    gap: 2,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    padding: 12,
    boxShadow: AppShadows.card,
  },
  summaryCardDark: { backgroundColor: AppColors.surface.dark },
  summaryValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 22,
    lineHeight: 26,
  },
  summaryLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  textWhite: { color: AppColors.neutral.white },
  textOnDark: { color: AppColors.neutral.mutedOnDark },
  memberCard: {
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    boxShadow: AppShadows.card,
  },
  memberCopy: { minWidth: 0, flex: 1, gap: 1 },
  memberName: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  joined: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  skeleton: { gap: 10 },
});
