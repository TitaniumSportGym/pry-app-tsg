import type { Href } from 'expo-router';
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

export interface AppTab {
  name: string;
  href: Href;
  label: string;
  icon: SymbolViewProps['name'];
}

interface AppTabBarProps {
  tabs: readonly AppTab[];
}

interface AppTabButtonProps extends TabTriggerSlotProps {
  icon: SymbolViewProps['name'];
  label: string;
}

export function AppTabBar({ tabs }: AppTabBarProps) {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBarContainer>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} resetOnFocus asChild>
              <AppTabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
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
