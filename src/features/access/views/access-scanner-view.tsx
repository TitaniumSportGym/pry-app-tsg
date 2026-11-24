import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ACCESS_BARCODE_TYPES } from '@/features/access/models/access-code';
import type { ScanRejection } from '@/features/access/models/access-errors';
import {
  useAccessScannerViewModel,
  type ScannedMember,
} from '@/features/access/viewmodels/use-access-scanner-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const VISOR_SIZE = 250;
const SCAN_LINE_INSET = 20;

const PEOPLE_ICON: SymbolViewProps['name'] = { ios: 'person.2', android: 'group', web: 'group' };
const PERSON_ICON: SymbolViewProps['name'] = { ios: 'person.fill', android: 'person', web: 'person' };
const CROWN_ICON: SymbolViewProps['name'] = {
  ios: 'crown',
  android: 'workspace_premium',
  web: 'workspace_premium',
};
const CLOCK_ICON: SymbolViewProps['name'] = { ios: 'clock', android: 'schedule', web: 'schedule' };
const ALERT_ICON: SymbolViewProps['name'] = {
  ios: 'exclamationmark.circle',
  android: 'error',
  web: 'error',
};

/**
 * Pantallas 43–45 · Admin — Escanear acceso. Lee el QR, lo valida con el backend y muestra
 * el resultado. Solo la respuesta del servidor permite la entrada.
 */
