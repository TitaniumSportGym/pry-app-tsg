import { router } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { ADMIN_SCAN_ACTION, ADMIN_TABS } from '@/features/navigation/models/role-tabs';

export default function AdminTabsLayout() {
  return (
    <AppTabs
      centerAction={{ ...ADMIN_SCAN_ACTION, onPress: () => router.push('/admin/scan') }}
      tabs={ADMIN_TABS}
    />
  );
}
