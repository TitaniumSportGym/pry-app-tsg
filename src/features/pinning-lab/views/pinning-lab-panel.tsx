import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppColors, AppFonts, AppSpacing } from '@/theme/tokens';

import type { HealthCheckResult } from '../data/health-check';
import { resolvePinningLabIdentity } from '../models/pinning-lab';
import { usePinningLabViewModel } from '../viewmodels/use-pinning-lab-view-model';

export function PinningLabPanel() {
  const lab = resolvePinningLabIdentity(Platform.OS, Constants.executionEnvironment === ExecutionEnvironment.StoreClient, Constants.expoConfig);
  return lab ? <LabPanel variant={lab.variant} /> : null;
}

function resultMessage(result: HealthCheckResult | null) {
  switch (result?.kind) {
    case 'success': return 'Servidor disponible: HTTP 200. La conexión HTTPS se completó.';
    case 'http-error': return `El servidor respondió HTTP ${result.status}. Esta respuesta demuestra que se completó TLS.`;
    case 'connection-error': return 'Error de conexión. Puede deberse a TLS, red o tiempo de espera; este mensaje no confirma pinning. Consulta el diagnóstico ADB.';
    case 'configuration-error': return 'Configuración de laboratorio inválida. No se envió la petición.';
    case 'unexpected-response': return 'Respuesta inesperada de /health. No demuestra un rechazo por pinning.';
    default: return 'Ejecuta la comprobación sin iniciar sesión.';
  }
}

function LabPanel({ variant }: { variant: string }) {
  const [open, setOpen] = useState(false);
  const { result, running, run } = usePinningLabViewModel();

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? 'Cerrar laboratorio TLS' : 'Laboratorio TLS'}</Text>
      </Pressable>
      {open ? (
        <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Comprobación HTTPS</Text>
          <Text style={styles.text}>{variant}</Text>
          <Text style={styles.text}>GET server-titanium.onrender.com/health</Text>
          <Text style={styles.text}>Sin sesión ni datos personales. Pin temporal para esta demostración.</Text>
          <AppButton title="Comprobar conexión" loading={running} onPress={() => void run()} />
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{running ? 'Comprobando conexión…' : resultMessage(result)}</Text>
          <Text selectable style={styles.text}>ADB: adb logcat -s TitaniumPinningLab</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 36, left: 16, right: 16, zIndex: 100 },
  toggle: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: AppColors.neutral.black, borderRadius: 12 },
  toggleText: { color: AppColors.neutral.white, fontFamily: AppFonts.button },
  panel: { maxHeight: 360, backgroundColor: AppColors.surface.default, borderRadius: 16, borderWidth: 1, borderColor: AppColors.border.default },
  content: { padding: AppSpacing.three, gap: AppSpacing.two },
  title: { color: AppColors.neutral.text, fontFamily: AppFonts.button, fontSize: 18 },
  text: { color: AppColors.neutral.text, fontFamily: AppFonts.body, fontSize: 13, lineHeight: 19 },
});