export function AccessScannerView() {
  const viewModel = useAccessScannerViewModel();
  const insets = useSafeAreaInsets();
  const scanned = viewModel.scanStatus !== 'idle';
  const cameraReady = viewModel.cameraAccess === 'granted';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {cameraReady ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ACCESS_BARCODE_TYPES }}
          enableTorch={viewModel.torchOn}
          facing="back"
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : viewModel.handleBarcodeScanned}
        />
      ) : null}
      {scanned ? <View style={styles.scrim} /> : null}

      <View style={[styles.header, { marginTop: insets.top + 11 }]}>
        <HeaderButton
          icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          label="Regresar"
          onPress={viewModel.goBack}
        />
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            ESCANEAR ACCESO
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            Recepción · Administrador
          </Text>
        </View>
        {cameraReady ? (
          <HeaderButton
            icon={
              viewModel.torchOn
                ? { ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' }
                : { ios: 'bolt.slash.fill', android: 'flash_off', web: 'flash_off' }
            }
            label={viewModel.torchOn ? 'Apagar linterna' : 'Encender linterna'}
            selected={viewModel.torchOn}
            onPress={viewModel.toggleTorch}
          />
        ) : null}
      </View>

      {viewModel.permissionError ? (
        <Text accessibilityRole="alert" style={styles.permissionError}>
          {viewModel.permissionError}
        </Text>
      ) : null}

      {viewModel.cameraAccess === 'askable' || viewModel.cameraAccess === 'blocked' ? (
        <CameraPermissionPanel
          blocked={viewModel.cameraAccess === 'blocked'}
          onRequest={viewModel.requestCameraAccess}
        />
      ) : (
        <View style={styles.middle}>
          {cameraReady && !scanned ? (
            <>
              <Visor />
              <View style={styles.hint}>
                <Text style={styles.hintTitle}>Apunta al código QR del socio</Text>
                <Text style={styles.hintCaption}>Se lee automáticamente</Text>
              </View>
            </>
          ) : null}
        </View>
      )}

      {cameraReady ? (
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 20 }]}>
          <View style={styles.grabber} />
          {viewModel.scanStatus === 'validating' ? (
            <View accessibilityLiveRegion="polite" style={styles.validating}>
              <ActivityIndicator color={AppColors.brand.primary} size="large" />
              <Text style={styles.validatingText}>Validando acceso…</Text>
            </View>
          ) : viewModel.granted ? (
            <GrantedResult {...viewModel.granted} onNext={viewModel.scanNext} />
          ) : viewModel.rejection ? (
            <DeniedResult
              rejection={viewModel.rejection}
              onNext={viewModel.scanNext}
              onRetry={viewModel.retryValidation}
            />
          ) : (
            <>
              <View style={styles.sheetRow}>
                <View style={styles.sheetTile}>
                  <SymbolView name={PEOPLE_ICON} size={22} tintColor={AppColors.brand.primary} />
                </View>
                <View style={styles.sheetCopy}>
                  <Text style={styles.sheetCaption}>Accesos de hoy</Text>
                  <Text style={styles.sheetTitle}>{viewModel.todayCount}</Text>
                </View>
                <View style={styles.sheetLast}>
                  <Text style={styles.sheetCaption}>Último</Text>
                  <Text style={styles.sheetLastValue}>{viewModel.todayLast}</Text>
                </View>
              </View>
              <AppButton
                title="Ver historial de accesos"
                variant="outline"
                onPress={viewModel.openHistory}
              />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

interface GrantedResultProps {
  member: ScannedMember;
  membership: string;
  registeredAt: string;
  onNext: () => void;
}

/** Pantalla 44 · Acceso permitido: solo se muestra con la confirmación del servidor. */
function GrantedResult({ member, membership, registeredAt, onNext }: GrantedResultProps) {
  return (
    <>
      <ResultBadge tone="success" />
      <View accessibilityLiveRegion="polite" style={styles.resultCopy}>
        <Text accessibilityRole="header" style={[styles.resultTitle, styles.successText]}>
          ACCESO PERMITIDO
        </Text>
        <Text style={styles.resultText}>Membresía activa. La entrada quedó registrada.</Text>
      </View>
      <View style={styles.memberCard}>
        <View style={styles.memberRow}>
          <View style={styles.memberAvatar}>
            {member.initials ? (
              <Text style={styles.memberInitials}>{member.initials}</Text>
            ) : (
              <SymbolView name={PERSON_ICON} size={22} tintColor={AppColors.brand.primary} />
            )}
          </View>
          <View style={styles.sheetCopy}>
            <Text numberOfLines={1} style={styles.memberName}>
              {member.name}
            </Text>
            <Text numberOfLines={1} style={styles.memberDetail}>
              {member.detail}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <InfoRow icon={CROWN_ICON} label="Membresía" value={membership} />
        <InfoRow icon={CLOCK_ICON} label="Entrada registrada" value={registeredAt} />
      </View>
      <AppButton title="Escanear siguiente" onPress={onNext} />
    </>
  );
}

interface DeniedResultProps {
  rejection: ScanRejection;
  onNext: () => void;
  onRetry: () => void;
}

/** Pantalla 45 · Acceso denegado (o sin confirmar por falta de conexión). */
function DeniedResult({ rejection, onNext, onRetry }: DeniedResultProps) {
  const unverified = rejection.kind === 'unverified';

  return (
    <>
      <ResultBadge tone="error" />
      <View accessibilityLiveRegion="polite" style={styles.resultCopy}>
        <Text accessibilityRole="header" style={[styles.resultTitle, styles.errorText]}>
          {unverified ? 'SIN CONFIRMAR' : 'ACCESO DENEGADO'}
        </Text>
        <Text style={styles.resultText}>No registramos la entrada.</Text>
      </View>
      <View style={styles.reason}>
        <SymbolView name={ALERT_ICON} size={20} tintColor={AppColors.feedback.error} />
        <View style={styles.sheetCopy}>
          <Text accessibilityRole="alert" style={styles.reasonTitle}>
            {rejection.title}
          </Text>
          <Text style={styles.reasonText}>{rejection.description}</Text>
        </View>
      </View>
      {unverified ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <AppButton title="Escanear otro" variant="outline" onPress={onNext} />
          </View>
          <View style={styles.action}>
            <AppButton title="Reintentar" variant="dark" onPress={onRetry} />
          </View>
        </View>
      ) : (
        <AppButton title="Escanear de nuevo" variant="dark" onPress={onNext} />
      )}
    </>
  );
}

function ResultBadge({ tone }: { tone: 'success' | 'error' }) {
  const success = tone === 'success';
  return (
    <View style={[styles.badgeOuter, success ? styles.badgeOuterSuccess : styles.badgeOuterError]}>
      <View style={[styles.badgeInner, success ? styles.badgeInnerSuccess : styles.badgeInnerError]}>
        <SymbolView
          name={
            success
              ? { ios: 'checkmark', android: 'check', web: 'check' }
              : { ios: 'xmark', android: 'close', web: 'close' }
          }
          size={32}
          tintColor={AppColors.neutral.white}
        />
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: SymbolViewProps['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <SymbolView name={icon} size={16} tintColor={AppColors.brand.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

interface HeaderButtonProps {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  selected?: boolean;
}

function HeaderButton({ icon, label, onPress, selected = false }: HeaderButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      onPress={onPress}>
      <SymbolView name={icon} size={20} tintColor={AppColors.neutral.white} />
    </Pressable>
  );
}

/** Marco de esquinas rojas con la línea de escaneo animada. */
function Visor() {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCAN_LINE_INSET, VISOR_SIZE - SCAN_LINE_INSET],
  });

  return (
    <View accessible={false} style={styles.visor}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
      <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
    </View>
  );
}

