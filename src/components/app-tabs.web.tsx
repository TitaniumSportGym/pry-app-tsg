import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel="Inicio"
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: 'house.fill', android: 'home', web: 'home' }}
        size={21}
        tintColor={isFocused ? AppColors.brand.primary : AppColors.neutral.muted}
      />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelSelected]}>Inicio</Text>
    </Pressable>
  );
}

function CustomTabList({ children, ...props }: TabListProps) {
  return (
    <View {...props} style={styles.tabList}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
    paddingBottom: 66,
  },
  tabList: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 66,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.default,
    backgroundColor: AppColors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabButton: {
    width: 88,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.one,
  },
  tabLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: AppFontSizes.caption,
    lineHeight: 16,
  },
  tabLabelSelected: {
    color: AppColors.brand.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
