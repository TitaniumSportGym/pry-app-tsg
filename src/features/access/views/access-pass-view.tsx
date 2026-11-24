import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenCaptureGuard } from '@/components/security/screen-capture-guard';
import { AppButton } from '@/components/ui/app-button';
import { BACK_ICON } from '@/components/ui/icon-button';
import { useAccessPassViewModel } from '@/features/access/viewmodels/use-access-pass-view-model';
import { AccessPassCard } from '@/features/access/views/access-pass-card';
import { AccessQrCode } from '@/features/access/views/access-qr-code';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const QR_SIZE = 204;
const ALERT_ICON: SymbolViewProps['name'] = {
  ios: 'exclamationmark.circle',
  android: 'error',
  web: 'error',
};

/** Pantallas 41–42 · Mi acceso (QR). */
export function AccessPassView() {
  const viewModel = useAccessPassViewModel();
  const { status } = viewModel;
  const locked = status === 'unavailable' || status === 'expired';

  const subtitle = !viewModel.isAuthenticated
    ? 'Inicia sesión para ver tu pase'
    : status === 'unavailable'
      ? 'Código desactivado'
      : 'Muéstralo en recepción';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="light" />
      <ScreenCaptureGuard guardKey="access-pass" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Regresar"
            accessibilityRole="button"
            hitSlop={4}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={viewModel.goBack}>
            <SymbolView name={BACK_ICON} size={20} tintColor={AppColors.neutral.white} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              MI ACCESO
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {!viewModel.isAuthenticated ? (
          <>
            <Note icon={ALERT_ICON} text="Tu pase de acceso aparece aquí cuando inicias sesión con tu cuenta de socio." />
            <AppButton title="Iniciar sesión" onPress={viewModel.openLogin} />
          </>
        ) : (
          <>
            <AccessPassCard
              caption={
                status === 'ready'
                  ? 'Personal e intransferible'
                  : status === 'expired'
                    ? 'Código vencido'
                    : status === 'unavailable'
                      ? 'Código desactivado'
                      : status === 'error'
                        ? 'Código no disponible'
                        : 'Generando código…'
              }
              initials={viewModel.initials}
              locked={locked}
              memberDetail={viewModel.memberDetail}
              memberName={viewModel.memberName}
              planName={status === 'unavailable' ? 'Sin plan vigente' : viewModel.planName}
              qr={
                <AccessQrCode
                  loading={status === 'loading'}
                  locked={locked || status === 'error'}
                  size={QR_SIZE}
                  value={viewModel.qrValue}
                />
              }
              statusLabel={status === 'unavailable' ? 'Inactiva' : 'Activa'}
              statusTone={status === 'unavailable' ? 'error' : 'success'}
              validUntil={status === 'unavailable' ? '—' : viewModel.validUntil}
              validUntilTone={status === 'unavailable' ? 'error' : 'neutral'}
            />

            {status === 'ready' || status === 'loading' ? (
              <>
                <Note
                  icon={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
                  text={`El código se actualiza en ${viewModel.countdown} por seguridad. Las capturas de pantalla no funcionan.`}
                />
                <View style={styles.tips}>
                  <Tip icon={{ ios: 'sun.max', android: 'light_mode', web: 'light_mode' }} text="Sube el brillo" />
                  {viewModel.lastAccess ? (
                    <Tip
                      icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                      text={`Último acceso: ${viewModel.lastAccess}`}
                    />
                  ) : null}
                </View>
              </>
            ) : null}

            {status === 'expired' ? (
              <>
                <Note icon={ALERT_ICON} text="Tu código venció. Genera uno nuevo cuando estés en recepción." />
                <AppButton title="Generar nuevo código" onPress={viewModel.retry} />
              </>
            ) : null}

            {status === 'unavailable' ? (
              <>
                <Note
                  icon={ALERT_ICON}
                  text="No tienes una membresía vigente. Renuévala y tu código se activa en cuanto se confirme el pago."
                />
                <AppButton title="Renovar membresía" onPress={viewModel.openMemberships} />
              </>
            ) : null}

            {status === 'error' && viewModel.errorMessage ? (
              <>
                <Note alert icon={ALERT_ICON} text={viewModel.errorMessage} />
                <AppButton
                  disabled={viewModel.retryInSeconds > 0}
                  title={
                    viewModel.retryInSeconds > 0
                      ? `Reintentar en ${viewModel.retryInSeconds} s`
                      : 'Reintentar'
                  }
                  onPress={viewModel.retry}
                />
              </>
            ) : null}

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}
              onPress={viewModel.openHistory}>
              <Text style={styles.historyText}>Ver mis entradas</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Note({ icon, text, alert = false }: { icon: SymbolViewProps['name']; text: string; alert?: boolean }) {
  return (
    <View style={styles.note}>
      <SymbolView name={icon} size={18} tintColor={AppColors.brand.primary} />
      <Text accessibilityRole={alert ? 'alert' : undefined} style={styles.noteText}>
        {text}
      </Text>
    </View>
  );
}

function Tip({ icon, text }: { icon: SymbolViewProps['name']; text: string }) {
  return (
    <View style={styles.tip}>
      <SymbolView name={icon} size={14} tintColor={AppColors.neutral.mutedOnDark} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.dark },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    alignItems: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: AppSpacing.four,
    paddingTop: 11,
    paddingBottom: 112,
  },
  header: {
    alignSelf: 'stretch',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: -4,
    paddingBottom: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: AppColors.surface.darkSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  subtitle: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  pressed: { opacity: 0.7 },
  note: {
    alignSelf: 'stretch',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    backgroundColor: AppColors.surface.darkElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  tips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  tip: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  tipText: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  historyLink: { paddingVertical: AppSpacing.two },
  historyText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
});
