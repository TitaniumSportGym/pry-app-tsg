import AppTabs from '@/components/app-tabs';
import { CLIENT_TABS } from '@/features/navigation/models/role-tabs';
import { useClientTabBadges } from '@/features/navigation/viewmodels/use-client-tab-badges';

export default function AppLayout() {
  const badges = useClientTabBadges();

  return <AppTabs badges={badges} tabs={CLIENT_TABS} />;
}
