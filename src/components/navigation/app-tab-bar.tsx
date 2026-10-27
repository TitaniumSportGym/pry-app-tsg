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

import { TabBadge } from '@/components/navigation/tab-badge';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

/** Height of the tab bar without the bottom safe area. */
export const TAB_BAR_HEIGHT = 64;

export interface AppTab {
  name: string;
  href: Href;
  label: string;
  icon: SymbolViewProps['name'];
}

interface AppTabBarProps {
  tabs: readonly AppTab[];
  /** Counters shown over a tab icon, keyed by tab name (e.g. { cart: 3 }). */
  badges?: Partial<Record<string, number>>;
}

interface AppTabButtonProps extends Omit<TabTriggerSlotProps, 'ref'> {
  icon: SymbolViewProps['name'];
  label: string;
  badge?: number;
}

export function AppTabBar({ tabs, badges }: AppTabBarProps) {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBarContainer>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} resetOnFocus asChild>
              <AppTabButton badge={badges?.[tab.name]} icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </TabBarContainer>
      </TabList>
    </Tabs>
  );
}

function AppTabButton({ badge = 0, icon, isFocused, label, ...props }: AppTabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={
        badge > 0 ? `${label}, ${badge} ${badge === 1 ? 'producto' : 'productos'}` : label
      }
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <View style={[styles.indicator, isFocused && styles.indicatorSelected]} />
      <View>
        <SymbolView
          name={icon}
          size={22}
          tintColor={isFocused ? AppColors.brand.primary : AppColors.neutral.muted}
        />
        <TabBadge count={badge} />
      </View>
      <Text numberOfLines={1} style={[styles.tabLabel, isFocused && styles.tabLabelSelected]}>
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
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
    paddingBottom: TAB_BAR_HEIGHT,
  },
  tabList: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.soft,
    backgroundColor: AppColors.surface.default,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: AppSpacing.two,
  },
  tabButton: {
    maxWidth: 120,
    height: TAB_BAR_HEIGHT,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: 'transparent',
  },
  indicatorSelected: {
    backgroundColor: AppColors.brand.primary,
  },
  tabLabel: {
    color: AppColors.neutral.muted,
    fontFamily: AppFonts.label,
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelSelected: {
    color: AppColors.brand.primary,
    fontFamily: AppFonts.button,
  },
  pressed: {
    opacity: 0.7,
  },
});
