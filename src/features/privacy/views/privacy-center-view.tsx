import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { isArcoBackendEnabled } from '@/features/privacy/models/arco-config';
import { ArcoCenterView } from '@/features/privacy/views/arco-center-view';
import { usePrivacyCenterViewModel } from '@/features/privacy/viewmodels/use-privacy-center-view-model';
import { useAuth } from '@/hooks/use-auth';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

export function PrivacyCenterView() {
  const { status, user, role } = useAuth();
  if (status !== 'authenticated' || !user || !role) {
    return (
      <AppSectionScreen title="MIS DATOS Y PRIVACIDAD" description="Consulta tus datos y conoce tus derechos.">
        {status === 'loading' ? <LoadingState label="Verificando sesión…" /> : (
          <>
            <Text style={styles.paragraph}>Inicia sesión para consultar tus datos personales.</Text>
            <AppButton title="Iniciar sesión" onPress={() => router.push('/login')} />
          </>
        )}
      </AppSectionScreen>
    );
  }
  // Discard all personal data and pending edits when the authenticated account changes.
  return isArcoBackendEnabled()
    ? <ArcoCenterView key={`${user.id}:${role}`} />
    : <AuthenticatedPrivacyCenter key={`${user.id}:${role}`} />;
}

function AuthenticatedPrivacyCenter() {
  const vm = usePrivacyCenterViewModel();
  return (
    <AppSectionScreen
      title="MIS DATOS Y PRIVACIDAD"
      description="Acceso, rectificación, cancelación y oposición."
      onBack={vm.goBack}
      refreshing={vm.isRefreshing}
      onRefresh={vm.refresh}>
      {vm.isLoading ? <LoadingState label="Consultando tus datos…" /> : null}
      {!vm.isLoading && vm.errorMessage ? (
        <ErrorState message={vm.errorMessage} onRetry={vm.retry} />
      ) : null}
      {!vm.isLoading && !vm.errorMessage ? (
        <>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Acceso a tus datos</Text>
            <Text style={styles.paragraph}>
              Estos datos fueron consultados en tu cuenta. Las membresías, pagos y rutinas se consultan
              en sus secciones habituales; esta lista no es una copia de todo tu expediente.
            </Text>
            {vm.rows.map((row) => <DataRow key={row.label} {...row} />)}
            {vm.trainer ? (
              <>
                <DataRow label="Nombre completo" value={vm.trainer.fullName || 'No registrado'} />
                <DataRow label="Teléfono" value={vm.trainer.phone || 'No registrado'} />
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Rectificación</Text>
            {vm.trainer ? (
              <>
                <Text style={styles.paragraph}>
                  Puedes corregir tu nombre y teléfono de entrenador. Tu correo y rol no se cambian aquí.
                </Text>
                {vm.draft ? (
                  <>
                    <AppInput
                      accessibilityLabel="Nombre completo"
                      label="Nombre completo (opcional)"
                      leftIcon={{ ios: 'person', android: 'person', web: 'person' }}
                      value={vm.draft.fullName}
                      editable={!vm.isSaving}
                      maxLength={160}
                      error={vm.fieldErrors.fullName}
                      onChangeText={(value) => vm.setField('fullName', value)}
                    />
                    <AppInput
                      accessibilityLabel="Teléfono"
                      label="Teléfono (opcional)"
                      leftIcon={{ ios: 'phone', android: 'phone', web: 'phone' }}
                      keyboardType="phone-pad"
                      value={vm.draft.phone}
                      editable={!vm.isSaving}
                      maxLength={30}
                      error={vm.fieldErrors.phone}
                      onChangeText={(value) => vm.setField('phone', value)}
                    />
                    <AppButton
                      accessibilityLabel="Guardar cambios"
                      title="Guardar cambios"
                      loading={vm.isSaving}
                      onPress={() => void vm.save()}
                    />
                    <AppButton title="Cancelar edición" variant="outline" disabled={vm.isSaving} onPress={vm.cancelEdit} />
                  </>
                ) : <AppButton title="Editar nombre y teléfono" variant="outline" onPress={vm.beginEdit} />}
              </>
            ) : (
              <Text style={styles.paragraph}>
                La edición de tus datos de identificación aún no está disponible en la app. Puedes
                solicitar su rectificación al responsable mediante el canal ARCO del aviso.
              </Text>
            )}
            {vm.saveError ? <Text accessibilityRole="alert" style={styles.error}>{vm.saveError}</Text> : null}
            {vm.saveMessage ? <Text accessibilityRole="alert" style={styles.paragraph}>{vm.saveMessage}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Cancelación de cuenta</Text>
            <Text style={styles.paragraph}>
              La app aún no tramita la eliminación de cuentas. Puedes solicitarla mediante el canal
              ARCO del aviso. El responsable deberá verificar tu identidad y revisar tus membresías,
              pagos y registros sujetos a conservación. Abrir el correo no confirma una solicitud ni
              elimina tu cuenta.
            </Text>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Oposición a usos opcionales</Text>
            <Text style={styles.paragraph}>
              Aún no puedes administrar tus preferencias de promociones y encuestas desde la app.
              Esta pantalla no registra cambios de preferencias. Puedes ejercer oposición mediante
              el canal ARCO del aviso.
            </Text>
          </View>
          <AppButton title="Consultar aviso y canal ARCO" variant="outline" onPress={vm.openNotice} />
        </>
      ) : null}
    </AppSectionScreen>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.paragraph}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: AppColors.surface.soft,
    padding: AppSpacing.four,
    gap: AppSpacing.three,
  },
  row: { gap: AppSpacing.one },
  title: { fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.body, color: AppColors.neutral.text },
  label: { fontFamily: AppFonts.button, fontSize: AppFontSizes.caption, color: AppColors.neutral.muted },
  paragraph: { fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 22, color: AppColors.neutral.text },
  error: { fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 20, color: AppColors.feedback.error },
});
