import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppSectionScreen } from '@/components/layout/app-section-screen';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useArcoCenterViewModel } from '@/features/privacy/viewmodels/use-arco-center-view-model';
import { cancellationStatusLabels } from '@/features/privacy/models/arco-contracts';
import { AppColors, AppFonts, AppFontSizes, AppSpacing } from '@/theme/tokens';

const PURPOSE_LABELS = {
  promotional_communications: 'No recibir promociones',
  satisfaction_surveys: 'No participar en encuestas opcionales',
};

export function ArcoCenterView() {
  const vm = useArcoCenterViewModel();
  const busy = vm.busy !== null;
  return (
    <AppSectionScreen title="MIS DATOS Y PRIVACIDAD" description="Acceso, rectificación, cancelación y oposición."
      onBack={vm.goBack} refreshing={vm.isRefreshing} onRefresh={vm.refresh}>
      {vm.isLoading ? <LoadingState label="Consultando tus datos…" /> : null}
      {!vm.isLoading && vm.loadError ? <ErrorState message={vm.loadError} onRetry={vm.retryProfile} /> : null}
      {!vm.isLoading && !vm.loadError && vm.profile ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Acceso a tus datos</Text>
          <Text style={styles.text}>Membresías, pagos y rutinas se consultan en sus secciones habituales. Esta lista no es una copia completa de tu expediente.</Text>
          {vm.rows.map((row) => <View key={row.label}><Text style={styles.label}>{row.label}</Text><Text selectable style={styles.text}>{row.value}</Text></View>)}
          <Text style={styles.label}>Nombre completo</Text><Text style={styles.text}>{vm.profile.fullName ?? 'No registrado'}</Text>
          <Text style={styles.label}>Teléfono</Text><Text style={styles.text}>{vm.profile.phone ?? 'No registrado'}</Text>
          <Text accessibilityRole="header" style={styles.title}>Rectificación</Text>
          <Text style={styles.text}>Puedes corregir tu nombre y teléfono. Tu correo y rol no se cambian aquí.</Text>
          {vm.draft ? (
            <>
              <AppInput accessibilityLabel="Nombre completo" label="Nombre completo (opcional)"
                leftIcon={{ ios: 'person', android: 'person', web: 'person' }} value={vm.draft.fullName}
                maxLength={160} editable={!busy} error={vm.fieldErrors.fullName} onChangeText={(value) => vm.setField('fullName', value)} />
              <AppInput accessibilityLabel="Teléfono" label="Teléfono (opcional)"
                leftIcon={{ ios: 'phone', android: 'phone', web: 'phone' }} value={vm.draft.phone}
                maxLength={30} keyboardType="phone-pad" editable={!busy} error={vm.fieldErrors.phone} onChangeText={(value) => vm.setField('phone', value)} />
              <AppButton title="Guardar cambios" disabled={busy} loading={vm.busy === 'profile'} onPress={() => void vm.save()} />
              <AppButton title="Cancelar edición" variant="outline" disabled={busy} onPress={vm.cancelEdit} />
            </>
          ) : <AppButton title="Editar nombre y teléfono" variant="outline" disabled={busy} onPress={vm.beginEdit} />}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Consentimiento del aviso</Text>
        {vm.noticeLoading ? <LoadingState label="Consultando aviso aprobado…" /> : null}
        {vm.noticeError ? <ErrorState message={vm.noticeError} onRetry={vm.retryNotice} /> : null}
        {vm.notice && !vm.noticeError ? (
          <>
            <Text style={styles.text}>Versión del aviso: {vm.notice.version}</Text>
            <AppButton title="Consultar aviso aprobado" variant="outline" onPress={() => void vm.openApprovedNotice()} />
            <Pressable accessibilityRole="checkbox" accessibilityLabel="Acepto esta versión del aviso de privacidad"
              accessibilityState={{ checked: vm.privacyAccepted, disabled: busy }} disabled={busy}
              style={styles.choice} onPress={() => vm.setPrivacyAccepted(!vm.privacyAccepted)}>
              <Text style={styles.text}>{vm.privacyAccepted ? '☑' : '☐'} Acepto expresamente esta versión del aviso.</Text>
            </Pressable>
            <Text style={styles.text}>Esta aceptación no incluye promociones ni otros usos opcionales.</Text>
            <AppButton title="Registrar aceptación" disabled={busy || !vm.privacyAccepted} loading={vm.busy === 'consent'} onPress={() => void vm.acceptNotice()} />
          </>
        ) : null}
        {vm.receiptsLoading ? <LoadingState label="Consultando comprobantes…" /> : null}
        {vm.receiptsError ? <ErrorState message={vm.receiptsError} onRetry={vm.retryReceipts} /> : null}
        {!vm.receiptsLoading && !vm.receiptsError && vm.receipts.length === 0 ? <Text style={styles.text}>No hay una aceptación registrada para esta cuenta.</Text> : null}
        {!vm.receiptsError ? vm.receipts.map((receipt) => (
          <View key={receipt.receiptId}>
            <Text selectable style={styles.text}>Comprobante: {receipt.receiptId}</Text>
            <Text style={styles.text}>Versión {receipt.version}. Aceptación registrada: {receipt.acceptedAt}</Text>
            {receipt.revokedAt ? <Text style={styles.text}>Revocación registrada: {receipt.revokedAt}</Text> : null}
          </View>
        )) : null}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Oposición a usos opcionales</Text>
        <Text style={styles.text}>Sin elección registrada no hay permiso implícito. Desactivar la oposición tampoco constituye por sí solo consentimiento publicitario. Los avisos indispensables de cuenta y pagos continúan.</Text>
        {vm.preferencesLoading ? <LoadingState label="Consultando preferencias…" /> : null}
        {vm.preferencesError ? <ErrorState message={vm.preferencesError} onRetry={vm.retryPreferences} /> : null}
        {vm.preferences && !vm.preferencesError ? vm.preferences.preferences.map((item) => (
          <View key={item.purpose} style={styles.preference}>
            <View style={styles.flex}>
              <Text style={styles.text}>{PURPOSE_LABELS[item.purpose]}</Text>
              <Text style={styles.label}>{item.optOut === null ? 'Sin elección registrada' : item.optOut ? 'Oposición registrada' : 'No oposición registrada'}</Text>
            </View>
            <Switch accessibilityLabel={PURPOSE_LABELS[item.purpose]}
              accessibilityValue={{ text: item.optOut === null ? 'Sin elección registrada' : item.optOut ? 'Oposición registrada' : 'No oposición registrada' }}
              value={item.optOut === true} disabled={busy} onValueChange={(value) => void vm.changePreference(item.purpose, value)} />
          </View>
        )) : null}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Cancelación de cuenta</Text>
        <Text style={styles.text}>Solicitar la cancelación inicia una revisión; tu cuenta y membresías siguen activas. No elimina pagos ni historial. La conservación y la baja efectiva deben ser resueltas por el responsable.</Text>
        <Text style={styles.text}>Necesitas verificar tu identidad con un factor nuevo. Para cuentas Google sin contraseña, inicia sesión con Google y verifica el correo o factor configurado.</Text>
        <AppButton title="Abrir página web de eliminación" variant="outline" onPress={() => void vm.openAccountDeletionPage()} />
        {!vm.challenge && !vm.proofExpiresAt && !vm.pendingRetry ? (
          <>
            {!vm.profile?.reauthenticationMethods?.includes('google-email') ? <><AppInput accessibilityLabel="Contraseña actual" label="Contraseña actual"
              leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }} secureTextEntry autoCapitalize="none"
              autoComplete="off" autoCorrect={false} value={vm.password} editable={!busy} onChangeText={vm.setPassword} />
            <AppButton title="Verificar identidad" disabled={busy} loading={vm.busy === 'reauthenticate'} onPress={() => void vm.reauthenticate()} /></> : null}
            {vm.profile?.reauthenticationMethods?.includes('google-email') ? <AppButton title="Verificar cuenta Google sin contraseña" disabled={busy} onPress={() => void vm.reauthenticateGoogle()} /> : null}
          </>
        ) : null}
        {vm.challenge ? (
          <>
            <Text style={styles.text}>{vm.challenge.method === 'totp' ? 'Ingresa un código de tu aplicación autenticadora posterior al inicio de este trámite.' : 'Ingresa el código nuevo enviado para este trámite ARCO. No uses el del inicio de sesión.'}</Text>
            {vm.waitingForTotp ? <Text style={styles.text}>Espera al siguiente intervalo del autenticador.</Text> : null}
            {vm.challengeExpired ? <Text style={styles.error}>El reto venció. Reinicia la verificación.</Text> : null}
            <AppInput accessibilityLabel="Código de verificación ARCO" label="Código de verificación ARCO"
              leftIcon={{ ios: 'lock', android: 'lock', web: 'lock' }} keyboardType="number-pad"
              autoComplete="off" secureTextEntry value={vm.code} maxLength={6} editable={!busy}
              onChangeText={vm.setCode} />
            <AppButton title="Confirmar código" disabled={busy || vm.waitingForTotp || vm.challengeExpired}
              loading={vm.busy === 'verify'} onPress={() => void vm.verifyCode()} />
          </>
        ) : null}
        {vm.proofExpiresAt && !vm.pendingRetry ? (
          <>
            <Text style={styles.text}>{vm.proofReady ? 'Identidad verificada para esta solicitud.' : 'La verificación venció. Reiníciala para continuar.'}</Text>
            <Text style={styles.text}>Para confirmar, escribe SOLICITAR CANCELACIÓN.</Text>
            <AppInput accessibilityLabel="Confirmación de cancelación" label="Confirmación de cancelación"
              leftIcon={{ ios: 'person', android: 'person', web: 'person' }}
              value={vm.confirmation} editable={!busy} autoCorrect={false} onChangeText={vm.setConfirmation} />
            <AppButton title="Solicitar cancelación" disabled={busy || !vm.proofReady}
              loading={vm.busy === 'cancel'} onPress={() => void vm.submitCancellation()} />
          </>
        ) : null}
        {vm.pendingRetry ? (
          <>
            <Text style={styles.text}>No se pudo confirmar la respuesta. Reintenta la misma operación para recuperar su folio sin crear una solicitud duplicada.</Text>
            <AppButton title="Reintentar misma solicitud" disabled={busy} loading={vm.busy === 'cancel'} onPress={() => void vm.submitCancellation()} />
          </>
        ) : null}
        {vm.challenge || vm.proofExpiresAt || vm.pendingRetry ? <AppButton title="Reiniciar verificación" variant="outline" disabled={busy || vm.pendingRetry} onPress={vm.resetVerification} /> : null}
        <AppInput accessibilityLabel="Folio de solicitud" label="Folio de solicitud"
          leftIcon={{ ios: 'person', android: 'person', web: 'person' }} autoCapitalize="none"
          value={vm.requestId} editable={!busy} onChangeText={vm.setRequestId} />
        <AppButton title="Consultar solicitud" variant="outline" disabled={busy || !vm.requestId.trim()}
          loading={vm.busy === 'lookup'} onPress={() => void vm.lookupCancellation()} />
        {vm.cancellationLoading ? <LoadingState label="Recuperando tus solicitudes…" /> : null}
        {vm.cancellationError ? <ErrorState message={vm.cancellationError} onRetry={vm.retryCancellations} /> : null}
        {vm.cancellation ? (
          <View>
            <Text selectable style={styles.text}>Folio: {vm.cancellation.requestId}</Text>
            <Text style={styles.text}>Estado: {cancellationStatusLabels[vm.cancellation.status].toLowerCase()}.</Text>
            <Text style={styles.text}>Fecha de recepción: {vm.cancellation.createdAt}</Text>
            {vm.cancellation.resolvedAt ? <Text style={styles.text}>Fecha de resolución: {vm.cancellation.resolvedAt}</Text> : <Text style={styles.text}>El trámite sigue abierto. No hay una eliminación confirmada.</Text>}
            {vm.cancellation.retentionSummary.map((rule) => <Text key={rule.category} style={styles.text}>{rule.category}: {rule.policyStatus === 'approved' ? `${rule.reason}. Conservación hasta ${rule.retainUntil}.` : 'Política de conservación pendiente de aprobación.'}</Text>)}
          </View>
        ) : null}
      </View>
      {vm.error ? <Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text> : null}
      {vm.message ? <Text accessibilityRole="alert" style={styles.text}>{vm.message}</Text> : null}
      <AppButton title="Consultar aviso y canal ARCO" variant="outline" onPress={vm.openManualChannel} />
    </AppSectionScreen>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: 16, backgroundColor: AppColors.surface.soft, padding: AppSpacing.four, gap: AppSpacing.three },
  title: { fontFamily: AppFonts.emphasis, fontSize: AppFontSizes.body, color: AppColors.neutral.text },
  text: { fontFamily: AppFonts.body, fontSize: AppFontSizes.label, lineHeight: 22, color: AppColors.neutral.text },
  label: { fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, color: AppColors.neutral.muted },
  error: { fontFamily: AppFonts.body, fontSize: AppFontSizes.caption, lineHeight: 20, color: AppColors.feedback.error },
  preference: { flexDirection: 'row', alignItems: 'center', gap: AppSpacing.two },
  flex: { flex: 1 },
  choice: { minHeight: 48, justifyContent: 'center' },
});
