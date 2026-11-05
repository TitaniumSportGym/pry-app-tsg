import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACK_ICON } from '@/components/ui/icon-button';
import { AppColors, AppFonts, AppFontSizes, AppShadows } from '@/theme/tokens';

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

export type PillTone = 'success' | 'error' | 'brand' | 'neutral';

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <View style={[styles.pill, pillStyles[tone]]}>
      <Text numberOfLines={1} style={[styles.pillText, pillTextStyles[tone]]}>
        {label}
      </Text>
    </View>
  );
}

interface IconTileProps {
  icon: SymbolViewProps['name'];
  size?: number;
  iconSize?: number;
  background?: string;
  color?: string;
}

export function IconTile({
  icon,
  size = 40,
  iconSize = 19,
  background = AppColors.surface.softSelected,
  color = AppColors.brand.primary,
}: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size >= 38 ? 12 : 10, backgroundColor: background },
      ]}>
      <SymbolView name={icon} size={iconSize} tintColor={color} />
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

export function AdminCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface AdminSubHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

/** Encabezado de pantallas internas (48, 51, 52): regreso con borde + título Bebas 34. */
export function AdminSubHeader({ title, subtitle, onBack }: AdminSubHeaderProps) {
  return (
    <View style={styles.subHeader}>
      <Pressable
        accessibilityLabel="Regresar"
        accessibilityRole="button"
        hitSlop={4}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        onPress={onBack}>
        <SymbolView name={BACK_ICON} size={20} tintColor={AppColors.neutral.text} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.subTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

interface AdminFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  optional?: boolean;
}

export function AdminField({ label, required = false, optional = false, multiline, ...props }: AdminFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={AppColors.neutral.placeholder}
        style={[styles.input, multiline && styles.inputMultiline, focused && styles.inputFocused]}
        textAlignVertical={multiline ? 'top' : 'center'}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        {...props}
      />
    </View>
  );
}

/** Barra inferior fija con la acción principal, para formularios. */
export function AdminActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
      {children}
    </View>
  );
}

/** Nota bajo el botón cuando guardar todavía no está disponible en el backend. */
export function PendingSaveNote() {
  return <Text style={styles.pendingSave}>Guardar estará disponible cuando el backend lo permita.</Text>;
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
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
  tile: { alignItems: 'center', justifyContent: 'center' },
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
  card: {
    borderRadius: 22,
    backgroundColor: AppColors.surface.default,
    boxShadow: AppShadows.card,
  },
  subHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingTop: 11,
    paddingBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: AppColors.border.default,
    borderRadius: 14,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.7 },
  field: { gap: 6 },
  fieldLabel: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.label,
    fontSize: 13,
    lineHeight: 20,
  },
  required: { color: AppColors.brand.primary },
  optional: { color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: 12 },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    backgroundColor: AppColors.surface.input,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    paddingHorizontal: 16,
  },
  inputMultiline: { minHeight: 80, paddingTop: 14, paddingBottom: 14 },
  inputFocused: { borderColor: AppColors.brand.primary, backgroundColor: AppColors.surface.default },
  actionBar: {
    gap: 10,
    backgroundColor: AppColors.surface.default,
    paddingHorizontal: 20,
    paddingTop: 14,
    boxShadow: '0 -6px 20px rgba(15, 15, 15, 0.08)',
  },
  pendingSave: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});

const pillStyles = StyleSheet.create({
  success: { backgroundColor: AppColors.feedback.successSoft },
  error: { backgroundColor: AppColors.surface.softSelected },
  brand: { backgroundColor: AppColors.surface.softSelected },
  neutral: { backgroundColor: AppColors.surface.input },
});

const pillTextStyles = StyleSheet.create({
  success: { color: AppColors.feedback.success },
  error: { color: AppColors.feedback.error },
  brand: { color: AppColors.brand.primary },
  neutral: { color: AppColors.neutral.muted },
});
