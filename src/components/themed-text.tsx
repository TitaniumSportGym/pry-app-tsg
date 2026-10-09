import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppColors, AppFonts, AppFontSizes } from '@/theme/tokens';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  default: {
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
    lineHeight: 24,
  },
  title: {
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.sectionTitle,
    lineHeight: 34,
  },
  link: {
    fontFamily: AppFonts.label,
    lineHeight: 30,
    fontSize: AppFontSizes.label,
  },
  linkPrimary: {
    fontFamily: AppFonts.label,
    lineHeight: 30,
    fontSize: AppFontSizes.label,
    color: AppColors.brand.primary,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
