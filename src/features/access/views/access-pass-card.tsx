import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DUMBBELL_ICON } from '@/features/access/views/access-qr-code';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

export type PassTone = 'success' | 'error' | 'neutral';

interface AccessPassCardProps {
  /** Encabezado gris cuando el código está desactivado; rojo cuando está vigente. */
  locked: boolean;
  memberName: string;
  memberDetail: string;
  initials: string | null;
  qr: ReactNode;
  caption: string;
  planName: string;
  validUntil: string;
  validUntilTone?: PassTone;
  statusLabel: string;
  statusTone: PassTone;
}

const TONE_COLORS: Record<PassTone, { text: string; background: string }> = {
  success: { text: AppColors.feedback.success, background: AppColors.feedback.successSoft },
  error: { text: AppColors.feedback.error, background: AppColors.surface.softSelected },
  neutral: { text: AppColors.neutral.muted, background: AppColors.surface.muted },
};

/** Pase de acceso (pantallas 41–42): encabezado, socio, código QR y datos de la membresía. */
export function AccessPassCard({
  locked,
  memberName,
  memberDetail,
  initials,
  qr,
  caption,
  planName,
  validUntil,
  validUntilTone = 'neutral',
  statusLabel,
  statusTone,
}: AccessPassCardProps) {
  const status = TONE_COLORS[statusTone];

  return (
    <View style={styles.card}>
      <View style={[styles.header, locked && styles.headerLocked]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <SymbolView
              name={DUMBBELL_ICON}
              size={16}
              tintColor={locked ? AppColors.surface.darkSelected : AppColors.brand.primary}
            />
          </View>
          <View>
            <Text style={styles.brandName}>TITANIUM</Text>
            <Text style={styles.brandCaption}>Sport Gym</Text>
          </View>
        </View>
        <Text style={styles.headerLabel}>PASE DE ACCESO</Text>
      </View>

      <View style={styles.member}>
        <View style={styles.avatar}>
          {initials ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <SymbolView
              name={{ ios: 'person.fill', android: 'person', web: 'person' }}
              size={20}
              tintColor={AppColors.brand.primary}
            />
          )}
        </View>
        <View style={styles.memberCopy}>
          <Text numberOfLines={1} style={styles.memberName}>
            {memberName}
          </Text>
          <Text numberOfLines={1} style={styles.memberDetail}>
            {memberDetail}
          </Text>
        </View>
      </View>

      <View style={styles.qrArea}>
        <View style={styles.qrFrame}>{qr}</View>
        <Text style={[styles.caption, locked && styles.captionMuted]}>{caption}</Text>
      </View>

      <View style={styles.separator}>
        <View style={styles.dashes} />
      </View>

      <View style={styles.data}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Plan</Text>
          <Text numberOfLines={1} style={styles.dataValue}>
            {planName}
          </Text>
        </View>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Vigente hasta</Text>
          <Text
            numberOfLines={1}
            style={[styles.dataValue, validUntilTone === 'error' && styles.dataValueError]}>
            {validUntil}
          </Text>
        </View>
        <View style={[styles.dataItem, styles.dataItemEnd]}>
          <Text style={styles.dataLabel}>Estado</Text>
          <View style={[styles.pill, { backgroundColor: status.background }]}>
            <Text style={[styles.pillText, { color: status.text }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: AppColors.surface.default,
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AppColors.brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerLocked: { backgroundColor: AppColors.surface.darkSelected },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  brandCaption: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    opacity: 0.8,
  },
  headerLabel: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  member: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  memberCopy: { minWidth: 0, flex: 1, gap: 1 },
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
  qrArea: { alignItems: 'center', gap: 10, paddingBottom: 10, paddingTop: 16 },
  qrFrame: {
    width: 236,
    height: 236,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    letterSpacing: 1,
    lineHeight: 20,
  },
  captionMuted: { color: AppColors.neutral.placeholder },
  // Línea punteada: solo se ve el borde superior del recuadro interior.
  separator: { height: 1.5, overflow: 'hidden' },
  dashes: {
    height: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AppColors.border.default,
  },
  data: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 14 },
  dataItem: { minWidth: 0, flex: 1, gap: 2 },
  dataItemEnd: { alignItems: 'flex-end', gap: 4 },
  dataLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  dataValue: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  dataValueError: { color: AppColors.feedback.error },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
});
