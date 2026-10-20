import { useLocalSearchParams } from 'expo-router';

import { MembershipDetailView } from '@/features/memberships/views/membership-detail-view';

export default function TrainerMembershipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MembershipDetailView area="trainer" planId={id} />;
}
