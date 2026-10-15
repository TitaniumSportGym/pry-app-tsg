import AppTabs from '@/components/app-tabs';
import { ADMIN_TABS } from '@/features/navigation/models/role-tabs';

export default function AdminLayout() {
  return <AppTabs tabs={ADMIN_TABS} />;
}
