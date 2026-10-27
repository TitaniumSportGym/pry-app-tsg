import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { useCartViewModel } from '@/features/cart/viewmodels/use-cart-view-model';
import { CartItemRow } from '@/features/cart/views/cart-item-row';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const TOTAL_BAR_HEIGHT = 84;

/** Screen 12 · Carrito. */
export function CartView() {
  const viewModel = useCartViewModel();
  const insets = useSafeAreaInsets();
  const showTotal = !viewModel.requiresLogin && !viewModel.isEmpty;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (showTotal ? TOTAL_BAR_HEIGHT : 0) + 112 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            CARRITO
          </Text>
        </View>

        {viewModel.requiresLogin ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name={{ ios: 'lock', android: 'lock', web: 'lock' }}
                size={34}
                tintColor={AppColors.brand.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Inicia sesión para usar tu carrito</Text>
            <Text style={styles.emptyDescription}>
              Tu carrito se guarda en tu cuenta. Entra para agregar productos y comprarlos.
            </Text>
            <View style={styles.gateActions}>
              <AppButton title="Iniciar sesión" onPress={viewModel.openLogin} />
              <AppButton title="Crear cuenta" variant="outline" onPress={viewModel.openRegister} />
            </View>
          </View>
        ) : viewModel.isEmpty ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }}
                size={36}
                tintColor={AppColors.brand.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.emptyDescription}>
              Agrega productos desde la tienda para verlos aquí.
            </Text>
            <AppButton
              style={styles.emptyButton}
              title="Ir a la tienda"
              onPress={viewModel.openStore}
            />
          </View>
        ) : (
          viewModel.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onDecrease={viewModel.decrease}
              onIncrease={viewModel.increase}
              onOpen={viewModel.openProduct}
              onRemove={viewModel.remove}
            />
          ))
        )}
      </ScrollView>

      {showTotal ? (
        <View style={[styles.totalBar, { bottom: insets.bottom }]}>
          <View style={styles.totalCopy}>
            <Text style={styles.totalLabel}>{viewModel.countLabel}</Text>
            <Text style={styles.totalAmount}>{viewModel.total}</Text>
          </View>
          <View style={styles.payColumn}>
            <View
              accessible
              accessibilityLabel="Pagar, próximamente"
              accessibilityState={{ disabled: true }}
              style={styles.payButton}
            >
              <Text style={styles.payText}>PAGAR</Text>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface.default },
  content: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 1,
    alignSelf: 'center',
    gap: AppSpacing.three,
    paddingHorizontal: 20,
    paddingTop: AppSpacing.three,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  title: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.display,
    fontSize: AppFontSizes.hero,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  emptyCard: {
    alignItems: 'center',
    gap: AppSpacing.two,
    borderWidth: 1,
    borderColor: AppColors.border.soft,
    borderRadius: 24,
    padding: AppSpacing.five,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    marginBottom: AppSpacing.two,
    borderRadius: 42,
    backgroundColor: AppColors.surface.softSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: AppColors.neutral.text,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  emptyDescription: {
    maxWidth: 320,
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyButton: { alignSelf: 'stretch', marginTop: AppSpacing.three },
  gateActions: { alignSelf: 'stretch', gap: 10, marginTop: AppSpacing.three },
  totalBar: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: TOTAL_BAR_HEIGHT,
    backgroundColor: AppColors.surface.muted,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  totalCopy: { flex: 1 },
  totalLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.body,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  totalAmount: {
    color: AppColors.neutral.black,
    fontFamily: AppFonts.emphasis,
    fontSize: 20,
    lineHeight: 26,
  },
  payColumn: { alignItems: 'center', gap: AppSpacing.one },
  payButton: {
    width: 150,
    height: 50,
    borderRadius: 18,
    backgroundColor: AppColors.brand.primary,
    opacity: 0.56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: AppColors.neutral.white,
    fontFamily: AppFonts.button,
    fontSize: AppFontSizes.label,
    letterSpacing: 0.6,
  },
});
