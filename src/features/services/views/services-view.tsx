import { Pressable, StyleSheet } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { InfoListCard } from '@/components/ui/info-list-card';
import { useServicesViewModel } from '@/features/services/viewmodels/use-services-view-model';

export function ServicesView() {
  const viewModel = useServicesViewModel();

  return (
    <AppSectionScreen title="SERVICIOS" description="Todo lo que Titanium Sport Gym tiene para ti.">
      {viewModel.options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityLabel={option.title}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
          onPress={() => viewModel.openService(option.id)}>
          <InfoListCard description={option.description} icon={option.icon} title={option.title} />
        </Pressable>
      ))}
    </AppSectionScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
});
