import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { useAdminHomeViewModel } from '@/features/admin/viewmodels/use-admin-home-view-model';
import {
  ADMIN_BOTTOM_SPACE,
  AdminAvatar,
  AdminCard,
  CHEVRON,
  IconTile,
  SampleBadge,
  StatusPill,
} from '@/features/admin/views/admin-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const TILE_BACKGROUND = {
  brand: AppColors.surface.softSelected,
  success: AppColors.feedback.successSoft,
  neutral: AppColors.surface.input,
} as const;

const TILE_COLOR = {
  brand: AppColors.brand.primary,
  success: AppColors.feedback.success,
  neutral: AppColors.neutral.muted,
} as const;

/** Pantalla 46 · Admin — Inicio. */
export function AdminHomeView() {
  const viewModel = useAdminHomeViewModel();
  const { stats } = viewModel;

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
        <View style={styles.hero}>
          <View style={styles.profileAvatar}>
            <AdminAvatar initials={viewModel.initials} size={42} />
          </View>
          <View style={styles.heroCopy}>
            <Text numberOfLines={1} style={styles.caption}>
              {viewModel.roleLabel}
            </Text>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.greeting}>
              {viewModel.greeting}
            </Text>
          </View>
          <View style={styles.bell}>
            <IconButton
              icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
              label="Notificaciones, próximamente"
              size={20}
            />
          </View>
        </View>

        <View style={styles.dateChip}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            size={14}
            tintColor={AppColors.brand.primary}
          />
          <Text style={styles.dateText}>{viewModel.todayLabel}</Text>
        </View>

        {viewModel.errorMessage ? (
          <AdminCard style={styles.errorCard}>
            <Text style={styles.errorText}>{viewModel.errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              onPress={viewModel.retry}>
              <Text style={styles.link}>Reintentar</Text>
            </Pressable>
          </AdminCard>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            detail={stats.accessToday.detail}
            detailTone="success"
            icon={{ ios: 'person.2', android: 'group', web: 'group' }}
            label="Accesos hoy"
            sample
            value={stats.accessToday.value}
          />
          <StatCard
            detail={stats.salesToday.detail}
            icon={{ ios: 'banknote', android: 'payments', web: 'payments' }}
            label="Ventas de hoy"
            value={stats.salesToday.value}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            detail={stats.toPrepare.detail}
            icon={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
            label="Por preparar"
            value={stats.toPrepare.value}
          />
          <StatCard
            detail={stats.expiringSoon.detail}
            icon={{ ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' }}
            label="Por vencer"
            sample
            value={stats.expiringSoon.value}
          />
        </View>

        <AdminCard style={styles.chartCard}>
          <View style={styles.rowBetween}>
            <View>
              <View style={styles.titleWithBadge}>
                <Text style={styles.cardTitle}>Accesos por hora</Text>
                <SampleBadge />
              </View>
              <Text style={styles.caption}>Hora pico: {viewModel.accessChart.peakHour}</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendSwatch} />
              <Text style={styles.caption}>Ahora</Text>
            </View>
          </View>
          <View
            accessibilityLabel={`Accesos por hora, hora pico ${viewModel.accessChart.peakHour}`}
            style={styles.bars}>
            {viewModel.accessChart.bars.map((bar) => (
              <View key={bar.hour} style={styles.barColumn}>
                <View
                  style={[styles.bar, { height: bar.value }, bar.isCurrent && styles.barCurrent]}
                />
                <Text style={styles.barLabel}>{bar.hour}</Text>
              </View>
            ))}
          </View>
        </AdminCard>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Pendientes
        </Text>
        <AdminCard style={styles.listCard}>
          {viewModel.pending.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityLabel={`${item.title}, ${item.count}`}
                accessibilityRole="button"
                style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                onPress={() => viewModel.open(item.route)}>
                <IconTile
                  background={TILE_BACKGROUND[item.tone]}
                  color={TILE_COLOR[item.tone]}
                  icon={item.icon}
                />
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.caption}>
                    {item.detail}
                  </Text>
                </View>
                {item.count > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                ) : null}
                <SymbolView name={CHEVRON} size={16} tintColor={AppColors.neutral.muted} />
              </Pressable>
            </Fragment>
          ))}
        </AdminCard>

        <View style={styles.titleWithBadge}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Últimos accesos
          </Text>
          <SampleBadge />
        </View>
        <AdminCard style={styles.listCard}>
          {viewModel.latestAccess.map((access, index) => (
            <Fragment key={access.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.listRow}>
                <AdminAvatar
                  initials={access.name
                    .split(' ')
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')}
                  size={40}
                />
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {access.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.caption, !access.allowed && styles.captionError]}>
                    {access.detail}
                  </Text>
                </View>
                <StatusPill
                  label={access.allowed ? 'Permitido' : 'Denegado'}
                  tone={access.allowed ? 'success' : 'error'}
                />
              </View>
            </Fragment>
          ))}
        </AdminCard>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  detail: string;
  detailTone?: 'success';
  sample?: boolean;
}

function StatCard({ icon, label, value, detail, detailTone, sample = false }: StatCardProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}, ${detail}`} style={styles.statCard}>
      <View style={styles.rowBetween}>
        <IconTile icon={icon} iconSize={17} size={34} />
        {sample ? <SampleBadge /> : null}
      </View>
      <Text style={styles.caption}>{label}</Text>
      <Text numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
      <Text style={[styles.caption, detailTone === 'success' && styles.captionSuccess]}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 11, paddingBottom: ADMIN_BOTTOM_SPACE },
  hero: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  profileAvatar: {
    borderWidth: 3,
    borderColor: AppColors.surface.default,
    borderRadius: 24,
    boxShadow: AppShadows.card,
  },
  heroCopy: { minWidth: 0, flex: 1 },
  greeting: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  bell: {
    borderRadius: 14,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
  dateChip: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    boxShadow: AppShadows.card,
  },
  dateText: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    minWidth: 0,
    flex: 1,
    gap: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    padding: 14,
    boxShadow: AppShadows.card,
  },
  statValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 24,
    lineHeight: 28,
  },
  caption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  captionSuccess: { color: AppColors.feedback.success },
  captionError: { color: AppColors.feedback.error },
  rowBetween: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  titleWithBadge: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  chartCard: { gap: 14, padding: 16 },
  cardTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3, backgroundColor: AppColors.brand.primary },
  bars: { height: 110, alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 6, backgroundColor: AppColors.surface.softSelected },
  barCurrent: { backgroundColor: AppColors.brand.primary },
  barLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: 10,
    lineHeight: 16,
  },
  sectionTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  listCard: { paddingHorizontal: 14, paddingVertical: 4 },
  listRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  rowCopy: { minWidth: 0, flex: 1, gap: 1 },
  rowTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 12,
    lineHeight: 16,
  },
  errorCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  errorText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.feedback.error,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  link: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  pressed: { opacity: 0.7 },
});
