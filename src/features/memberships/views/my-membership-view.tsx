import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { IconTile } from '@/components/ui/icon-tile';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { TextLink } from '@/components/ui/payment-progress';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonBlock, SkeletonGroup } from '@/components/ui/skeleton';
import { SubHeader } from '@/components/ui/sub-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { SubscriptionTone } from '@/features/memberships/models/subscription-detail';
import { useMyMembershipViewModel } from '@/features/memberships/viewmodels/use-my-membership-view-model';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

const CROWN: SymbolViewProps['name'] = { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' };
const CHECK: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' };
const RECEIPT: SymbolViewProps['name'] = { ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' };
const QR: SymbolViewProps['name'] = { ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' };

/** Colores de la etiqueta de estado sobre la tarjeta oscura. */
const TONES: Record<SubscriptionTone, { background: string; text: string; dot: string }> = {
  active: { background: AppColors.feedback.successSoft, text: AppColors.feedback.success, dot: AppColors.feedback.success },
  expiring: { background: AppColors.feedback.warningSoft, text: AppColors.feedback.warning, dot: AppColors.feedback.warning },
  pending: { background: AppColors.surface.input, text: AppColors.neutral.muted, dot: AppColors.neutral.muted },
  inactive: { background: AppColors.surface.softSelected, text: AppColors.feedback.error, dot: AppColors.feedback.error },
};

/** Más → Mi membresía. */
export function MyMembershipView() {
  const viewModel = useMyMembershipViewModel();
  const { membership } = viewModel;

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
        <SubHeader subtitle="Tu suscripción en Titanium" title="MI MEMBRESÍA" onBack={viewModel.goBack} />

        {viewModel.showSkeleton ? <MyMembershipSkeleton /> : null}
        {viewModel.errorMessage ? <ErrorState message={viewModel.errorMessage} onRetry={viewModel.retry} /> : null}
        {viewModel.hasNoMembership ? (
          <IllustratedEmptyState
            actionLabel="Ver membresías"
            description="Elige un plan para entrenar en Titanium y obtener tu acceso con código QR."
            icon={CROWN}
            title="SIN MEMBRESÍA ACTIVA"
            onAction={viewModel.openPlans}
          />
        ) : null}

        {membership ? (
          <>
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.decoration} />
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>TU MEMBRESÍA</Text>
                <View
                  accessibilityLabel={`Estado: ${membership.state.label}`}
                  accessible
                  style={[styles.statePill, { backgroundColor: TONES[membership.state.tone].background }]}>
                  <View style={[styles.stateDot, { backgroundColor: TONES[membership.state.tone].dot }]} />
                  <Text style={[styles.stateText, { color: TONES[membership.state.tone].text }]}>
                    {membership.state.label.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" numberOfLines={2} style={styles.heroTitle}>
                {membership.planName}
              </Text>
              <Text style={styles.heroText}>{membership.validity}</Text>

              {membership.progress !== null ? (
                <View style={styles.progressBlock}>
                  <View
                    accessible
                    accessibilityLabel={membership.daysLeft ?? undefined}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: Math.round(membership.progress * 100) }}
                    style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.max(4, Math.round(membership.progress * 100))}%` },
                        membership.state.tone === 'expiring' && styles.fillExpiring,
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.heroCaption}>{membership.startLabel}</Text>
                    <Text style={styles.daysLeft}>{membership.daysLeft}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {membership.primaryAction === 'renew' ? (
              <AppButton title="Renovar membresía" onPress={viewModel.openPlans} />
            ) : (
              <AppButton
                leftIcon={<SymbolView name={QR} size={18} tintColor={AppColors.neutral.white} />}
                title="Mi acceso QR"
                onPress={viewModel.openAccess}
              />
            )}

            <Section title="Detalles del plan">
              {membership.description ? <Text style={styles.muted}>{membership.description}</Text> : null}
              {membership.facts.map((fact, index) => (
                <Fragment key={fact.label}>
                  {index > 0 || membership.description ? <View style={styles.divider} /> : null}
                  <View style={styles.factRow}>
                    <Text style={styles.muted}>{fact.label}</Text>
                    <Text style={styles.factValue}>{fact.value}</Text>
                  </View>
                </Fragment>
              ))}
            </Section>

            {membership.benefits.length > 0 ? (
              <Section title="Beneficios">
                {membership.benefits.map((benefit) => (
                  <View key={benefit} style={styles.benefitRow}>
                    <IconTile
                      background={AppColors.feedback.successSoft}
                      color={AppColors.feedback.success}
                      icon={CHECK}
                      iconSize={14}
                      size={28}
                    />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </Section>
            ) : null}

            {membership.payment ? (
              <Section title="Pago">
                <View style={styles.paymentRow}>
                  <IconTile icon={RECEIPT} />
                  <View style={styles.flexCopy}>
                    <Text style={styles.strong}>{membership.payment.method}</Text>
                    {membership.payment.paidAt ? (
                      <Text style={styles.muted}>{`Pagado el ${membership.payment.paidAt}`}</Text>
                    ) : null}
                  </View>
                  {membership.payment.amount ? (
                    <Text style={styles.amount}>{membership.payment.amount}</Text>
                  ) : null}
                </View>
                {membership.payment.folio ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.factRow}>
                      <Text style={styles.muted}>Folio del comprobante</Text>
                      <Text selectable style={styles.factValue}>
                        {membership.payment.folio}
                      </Text>
                    </View>
                  </>
                ) : null}
                {membership.payment.orderNumber ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.factRow}>
                      <Text style={styles.muted}>Pedido</Text>
                      <Text selectable style={styles.factValue}>
                        {membership.payment.orderNumber}
                      </Text>
                    </View>
                  </>
                ) : null}
              </Section>
            ) : null}

            <AppButton title="Ver planes de membresía" variant="outline" onPress={viewModel.openPlans} />
            <View style={styles.center}>
              <TextLink label="Ver mis pagos" onPress={viewModel.openPayments} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SurfaceCard style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </SurfaceCard>
  );
}

/** Cargando: tarjeta oscura con el plan y tarjetas de detalle. */
function MyMembershipSkeleton() {
  return (
    <SkeletonGroup label="Cargando tu membresía" style={styles.skeleton}>
      <View style={styles.heroSkeleton}>
        <SkeletonBlock height={12} tone="dark" width={110} />
        <SkeletonBlock height={34} radius={8} tone="dark" width="70%" />
        <SkeletonBlock height={12} tone="dark" width="85%" />
        <SkeletonBlock height={8} radius={4} tone="dark" />
      </View>
      <SkeletonBlock height={54} radius={18} />
      <View style={styles.cardSkeleton}>
        <SkeletonBlock height={16} width="40%" />
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={styles.factRow}>
            <SkeletonBlock height={12} width={110} />
            <SkeletonBlock height={12} width={80} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  hero: {
    overflow: 'hidden',
    gap: 4,
    borderRadius: 24,
    backgroundColor: AppColors.neutral.black,
    padding: 24,
  },
  decoration: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: AppColors.surface.darkElevated,
  },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  heroLabel: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 11, lineHeight: 15 },
  statePill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },
  heroTitle: { color: AppColors.neutral.white, fontFamily: AppFonts.display, fontSize: 38, lineHeight: 42 },
  heroText: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  progressBlock: { gap: 8, marginTop: 14 },
  track: { height: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: AppColors.surface.darkSelected },
  fill: { height: '100%', borderRadius: 4, backgroundColor: AppColors.brand.primary },
  fillExpiring: { backgroundColor: AppColors.feedback.warning },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  heroCaption: { color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  daysLeft: { color: AppColors.neutral.white, fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, lineHeight: 16 },
  section: { gap: 12, padding: 16 },
  sectionTitle: { color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  factRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factValue: {
    flexShrink: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'right',
  },
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  benefitText: { flex: 1, color: AppColors.neutral.text, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  paymentRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  flexCopy: { minWidth: 0, flex: 1, gap: 2 },
  strong: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  muted: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
  amount: { color: AppColors.neutral.black, fontFamily: AppFonts.emphasis, fontSize: 18, lineHeight: 24 },
  center: { alignItems: 'center' },
  skeleton: { gap: 14 },
  heroSkeleton: { gap: 12, borderRadius: 24, backgroundColor: AppColors.neutral.black, padding: 24 },
  cardSkeleton: {
    gap: 14,
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 16,
  },
});