interface CameraPermissionPanelProps {
  blocked: boolean;
  onRequest: () => void;
}

function CameraPermissionPanel({ blocked, onRequest }: CameraPermissionPanelProps) {
  return (
    <View style={styles.permission}>
      <View style={styles.permissionTile}>
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
          size={40}
          tintColor={AppColors.brand.primary}
        />
      </View>
      <Text style={styles.permissionTitle}>ACTIVA LA CÁMARA</Text>
      <Text style={styles.permissionText}>
        {blocked
          ? 'El permiso de la cámara está desactivado. Actívalo en Ajustes para escanear el código QR de los socios.'
          : 'La necesitamos para escanear el código QR de acceso de los socios en recepción.'}
      </Text>
      <AppButton title={blocked ? 'Abrir ajustes' : 'Permitir cámara'} onPress={onRequest} />
    </View>
  );
}

const CORNER_SIZE = 52;
const CORNER_WIDTH = 6;
const CORNER_RADIUS = 20;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.surface.dark,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: AppColors.overlay.scrim,
  },
  header: {
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: AppColors.overlay.whiteSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { minWidth: 0, flex: 1 },
  headerTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.sectionTitle,
    lineHeight: 30,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  pressed: { opacity: 0.7 },
  permissionError: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    marginHorizontal: 20,
    marginTop: AppSpacing.three,
    textAlign: 'center',
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.four,
    paddingHorizontal: 20,
  },
  visor: {
    width: VISOR_SIZE,
    height: VISOR_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: AppColors.brand.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: CORNER_WIDTH,
    borderBottomWidth: CORNER_WIDTH,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: SCAN_LINE_INSET,
    right: SCAN_LINE_INSET,
    height: 3,
    borderRadius: 2,
    backgroundColor: AppColors.brand.primary,
    boxShadow: '0 0 12px 2px rgba(240, 61, 51, 0.8)',
  },
  hint: {
    alignItems: 'center',
    gap: AppSpacing.one,
  },
  hintTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 6,
  },
  hintCaption: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 6,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    gap: AppSpacing.three,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: AppColors.border.default,
  },
  sheetRow: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sheetTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCopy: { minWidth: 0, flex: 1, gap: 1 },
  sheetCaption: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  sheetTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  sheetLast: { alignItems: 'flex-end', gap: 1 },
  sheetLastValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  validating: { alignItems: 'center', gap: AppSpacing.two, paddingVertical: AppSpacing.four },
  validatingText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  badgeOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOuterSuccess: { backgroundColor: AppColors.feedback.successSoft },
  badgeOuterError: { backgroundColor: AppColors.surface.softSelected },
  badgeInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInnerSuccess: { backgroundColor: AppColors.feedback.success },
  badgeInnerError: { backgroundColor: AppColors.feedback.error },
  resultCopy: { alignItems: 'center', gap: 2 },
  resultTitle: {
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
    textAlign: 'center',
  },
  successText: { color: AppColors.feedback.success },
  errorText: { color: AppColors.feedback.error },
  resultText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  memberCard: {
    width: '100%',
    gap: 12,
    borderRadius: 20,
    backgroundColor: AppColors.surface.soft,
    padding: 14,
  },
  memberRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  memberName: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  memberDetail: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  divider: { height: 1, backgroundColor: AppColors.border.soft },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  infoLabel: {
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  infoValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  reason: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    backgroundColor: AppColors.surface.softSelected,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonTitle: {
    color: AppColors.feedback.error,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  reasonText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  actions: { width: '100%', flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: 20,
  },
  permissionTile: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: AppColors.surface.darkSelected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.two,
  },
  permissionTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  permissionText: {
    maxWidth: 320,
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: AppSpacing.two,
  },
});
