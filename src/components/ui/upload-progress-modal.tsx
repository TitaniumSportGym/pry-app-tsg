import { SymbolView } from 'expo-symbols';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

interface UploadProgressModalProps {
  upload: { label: string; fraction: number | null; sizeLabel: string | null } | null;
  onCancel: () => void;
}

/** Pantalla 84 · Subiendo: avance real del envío y opción de cancelar. */
export function UploadProgressModal({ upload, onCancel }: UploadProgressModalProps) {
  const percent = upload?.fraction != null ? Math.round(upload.fraction * 100) : 0;

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible={upload !== null} onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.halo}>
            <View style={styles.circle}>
              <SymbolView name={{ ios: 'arrow.up', android: 'upload', web: 'upload' }} size={28} tintColor={AppColors.neutral.white} />
            </View>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            SUBIENDO
          </Text>
          <Text style={styles.text}>No cierres la app ni bloquees el teléfono. Con una conexión lenta puede tardar unos minutos.</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.label}>
                {upload?.label ?? ''}
              </Text>
              <Text style={styles.percent}>{`${percent} %`}</Text>
            </View>
            <View
              accessible
              accessibilityLabel={`Subiendo, ${percent} por ciento`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: percent }}
              style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(3, percent)}%` }]} />
            </View>
            {upload?.sizeLabel ? <Text style={styles.caption}>{`Archivo de ${upload.sizeLabel}`}</Text> : null}
          </View>
          <AppButton title="Cancelar subida" variant="outline" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: AppColors.overlay.scrim },
  sheet: {
    alignItems: 'center',
    gap: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: AppColors.surface.default,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  halo: { width: 96, height: 96, borderRadius: 48, backgroundColor: AppColors.surface.softSelected, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 68, height: 68, borderRadius: 34, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: AppColors.neutral.black, fontFamily: AppFonts.display, fontSize: AppFontSizes.hero, letterSpacing: 0.5, lineHeight: 42 },
  text: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20, textAlign: 'center' },
  card: { width: '100%', gap: 10, borderRadius: 20, backgroundColor: AppColors.surface.default, boxShadow: AppShadows.card, padding: 16 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  label: { flex: 1, color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
  percent: { color: AppColors.brand.primary, fontFamily: AppFonts.emphasis, fontSize: 20, lineHeight: 26 },
  track: { height: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: AppColors.skeleton.light },
  fill: { height: '100%', borderRadius: 4, backgroundColor: AppColors.brand.primary },
  caption: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 16 },
});
