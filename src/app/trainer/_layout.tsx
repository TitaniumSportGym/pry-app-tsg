import AppTabs from '@/components/app-tabs';
import { TRAINER_TABS } from '@/features/navigation/models/role-tabs';

export default function TrainerLayout() {
  return <AppTabs tabs={TRAINER_TABS} />;
}
