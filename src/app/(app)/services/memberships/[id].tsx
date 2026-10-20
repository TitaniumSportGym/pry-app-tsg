import { useLocalSearchParams } from 'expo-router';

import { MembershipDetailView } from '@/features/memberships/views/membership-detail-view';

export default function MembershipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MembershipDetailView area="client" planId={id} />;
}
