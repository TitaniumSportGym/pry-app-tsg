import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import type { StatusTone } from '@/features/trainer/models/trainer-routine';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

/** Las mismas portadas de respaldo que las rutinas del socio. */
const COVER_PLACEHOLDERS = [
  require('@/assets/images/routines/routine-cover-dark.svg'),
  require('@/assets/images/routines/routine-cover-red.svg'),
];

const PILL_TONES: Record<StatusTone, PillTone> = {
  neutral: 'neutral',
  warning: 'warning',
  success: 'success',
  error: 'error',
};

export function RoutineStatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return <StatusPill label={label.toUpperCase()} tone={PILL_TONES[tone]} />;
}

interface RoutineCoverProps {
  imageUrl: string | null;
  /** Alterna la portada de respaldo de las rutinas sin foto. */
  index?: number;
  height?: number;
  tags: string[];
  status?: { label: string; tone: StatusTone };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Portada oscura con etiquetas y estado (tarjetas 77 y portada de los detalles 86–88). */
export function RoutineCover({ imageUrl, index = 0, height = 112, tags, status, children, style }: RoutineCoverProps) {
  return (
    <View style={[styles.cover, { height }, style]}>
      <Image
        contentFit="cover"
        source={imageUrl ? { uri: imageUrl } : COVER_PLACEHOLDERS[index % COVER_PLACEHOLDERS.length]}
        style={StyleSheet.absoluteFill}
        transition={150}
      />
      <View style={styles.coverTop}>
        <View style={styles.tags}>
          {tags.filter(Boolean).map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag.toUpperCase()}
            </Text>
          ))}
        </View>
        {status ? <RoutineStatusPill label={status.label} tone={status.tone} /> : null}
      </View>
      {children}
    </View>
  );
}

export function MetricBox({ icon, label, value }: { icon: SymbolViewProps['name']; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <SymbolView name={icon} size={15} tintColor={AppColors.brand.primary} />
      <Text numberOfLines={1} style={styles.metricLabel}>
        {label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

export const ICONS = {
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' },
  layers: { ios: 'square.stack.3d.up', android: 'layers', web: 'layers' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  link: { ios: 'link', android: 'link', web: 'link' },
  video: { ios: 'video', android: 'videocam', web: 'videocam' },
  image: { ios: 'photo', android: 'image', web: 'image' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  alert: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  clipboard: { ios: 'list.bullet.clipboard', android: 'assignment', web: 'assignment' },
  upload: { ios: 'arrow.up', android: 'upload', web: 'upload' },
  hourglass: { ios: 'hourglass', android: 'hourglass_top', web: 'hourglass_top' },
  person: { ios: 'person', android: 'person', web: 'person' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
} satisfies Record<string, SymbolViewProps['name']>;

const styles = StyleSheet.create({
  cover: { overflow: 'hidden', backgroundColor: AppColors.surface.dark, padding: 14 },
  coverTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: AppColors.surface.darkSelected,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metric: {
    minWidth: 0,
    flex: 1,
    gap: 2,
    borderRadius: 12,
    backgroundColor: AppColors.surface.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: { color: AppColors.neutral.muted, fontFamily: AppFonts.label, fontSize: 11, letterSpacing: 0.8, lineHeight: 14 },
  metricValue: { color: AppColors.neutral.black, fontFamily: AppFonts.label, fontSize: AppFontSizes.label, lineHeight: 20 },
});
