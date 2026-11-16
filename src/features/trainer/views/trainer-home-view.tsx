import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useTrainerHomeViewModel } from '@/features/trainer/viewmodels/use-trainer-home-view-model';
import { ICONS, RoutineStatusPill } from '@/features/trainer/views/trainer-ui';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const STAT_COLORS = {
  success: AppColors.feedback.success,
  warning: AppColors.feedback.warning,
  neutral: AppColors.neutral.muted,
  brand: AppColors.brand.primary,
} as const;

/** Inicio del entrenador. */
export function TrainerHomeView() {
  const viewModel = useTrainerHomeViewModel();
  const { summary } = viewModel;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl colors={[AppColors.brand.primary]} refreshing={viewModel.isRefreshing} tintColor={AppColors.brand.primary} onRefresh={viewModel.refresh} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Mi perfil de entrenador" accessibilityRole="button" style={styles.avatar} onPress={viewModel.openProfile}>
            {viewModel.photoUrl ? (
              <Image contentFit="cover" source={{ uri: viewModel.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.initials}>{viewModel.initials}</Text>
            )}
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.overline}>ENTRENADOR · TITANIUM</Text>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.greeting}>
              {viewModel.greeting}
            </Text>
          </View>
        </View>
        <View style={styles.today}>
          <SymbolView name={ICONS.calendar} size={14} tintColor={AppColors.brand.primary} />
          <Text style={styles.todayText}>{viewModel.today}</Text>
        </View>

        {viewModel.showSkeleton ? <HomeSkeleton /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}

        {summary ? (
          <>
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.decoration} />
              <Text style={styles.heroLabel}>TUS RUTINAS PUBLICADAS</Text>
              <Text style={styles.heroValue}>{summary.published}</Text>
              <Text style={styles.heroText}>Crea rutinas con ejercicios y videos. El administrador las revisa antes de que las vean los socios.</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.heroButton, styles.heroSecondary, pressed && styles.pressed]} onPress={viewModel.openRoutines}>
                  <Text style={styles.heroSecondaryText}>MIS RUTINAS</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.heroButton, styles.heroPrimary, pressed && styles.pressed]} onPress={viewModel.createRoutine}>
                  <SymbolView name={ICONS.plus} size={16} tintColor={AppColors.neutral.white} />
                  <Text style={styles.heroPrimaryText}>CREAR RUTINA</Text>
                </Pressable>
              </View>
            </View>

            {viewModel.profileIncomplete ? (
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.banner, pressed && styles.pressed]} onPress={viewModel.openProfile}>
                <SymbolView name={ICONS.person} size={20} tintColor={AppColors.feedback.warning} />
                <View style={styles.flex}>
                  <Text style={styles.bannerTitle}>Completa tu perfil</Text>
                  <Text style={styles.bannerText}>Agrega tu nombre, especialidad y foto para que los socios te identifiquen.</Text>
                </View>
                <SymbolView name={ICONS.chevron} size={16} tintColor={AppColors.feedback.warning} />
              </Pressable>
            ) : null}

            {summary.rejected > 0 ? (
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.banner, styles.bannerError, pressed && styles.pressed]} onPress={viewModel.openRoutines}>
                <SymbolView name={ICONS.alert} size={20} tintColor={AppColors.feedback.error} />
                <View style={styles.flex}>
                  <Text style={[styles.bannerTitle, styles.errorText]}>{`${summary.rejected} ${summary.rejected === 1 ? 'rutina rechazada' : 'rutinas rechazadas'}`}</Text>
                  <Text style={styles.bannerText}>Corrígela y vuelve a enviarla a revisión.</Text>
                </View>
                <SymbolView name={ICONS.chevron} size={16} tintColor={AppColors.feedback.error} />
              </Pressable>
            ) : null}

            <View style={styles.stats}>
              {summary.stats.map((stat) => (
                <Pressable
                  key={stat.key}
                  accessibilityLabel={`${stat.label}: ${stat.value}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
                  onPress={stat.key === 'clients' ? viewModel.openClients : viewModel.openRoutines}>
                  <View style={[styles.statDot, { backgroundColor: STAT_COLORS[stat.tone] }]} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Rutinas recientes
              </Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={viewModel.openRoutines}>
                <Text style={styles.link}>Ver todas</Text>
              </Pressable>
            </View>
            {summary.recent.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <Text style={styles.bannerText}>Aún no tienes rutinas. Crea la primera para tus socios.</Text>
              </SurfaceCard>
            ) : (
              <SurfaceCard style={styles.list}>
                {summary.recent.map((routine, index) => (
                  <Pressable
                    key={routine.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.listRow, index > 0 && styles.divider, pressed && styles.pressed]}
                    onPress={() => viewModel.openRoutine(routine.id)}>
                    <View style={styles.listIcon}>
                      <SymbolView name={ICONS.clipboard} size={18} tintColor={AppColors.brand.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.listTitle}>
                        {routine.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.bannerText}>
                        {routine.meta}
                      </Text>
                    </View>
                    <RoutineStatusPill label={routine.status.label} tone={routine.status.tone} />
                  </Pressable>
                ))}
              </SurfaceCard>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeSkeleton() {
  return (
    <SkeletonGroup label="Cargando tu resumen" style={styles.skeleton}>
      <View style={styles.heroSkeleton}>
        <SkeletonBlock height={12} tone="dark" width={160} />
        <SkeletonBlock height={40} radius={8} tone="dark" width={60} />
        <SkeletonBlock height={10} tone="dark" />
        <SkeletonBlock height={48} radius={14} tone="dark" />
      </View>
      <View style={styles.stats}>
        {[0, 1, 2, 3].map((key) => (
          <SkeletonBlock key={key} height={92} radius={16} style={styles.statSkeleton} />
        ))}
      </View>
      <SkeletonBlock height={18} width="40%" />
      <SkeletonBlock height={150} radius={22} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 124 },
  flex: { minWidth: 0, flex: 1 },
  pressed: { opacity: 0.8 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { width: 48, height: 48, overflow: 'hidden', borderRadius: 24, backgroundColor: AppColors.surface.softSelected, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.label },
  overline: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: 11, letterSpacing: 0.8, lineHeight: 14 },
  greeting: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  today: { alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 6, borderRadius: 10, backgroundColor: AppColors.surface.softSelected, paddingHorizontal: 10, paddingVertical: 5 },
  todayText: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  hero: { overflow: 'hidden', gap: 4, borderRadius: 24, backgroundColor: AppColors.neutral.black, padding: 24 },
  decoration: { position: 'absolute', top: -60, right: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: AppColors.surface.darkElevated },
  heroLabel: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 11, lineHeight: 15 },
  heroValue: { color: AppColors.neutral.white, fontFamily: AppFonts.display, fontSize: 52, lineHeight: 54 },
  heroText: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  heroButton: { minHeight: 48, flex: 1, flexDirection: 'row', gap: 6, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroSecondary: { backgroundColor: AppColors.surface.default },
  heroPrimary: { backgroundColor: AppColors.brand.primary },
  heroSecondaryText: { color: AppColors.neutral.text, fontFamily: AppFonts.button, fontSize: AppFontSizes.label },
  heroPrimaryText: { color: AppColors.neutral.white, fontFamily: AppFonts.button, fontSize: AppFontSizes.label },
  banner: { alignItems: 'center', flexDirection: 'row', gap: 12, borderRadius: 16, backgroundColor: AppColors.feedback.warningSoft, padding: 14 },
  bannerError: { backgroundColor: AppColors.surface.softSelected },
  bannerTitle: { color: AppColors.feedback.warning, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  errorText: { color: AppColors.feedback.error },
  bannerText: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', flexGrow: 1, gap: 2, borderRadius: 16, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card, padding: 14 },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  statValue: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: 34, lineHeight: 38 },
  statLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  link: { color: AppColors.brand.primary, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  emptyCard: { padding: 16 },
  list: { paddingHorizontal: 14, paddingVertical: 4 },
  listRow: { minHeight: 64, alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: AppColors.border.soft },
  listIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: AppColors.surface.soft, alignItems: 'center', justifyContent: 'center' },
  listTitle: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: 15, lineHeight: 22 },
  skeleton: { gap: 16 },
  heroSkeleton: { gap: 12, borderRadius: 24, backgroundColor: AppColors.neutral.black, padding: 24 },
  statSkeleton: { width: '48%', flexGrow: 1 },
});
