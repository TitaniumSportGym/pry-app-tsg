import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { SectionHeader } from '@/components/ui/section-header';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

/** "Clases de hoy" has no endpoint yet; the section is visible but disabled. */
export function ClassesComingSoon() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Clases de hoy" actionLabel="Ver horario" />
      <View style={styles.card}>
        <View style={styles.icon}>
          <SymbolView
            name={{ ios: 'calendar.badge.clock', android: 'event_available', web: 'event_available' }}
            size={24}
            tintColor={AppColors.neutral.placeholder}
          />
        </View>
        <View style={styles.copy}>
          <ComingSoonBadge />
          <Text style={styles.title}>Reserva tus clases desde la app</Text>
          <Text style={styles.description}>
            Muy pronto podrás ver el horario y apartar tu lugar en Spinning, HIIT y más.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppSpacing.three },
  card: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: AppColors.border.default,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.three,
    padding: AppSpacing.three,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: AppColors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: AppSpacing.one },
  title: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  description: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
});
