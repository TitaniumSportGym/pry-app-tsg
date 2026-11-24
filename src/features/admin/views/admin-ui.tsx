import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

// Piezas genéricas compartidas con las pantallas del cliente; se conservan sus nombres de admin.
export { ActionBar as AdminActionBar } from '@/components/ui/action-bar';
export { FormField as AdminField } from '@/components/ui/form-field';
export { IconTile } from '@/components/ui/icon-tile';
export { StatusPill, type PillTone } from '@/components/ui/status-pill';
export { SubHeader as AdminSubHeader } from '@/components/ui/sub-header';
export { SurfaceCard as AdminCard } from '@/components/ui/surface-card';

/** Espacio inferior para que la barra de pestañas (con el botón central elevado) no tape el contenido. */
export const ADMIN_BOTTOM_SPACE = 124;

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

/** Encabezado de las pestañas del administrador: título Bebas + subtítulo y acción opcional. */
export function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function AdminAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <View
      accessible={false}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, size <= 36 && styles.avatarTextSmall]}>{initials}</Text>
    </View>
  );
}

/** Marca los bloques con datos de ejemplo mientras el backend no tenga ese endpoint. */
export function SampleBadge() {
  return (
    <View accessibilityLabel="Datos de ejemplo" style={styles.sample}>
      <Text style={styles.sampleText}>EJEMPLO</Text>
    </View>
  );
}

export const CHEVRON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 11,
    paddingBottom: 14,
  },
  headerCopy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  avatar: {
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
  avatarTextSmall: { fontFamily: AppFonts.button, fontSize: 12, lineHeight: 16 },
  sample: {
    borderRadius: 6,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sampleText: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.button,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
});
