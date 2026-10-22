import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useLegalViewModel } from '@/features/legal/viewmodels/use-legal-view-model';
import { LegalBlocks } from '@/features/legal/views/legal-blocks';
import { LegalScreen } from '@/features/legal/views/legal-screen';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

/** Screen 20 of the Figma: numbered sections over a white background. */
export function TermsView() {
  const viewModel = useLegalViewModel('terms');
  const { terms } = viewModel;

  return (
    <LegalScreen
      background={AppColors.surface.default}
      title={terms.title}
      onBack={viewModel.goBack}
    >
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <SymbolView
            name={{ ios: 'doc.text', android: 'description', web: 'description' }}
            size={20}
            tintColor={AppColors.brand.primary}
          />
        </View>
        <Text style={styles.summaryText}>{terms.summary}</Text>
      </View>

      {terms.sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </Text>
          </View>
          <LegalBlocks
            blocks={section.blocks}
            onOpenPrivacy={viewModel.openPrivacy}
          />
        </View>
      ))}

      <Text style={styles.closingNote}>{terms.closingNote}</Text>

      <AppButton title="Ver en el sitio web" variant="outline" onPress={viewModel.openWebsite} />
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: 20,
    backgroundColor: AppColors.surface.soft,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  section: { gap: AppSpacing.two },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  number: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.display,
    fontSize: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    flex: 1,
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  closingNote: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
