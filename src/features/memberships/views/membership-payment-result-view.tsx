import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenCaptureGuard } from '@/components/security/screen-capture-guard';
import { AppButton } from '@/components/ui/app-button';
import { AccessQrCode } from '@/features/access/views/access-qr-code';
import { useMembershipPaymentResultViewModel } from '@/features/memberships/viewmodels/use-membership-payment-result-view-model';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { AppColors, AppFonts, AppFontSizes, AppShadows, AppSpacing } from '@/theme/tokens';

const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' };

const WAITING_COPY = {
  verifying: {
    title: 'CONFIRMANDO TU PAGO',
    text: 'Estamos verificando con Mercado Pago. No cierres la app; puede tardar unos segundos.',
  },
  'still-pending': {
    title: 'PAGO EN PROCESO',
    text: 'Mercado Pago aún no confirma tu pago. Puede tardar unos minutos; consulta de nuevo en un momento.',
  },
  error: {
    title: 'NO PUDIMOS VERIFICAR',
    text: 'No logramos consultar el estado de tu pago. Revisa tu conexión e inténtalo de nuevo.',
  },
} as const;

/** Pantallas 33 y 40 · Verificando pago → Membresía activada. */
export function MembershipPaymentResultView({ orderId }: { orderId: string | undefined }) {
  const viewModel = useMembershipPaymentResultViewModel(orderId);
  const { status } = viewModel;

  if (status === 'approved') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, styles.approvedBackground]}>
        <StatusBar style="dark" />
        {viewModel.qrValue ? <ScreenCaptureGuard guardKey="payment-result" /> : null}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successHalo}>
            <View style={styles.successCircle}>
              <SymbolView name={CHECK_ICON} size={34} tintColor={AppColors.neutral.white} />
            </View>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            ¡MEMBRESÍA ACTIVADA!
          </Text>
          <Text style={styles.text}>
            Mercado Pago confirmó tu pago y generamos tu código de acceso. Muéstralo en recepción al
            llegar.
          </Text>

          {viewModel.plan ? (
            <View style={styles.planCard}>
              <View style={styles.planIcon}>
                <SymbolView
                  name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }}
                  size={20}
                  tintColor={AppColors.neutral.white}
                />
              </View>
              <View style={styles.flexCopy}>
                <Text numberOfLines={1} style={styles.planName}>
                  {viewModel.plan.name}
                </Text>
                <Text numberOfLines={1} style={styles.planValidity}>
                  {viewModel.plan.validity}
                </Text>
              </View>
              {viewModel.plan.amount ? <Text style={styles.planAmount}>{viewModel.plan.amount}</Text> : null}
            </View>
          ) : null}

          <View style={styles.previewCard}>
            <View style={styles.previewFrame}>
              <AccessQrCode locked={!viewModel.qrValue} size={80} value={viewModel.qrValue} />
            </View>
            <View style={styles.flexCopy}>
              <Text style={styles.previewTitle}>Tu código de acceso</Text>
              <Text style={styles.previewText}>
                {viewModel.qrValue
                  ? 'Siempre disponible en Inicio → Mi acceso.'
                  : 'Tu membresía se está activando. En unos minutos tu código estará en Inicio → Mi acceso.'}
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />
          <AppButton title="Ver mi acceso" onPress={viewModel.openAccess} />
          <TextLink label="Ir al inicio" onPress={viewModel.goHome} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (status === 'rejected' || status === 'invalid') {
    const rejected = status === 'rejected';
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.content, styles.centered]}>
          <View style={styles.errorHalo}>
            <View style={styles.errorCircle}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={30} tintColor={AppColors.neutral.white} />
            </View>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {rejected ? 'PAGO NO APROBADO' : 'PAGO NO ENCONTRADO'}
          </Text>
          <Text accessibilityRole="alert" style={styles.text}>
            {rejected
              ? 'Mercado Pago no aprobó el cobro y tu membresía no se activó. Puedes intentarlo de nuevo con otro método de pago.'
              : 'No encontramos la compra que intentas consultar. Revisa tus pagos o vuelve a las membresías.'}
          </Text>
          <View style={styles.spacer} />
          <AppButton title="Ver membresías" onPress={viewModel.openMemberships} />
          <TextLink label="Ver mis pagos" onPress={viewModel.openPayments} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const copy = WAITING_COPY[status];
  const verifying = status === 'verifying';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, styles.waiting]}>
        <Spinner active={verifying} />
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {copy.text}
        </Text>

        <View style={styles.steps}>
          <Step label="Pago enviado a Mercado Pago" state="done" />
          <Step label="Confirmación del pago" state="current" />
          <Step label="Membresía activada" state="pending" />
        </View>

        {viewModel.orderLabel || viewModel.orderTotal ? (
          <View style={styles.orderCard}>
            <View style={styles.flexCopy}>
              <Text style={styles.orderLabel}>Pedido</Text>
              <Text style={styles.orderNumber}>{viewModel.orderLabel ?? '—'}</Text>
            </View>
            {viewModel.orderTotal ? <Text style={styles.orderTotal}>{viewModel.orderTotal}</Text> : null}
          </View>
        ) : null}

        <View style={styles.spacer} />
        {verifying ? null : (
          <AppButton
            title={status === 'error' ? 'Reintentar' : 'Consultar de nuevo'}
            onPress={viewModel.checkAgain}
          />
        )}
        <AppButton title="Ver mis pagos" variant="outline" onPress={viewModel.openPayments} />
        <Text style={styles.footnote}>Solo damos un pago por aprobado cuando lo confirma el sistema.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ label, state }: { label: string; state: 'done' | 'current' | 'pending' }) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepMark,
          state === 'done' && styles.stepDone,
          state === 'current' && styles.stepCurrent,
        ]}>
        {state === 'done' ? (
          <SymbolView name={CHECK_ICON} size={14} tintColor={AppColors.neutral.white} />
        ) : state === 'current' ? (
          <View style={styles.stepDot} />
        ) : null}
      </View>
      <Text style={[styles.stepLabel, state === 'pending' && styles.stepLabelPending]}>{label}</Text>
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/** Anillo de carga; se queda quieto si el sistema pide reducir el movimiento. */
function Spinner({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active || reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View accessibilityLabel="Verificando pago" accessible style={styles.spinner}>
      <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]} />
      <View style={styles.spinnerCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  approvedBackground: { backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 112,
  },
  centered: { paddingTop: 96 },
  waiting: { gap: AppSpacing.three, paddingHorizontal: 28, paddingTop: 96 },
  spacer: { flexGrow: 1, minHeight: AppSpacing.three },
  flexCopy: { minWidth: 0, flex: 1, gap: 1 },
  pressed: { opacity: 0.7 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
    textAlign: 'center',
  },
  text: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  successHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 24px rgba(23, 120, 74, 0.25)',
  },
  successCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: AppColors.feedback.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.feedback.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  planValidity: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  planAmount: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
  },
  previewCard: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
    padding: 14,
  },
  previewFrame: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  previewText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  link: { paddingVertical: AppSpacing.two },
  linkText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  spinner: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  spinnerRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 10,
    borderColor: AppColors.surface.softSelected,
    borderTopColor: AppColors.brand.primary,
  },
  spinnerCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.surface.default,
  },
  steps: {
    width: '100%',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    backgroundColor: AppColors.surface.default,
    padding: AppSpacing.three,
  },
  step: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  stepMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { borderWidth: 0, backgroundColor: AppColors.feedback.success },
  stepCurrent: { borderColor: AppColors.brand.primary },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.brand.primary },
  stepLabel: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  stepLabelPending: { color: AppColors.neutral.muted },
  orderCard: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  orderLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  orderNumber: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  orderTotal: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  footnote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
