import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={AppColors.brand.primary} size="large" />
      <Text style={styles.description}>{label}</Text>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <SymbolView
        name={{ ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' }}
        size={36}
        tintColor={AppColors.feedback.error}
      />
      <Text accessibilityRole="alert" style={styles.title}>
        {message}
      </Text>
      {onRetry ? (
        <AppButton style={styles.action} title="Reintentar" variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  description: string;
  icon: SymbolViewProps['name'];
  title: string;
}

export function EmptyState({ description, icon, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <SymbolView name={icon} size={36} tintColor={AppColors.brand.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.two,
    paddingVertical: AppSpacing.five,
  },
  title: {
    maxWidth: 340,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: AppFontSizes.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  description: {
    maxWidth: 340,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: { alignSelf: 'stretch', marginTop: AppSpacing.two },
});
