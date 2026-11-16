import { StyleSheet, Text, View } from 'react-native';

import { BACK_ICON, IconButton } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

interface SubHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

/**
 * Encabezado de pantallas internas, igual que `PageHeader`: flecha de regreso sin marco
 * (IconButton + BACK_ICON) y título en Bebas con subtítulo opcional.
 */
export function SubHeader({ title, subtitle, onBack }: SubHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton icon={BACK_ICON} label="Regresar" style={styles.back} onPress={onBack} />
      <View style={styles.copy}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingTop: 11, paddingBottom: 14 },
  // Alinea el ícono con el borde del contenido sin perder el área táctil de 44 pt.
  back: { marginLeft: -10 },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  subtitle: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
});
