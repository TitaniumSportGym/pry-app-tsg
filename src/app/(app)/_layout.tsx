import AppTabs from '@/components/app-tabs';
import { CLIENT_TABS } from '@/features/navigation/models/role-tabs';

export default function AppLayout() {
  return <AppTabs tabs={CLIENT_TABS} />;
}
