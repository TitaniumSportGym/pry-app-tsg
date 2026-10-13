import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { useHomeViewModel } from '@/features/home/viewmodels/use-home-view-model';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const MEMBERSHIP = {
  title: 'Membresia Titanium',
  description: 'Acceso completo para entrenar con libertad y constancia.',
  price: '$499 / mes',
};

const PRODUCTS: { image: number; name: string; detail: string; price: string }[] = [
  {
    name: 'Proteina Titanium',
    detail: 'Rendimiento y recuperacion',
    price: '$699',
    image: require('@/assets/images/imagesTSG/product-protein.png'),
  },
  {
    name: 'Botella TSG',
    detail: 'Hidratacion en cada serie',
    price: '$249',
    image: require('@/assets/images/imagesTSG/product-bottle.png'),
  },
  {
    name: 'Guantes Titanium',
    detail: 'Agarre y proteccion',
    price: '$399',
    image: require('@/assets/images/imagesTSG/product-gloves.png'),
  },
];

export function HomeView() {
  const viewModel = useHomeViewModel();
  const insets = useSafeAreaInsets();
  const [reveal] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 650,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [reveal]);

  const contentAnimation = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + AppSpacing.five }]}>
          <Image
            accessibilityLabel="Interior del gimnasio Titanium Sport Gym"
            contentFit="cover"
            contentPosition="right center"
            source={require('@/assets/images/imagesTSG/SliderTitanuim.jpg')}
            style={styles.headerImage}
          />
          <View style={styles.headerShade} />
          <View style={styles.headerTop}>
            <View accessibilityLabel="Avatar del usuario" style={styles.avatarContainer}>
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                size={27}
                tintColor={AppColors.neutral.white}
              />
            </View>
            <View style={styles.greetingCopy}>
              <Text style={styles.eyebrow}>TITANIUM SPORT GYM</Text>
              <Text style={styles.greeting}>
                {viewModel.isAuthenticated ? `Hola, ${viewModel.displayName}` : 'Hola, invitado'}
              </Text>
            </View>
            <View style={styles.notification}>
              <SymbolView
                name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                size={20}
                tintColor={AppColors.neutral.white}
              />
            </View>
          </View>
          <Text style={styles.headerTitle}>Tu mejor version empieza hoy</Text>
          <Text style={styles.headerDescription}>
            Entrena con disciplina, equipa tu rutina y alcanza tus objetivos.
          </Text>
        </View>

        <Animated.View style={[styles.content, contentAnimation]}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Membresia destacada</Text>
              <Text style={styles.sectionDescription}>Todo lo que necesitas para entrenar en Titanium.</Text>
            </View>
            <SymbolView
              name={{ ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }}
              size={25}
              tintColor={AppColors.brand.primary}
            />
          </View>

          <View style={styles.membershipCard}>
            <View style={styles.membershipAccent} />
            <View style={styles.membershipCopy}>
              <Text style={styles.membershipEyebrow}>MEMBRESIA</Text>
              <Text style={styles.membershipTitle}>{MEMBERSHIP.title}</Text>
              <Text style={styles.membershipDescription}>{MEMBERSHIP.description}</Text>
              <Text style={styles.membershipPrice}>{MEMBERSHIP.price}</Text>
            </View>
            <AppButton
              title={viewModel.isAuthenticated ? 'Ver mi cuenta' : 'Comenzar'}
              variant="primary"
              onPress={viewModel.openPrimaryAction}
              style={styles.membershipButton}
            />
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Productos Titanium</Text>
              <Text style={styles.sectionDescription}>Complementa cada entrenamiento.</Text>
            </View>
            <Text style={styles.seeAll}>Ver mas</Text>
          </View>

          <ScrollView horizontal contentContainerStyle={styles.productList} showsHorizontalScrollIndicator={false}>
            {PRODUCTS.map((product) => (
              <View key={product.name} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  <Image
                    accessibilityLabel={product.name}
                    contentFit="contain"
                    source={product.image}
                    style={styles.productImage}
                  />
                </View>
                <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
                <Text numberOfLines={2} style={styles.productDetail}>{product.detail}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.quoteCard}>
            <SymbolView
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              size={24}
              tintColor={AppColors.brand.primary}
            />
            <View style={styles.quoteCopy}>
              <Text style={styles.quoteTitle}>Fuerza. Disciplina. Resultados.</Text>
              <Text style={styles.quoteDescription}>Cada sesion cuenta. Sigue avanzando.</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.neutral.black },
  scrollContent: { flexGrow: 1, backgroundColor: AppColors.surface.soft, paddingBottom: 112 },
  header: { minHeight: 270, overflow: 'hidden', backgroundColor: AppColors.neutral.black, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: AppSpacing.two, justifyContent: 'flex-start', paddingHorizontal: AppSpacing.four, paddingBottom: AppSpacing.four },
  headerImage: { ...StyleSheet.absoluteFill, opacity: 0.62 },
  headerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16,16,16,0.54)' },
  headerTop: { zIndex: 1, alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatarContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: AppColors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  greetingCopy: { minWidth: 0, flex: 1 },
  eyebrow: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 10, lineHeight: 14 },
  greeting: { marginTop: 2, color: AppColors.neutral.white, fontFamily: AppFonts.emphasis, fontSize: 19, lineHeight: 24 },
  notification: { width: 42, height: 42, borderWidth: 1, borderColor: '#686868', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { zIndex: 1, marginTop: AppSpacing.two, color: AppColors.neutral.white, fontFamily: AppFonts.display, fontSize: 30, lineHeight: 34 },
  headerDescription: { zIndex: 1, color: 'rgba(255,255,255,0.82)', fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 18 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: AppSpacing.three, padding: AppSpacing.four },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: AppSpacing.three },
  sectionTitle: { color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: 19, lineHeight: 24 },
  sectionDescription: { marginTop: 3, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 18 },
  membershipCard: { minHeight: 208, overflow: 'hidden', borderRadius: 20, backgroundColor: AppColors.neutral.black, padding: AppSpacing.three },
  membershipAccent: { width: 44, height: 5, borderRadius: 4, backgroundColor: AppColors.brand.primary, marginBottom: AppSpacing.three },
  membershipCopy: { minWidth: 0 },
  membershipEyebrow: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: 11, lineHeight: 16 },
  membershipTitle: { marginTop: 3, color: AppColors.neutral.white, fontFamily: AppFonts.emphasis, fontSize: 21, lineHeight: 26 },
  membershipDescription: { maxWidth: 300, marginTop: 5, color: AppColors.neutral.mutedOnDark, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 17 },
  membershipPrice: { marginTop: 10, color: AppColors.neutral.white, fontFamily: AppFonts.emphasis, fontSize: 18, lineHeight: 23 },
  membershipButton: { marginTop: AppSpacing.three },
  seeAll: { color: AppColors.brand.primary, fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, lineHeight: 17 },
  productList: { gap: 12, paddingRight: AppSpacing.four },
  productCard: { width: 156, minHeight: 222, borderRadius: 16, backgroundColor: AppColors.surface.default, padding: AppSpacing.three, shadowColor: AppColors.neutral.black, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  productImageContainer: { width: '100%', height: 96, borderRadius: 12, backgroundColor: AppColors.surface.softSelected, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '82%', height: '92%' },
  productName: { marginTop: 12, color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.label, lineHeight: 19 },
  productDetail: { flex: 1, marginTop: 4, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: 11, lineHeight: 16 },
  productPrice: { marginTop: 10, color: AppColors.brand.primary, fontFamily: AppFonts.emphasis, fontSize: 17, lineHeight: 21 },
  quoteCard: { minHeight: 76, borderWidth: 1, borderColor: AppColors.border.default, borderRadius: 16, backgroundColor: AppColors.surface.default, alignItems: 'center', flexDirection: 'row', gap: AppSpacing.three, padding: AppSpacing.three },
  quoteCopy: { minWidth: 0, flex: 1 },
  quoteTitle: { color: AppColors.neutral.text, fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.label, lineHeight: 20 },
  quoteDescription: { marginTop: 2, color: AppColors.neutral.muted, fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 17 },
});
