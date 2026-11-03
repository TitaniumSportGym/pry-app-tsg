import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ACCESS_BARCODE_TYPES } from '@/features/access/models/access-code';
import { useAccessScannerViewModel } from '@/features/access/viewmodels/use-access-scanner-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const VISOR_SIZE = 250;
const SCAN_LINE_INSET = 20;

const QR_ICON: SymbolViewProps['name'] = { ios: 'qrcode', android: 'qr_code', web: 'qr_code' };

/** Pantalla 43 · Admin — Escanear acceso. Solo lee el QR; la validación con el backend queda pendiente. */
export function AccessScannerView() {
  const viewModel = useAccessScannerViewModel();
  const insets = useSafeAreaInsets();
  const scanned = viewModel.scannedCode !== null;
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
          <View style={styles.sheetRow}>
            <View style={styles.sheetTile}>
              <SymbolView name={QR_ICON} size={22} tintColor={AppColors.brand.primary} />
            </View>
            <View style={styles.sheetCopy}>
              <Text style={styles.sheetCaption}>{scanned ? 'Código leído' : 'Recepción'}</Text>
              {scanned ? (
                <Text numberOfLines={2} selectable style={styles.sheetCode}>
                  {viewModel.scannedCode}
                </Text>
              ) : (
                <Text style={styles.sheetTitle}>Listo para escanear</Text>
              )}
            </View>
          </View>
          {scanned ? (
            <>
              <View style={styles.pendingNote}>
                <SymbolView
                  name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                  size={18}
                  tintColor={AppColors.neutral.muted}
                />
                <Text style={styles.pendingText}>
                  La validación del acceso estará disponible pronto. Por ahora solo se lee el
                  código.
                </Text>
              </View>
              <AppButton title="Escanear siguiente" onPress={viewModel.scanNext} />
            </>
          ) : null}
        </View>
      ) : null}
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
  sheetCode: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  pendingNote: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pendingText: {
    minWidth: 0,
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
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
