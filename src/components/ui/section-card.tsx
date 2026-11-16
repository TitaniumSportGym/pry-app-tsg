import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/ui/icon-tile';
import { SurfaceCard } from '@/components/ui/surface-card';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

interface SectionCardProps {
  icon: SymbolViewProps['name'];
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Tarjeta blanca con ícono en mosaico rosa, título y descripción; agrupa una sección de un formulario. */
export function SectionCard({ icon, title, description, children }: SectionCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <IconTile icon={icon} iconSize={18} size={38} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </SurfaceCard>
  );
}

/** Dato de solo lectura: etiqueta gris y valor, con separador superior opcional. */
export function DataRow({ label, value, divider = true }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 18 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  title: { flex: 1, color: AppColors.neutral.black, fontFamily: AppFonts.button, fontSize: 17, lineHeight: 24 },
  description: { color: AppColors.neutral.description, fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 20 },
  row: { gap: 2, paddingTop: 10 },
  divider: { borderTopWidth: 1, borderTopColor: AppColors.border.soft },
  label: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: AppFontSizes.caption, lineHeight: 16 },
  value: { color: AppColors.neutral.text, fontFamily: AppFonts.label, fontSize: 15, lineHeight: 22 },
});
