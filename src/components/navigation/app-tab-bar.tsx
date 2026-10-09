import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

interface AppTabButtonProps extends TabTriggerSlotProps {
  icon: SymbolViewProps['name'];
  label: string;
}

export function AppTabBar() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBarContainer>
          <TabTrigger name="home" href="/" resetOnFocus asChild>
            <AppTabButton
              icon={{ ios: 'house.fill', android: 'home', web: 'home' }}
              label="Inicio"
            />
          </TabTrigger>
          <TabTrigger name="services" href="/services" resetOnFocus asChild>
            <AppTabButton
              icon={{ ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' }}
              label="Servicios"
            />
          </TabTrigger>
          <TabTrigger name="training" href="/training" resetOnFocus asChild>
            <AppTabButton
              icon={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }}
              label="Entrena"
            />
          </TabTrigger>
          <TabTrigger name="account" href="/account" resetOnFocus asChild>
            <AppTabButton
              icon={{
                ios: 'person.crop.circle.fill',
                android: 'account_circle',
                web: 'account_circle',
              }}
              label="Cuenta"
            />
          </TabTrigger>
        </TabBarContainer>
      </TabList>
    </Tabs>
  );
}

function AppTabButton({ icon, isFocused, label, ...props }: AppTabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && styles.tabButtonSelected,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={icon}
        size={22}
        tintColor={isFocused ? AppColors.neutral.white : AppColors.neutral.muted}
      />
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, isFocused && styles.tabLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TabBarContainer({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabList,
        {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
    paddingBottom: 64,
  },
  tabList: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.one,
    paddingHorizontal: AppSpacing.two,
    paddingTop: AppSpacing.two,
  },
  tabButton: {
    maxWidth: 112,
    height: 44,
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: AppSpacing.one,
    paddingHorizontal: 6,
  },
  tabButtonSelected: {
    backgroundColor: AppColors.brand.primary,
  },
  tabLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 10,
    lineHeight: 14,
  },
  tabLabelSelected: {
    color: AppColors.neutral.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
