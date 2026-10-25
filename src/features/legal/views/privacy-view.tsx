import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AccordionItem } from '@/components/ui/accordion-item';
import { AppButton } from '@/components/ui/app-button';
import { useLegalViewModel } from '@/features/legal/viewmodels/use-legal-view-model';
import { LegalBlocks } from '@/features/legal/views/legal-blocks';
import { LegalScreen } from '@/features/legal/views/legal-screen';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

/** Screen 21 of the Figma: data cards, uses, ARCO rights and details over a pink background. */
export function PrivacyView() {
  const viewModel = useLegalViewModel('privacy');
  const { privacy } = viewModel;

  return (
    <LegalScreen
      background={AppColors.surface.default}
      caption={`Última actualización: ${privacy.updatedAt}`}
      title={privacy.title}
      onBack={viewModel.goBack}
    >
      <Text style={styles.paragraph}>{privacy.intro}</Text>

      <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.subtitle}>
          Qué datos usamos
        </Text>
        <Text style={styles.paragraph}>{privacy.dataCategoriesIntro}</Text>
        <View style={styles.grid}>
          {privacy.dataCategories.map((category) => (
            <View key={category.title} style={styles.dataCard}>
              <View style={styles.dataIcon}>
                <SymbolView name={category.icon} size={19} tintColor={AppColors.brand.primary} />
              </View>
              <Text style={styles.dataTitle}>{category.title}</Text>
              <Text style={styles.dataDescription}>{category.description}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>{privacy.sensitiveDataNote}</Text>
      </View>

      <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.subtitle}>
          Para qué los usamos
        </Text>
        <View style={styles.card}>
          {privacy.purposes.map((purpose, index) => (
            <View
              key={purpose}
              style={[styles.purpose, index < privacy.purposes.length - 1 && styles.divider]}
            >
              <View style={styles.check}>
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={13}
                  tintColor={AppColors.feedback.success}
                />
              </View>
              <Text style={styles.purposeText}>{purpose}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>{privacy.secondaryPurposes}</Text>
      </View>

      <View style={styles.arco}>
        <View pointerEvents="none" style={styles.decoration} />
        <View style={styles.arcoHeader}>
          <View style={styles.arcoIcon}>
            <SymbolView
              name={{ ios: 'shield', android: 'shield', web: 'shield' }}
              size={20}
              tintColor={AppColors.neutral.white}
            />
          </View>
          <View>
            <Text style={styles.overline}>TUS DERECHOS</Text>
            <Text accessibilityRole="header" style={styles.arcoTitle}>
              Derechos ARCO
            </Text>
          </View>
        </View>
        <View style={styles.chips}>
          {privacy.arco.rights.map((right) => (
            <Text key={right} style={styles.chip}>
              {right}
            </Text>
          ))}
        </View>
        <Text style={styles.onDark}>{privacy.arco.description}</Text>
        <Text style={styles.onDark}>{privacy.arco.requestIntro}</Text>
        {privacy.arco.requirements.map((requirement) => (
          <View key={requirement} style={styles.requirement}>
            <Text style={styles.requirementBullet}>•</Text>
            <Text style={[styles.onDark, styles.requirementText]}>{requirement}</Text>
          </View>
        ))}
        <Text style={styles.onDark}>{privacy.arco.response}</Text>
        <AppButton
          accessibilityHint="Abre tu app de correo con la solicitud dirigida al gimnasio"
          title="Ejercer mis derechos"
          onPress={() => void viewModel.contactArco()}
        />
      </View>

      <View style={[styles.card, styles.details]}>
        {privacy.details.map((section, index) => (
          <AccordionItem
            key={section.title}
            isLast={index === privacy.details.length - 1}
            title={section.title}
          >
            <LegalBlocks blocks={section.blocks} />
          </AccordionItem>
        ))}
      </View>

      <AppButton title="Ver en el sitio web" variant="outline" onPress={viewModel.openWebsite} />
    </LegalScreen>
  );
}

const CARD_SHADOW = '0 5px 10px rgba(15, 15, 15, 0.1)';

const styles = StyleSheet.create({
  paragraph: {
    color: AppColors.neutral.description,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  block: { gap: 12 },
  subtitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.button,
    fontSize: 17,
    lineHeight: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dataCard: {
    minWidth: 140,
    flexBasis: '45%',
    flexGrow: 1,
    gap: AppSpacing.two,
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: CARD_SHADOW,
    padding: 14,
  },
  dataIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataTitle: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  dataDescription: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  note: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 17,
  },
  card: {
    borderRadius: 20,
    backgroundColor: AppColors.surface.default,
    boxShadow: CARD_SHADOW,
    paddingHorizontal: AppSpacing.three,
    paddingVertical: 6,
  },
  purpose: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: AppColors.border.soft },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppColors.feedback.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeText: {
    flex: 1,
    color: AppColors.neutral.text,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  arco: {
    overflow: 'hidden',
    gap: 12,
    borderRadius: 24,
    backgroundColor: AppColors.neutral.black,
    padding: 20,
  },
  decoration: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: AppColors.surface.darkElevated,
  },
  arcoHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  arcoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  arcoTitle: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: AppColors.surface.darkSelected,
    color: AppColors.neutral.white,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: AppSpacing.two,
    paddingVertical: 5,
  },
  onDark: {
    color: AppColors.neutral.mutedOnDark,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  requirement: { flexDirection: 'row', gap: AppSpacing.two },
  requirementBullet: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
  },
  requirementText: { flex: 1 },
  details: { paddingVertical: AppSpacing.one },
});
