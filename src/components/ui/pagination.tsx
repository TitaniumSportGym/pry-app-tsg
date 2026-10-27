import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPageTokens } from '@/hooks/use-pagination';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface PaginationProps {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  /** Plural noun for the summary, e.g. "rutinas" → "Mostrando 1–5 de 12 rutinas". */
  itemLabel: string;
  onPageChange: (page: number) => void;
}

/** Page controls for long lists; hidden when everything fits in one page. */
export function Pagination({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  totalItems,
  itemLabel,
  onPageChange,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ArrowButton
          disabled={page === 1}
          icon={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          label="Página anterior"
          onPress={() => onPageChange(page - 1)}
        />
        {getPageTokens(page, pageCount).map((token) =>
          typeof token === 'number' ? (
            <Pressable
              key={token}
              accessibilityLabel={`Página ${token}`}
              accessibilityRole="button"
              accessibilityState={{ selected: token === page }}
              hitSlop={4}
              style={({ pressed }) => [
                styles.page,
                token === page && styles.pageSelected,
                pressed && token !== page && styles.pressed,
              ]}
              onPress={() => onPageChange(token)}>
              <Text style={[styles.pageText, token === page && styles.pageTextSelected]}>
                {token}
              </Text>
            </Pressable>
          ) : (
            <Text key={token} importantForAccessibility="no" style={styles.ellipsis}>
              …
            </Text>
          ),
        )}
        <ArrowButton
          disabled={page === pageCount}
          icon={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          label="Página siguiente"
          onPress={() => onPageChange(page + 1)}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.summary}>
        Mostrando {rangeStart}–{rangeEnd} de {totalItems} {itemLabel}
      </Text>
    </View>
  );
}

interface ArrowButtonProps {
  disabled: boolean;
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}

function ArrowButton({ disabled, icon, label, onPress }: ArrowButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.page,
        styles.arrow,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}>
      <SymbolView name={icon} size={16} tintColor={AppColors.neutral.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: AppSpacing.two, paddingTop: AppSpacing.two },
  // 9 slots × 34 + gaps fit in a 350 pt wide content area (390 pt phone, 20 pt margins).
  row: { alignItems: 'center', flexDirection: 'row', gap: AppSpacing.one },
  page: {
    minWidth: 34,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  arrow: {
    borderWidth: 1,
    borderColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
  },
  pageSelected: { backgroundColor: AppColors.neutral.black },
  pageText: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  pageTextSelected: { color: AppColors.neutral.white },
  ellipsis: {
    width: 20,
    color: AppColors.neutral.placeholder,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    textAlign: 'center',
  },
  summary: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
