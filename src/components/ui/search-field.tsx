import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

interface SearchFieldProps {
  value: string;
  placeholder: string;
  maxLength: number;
  onChangeText: (value: string) => void;
}

export function SearchField({ value, placeholder, maxLength, onChangeText }: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={20}
        tintColor={AppColors.neutral.muted}
      />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={AppColors.neutral.placeholder}
        returnKeyType="search"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Borrar búsqueda"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeText('')}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={18}
            tintColor={AppColors.neutral.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 18,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppSpacing.two,
    paddingHorizontal: AppSpacing.three,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.body,
  },
});
