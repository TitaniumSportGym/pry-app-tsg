import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { getLegalRoutes } from '@/features/legal/models/legal-area';
import {
  acceptPrivacyNotice, getArcoProfile, getCancellationRequest, getPrivacyConsents,
  getPrivacyNotice, getPrivacyPreferences, patchPrivacyPreference, rectifyPersonalData,
  startCancellationReauthentication, submitCancellation, verifyCancellationReauthentication,
} from '@/features/privacy/api/arco-api';
import {
  arcoErrorMessage, CANCELLATION_CONFIRMATION,
  type ArcoProfile, type CancellationRequest, type ConsentReceipt, type OptionalPurpose,
  type PrivacyPreferences, type ReauthenticationChallenge, type ReauthenticationProof,
} from '@/features/privacy/models/arco-contracts';
import { personalDataRows, validateRectification, type RectificationDraft, type RectificationErrors } from '@/features/privacy/models/personal-data';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { shouldInvalidateSession } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

type Operation = 'profile' | 'consent' | 'preferences' | 'reauthenticate' | 'verify' | 'cancel' | 'lookup';
interface PendingAttempt { idempotencyKey: string; token: string; confirmation: string }

export function useArcoCenterViewModel() {
  const { user, role, status, signOut } = useAuth();
  const identity = status === 'authenticated' && user && role ? user.id + ':' + role : null;
  const identityRef = useRef(identity);
  useLayoutEffect(() => { identityRef.current = identity; }, [identity]);
  const mounted = useRef(true);
  const lock = useRef(false);
  const proof = useRef<ReauthenticationProof | null>(null);
  const attempt = useRef<PendingAttempt | null>(null);
  const [busy, setBusy] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileOverride, setProfileOverride] = useState<ArcoProfile | null>(null);
  const [preferencesOverride, setPreferencesOverride] = useState<PrivacyPreferences | null>(null);
  const [receiptsOverride, setReceiptsOverride] = useState<ConsentReceipt[] | null>(null);
  const [draft, setDraft] = useState<RectificationDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RectificationErrors>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<ReauthenticationChallenge | null>(null);
  const [proofExpiresAt, setProofExpiresAt] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [pendingRetry, setPendingRetry] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [cancellation, setCancellation] = useState<CancellationRequest | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; proof.current = null; attempt.current = null; };
  }, []);
  useEffect(() => {
    if (!challenge && !proofExpiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge, proofExpiresAt]);

  const loadProfile = useCallback(async () => {
    if (!user || !role || status !== 'authenticated') throw new ApiError('Authentication required.', 401);
    return getArcoProfile(user.id, role);
  }, [user, role, status]);
  const profileResource = useAuthorizedResource(loadProfile);
  const noticeResource = useAuthorizedResource(getPrivacyNotice);
  const receiptsResource = useAuthorizedResource(getPrivacyConsents);
  const preferencesResource = useAuthorizedResource(getPrivacyPreferences);
  const profile = profileOverride ?? profileResource.data;
  const preferences = preferencesOverride ?? preferencesResource.data;
  const receipts = receiptsOverride ?? receiptsResource.data ?? [];

  function clearVerification() {
    proof.current = null; attempt.current = null;
    setPassword(''); setCode(''); setChallenge(null); setProofExpiresAt(null);
    setConfirmation(''); setPendingRetry(false);
  }
  async function perform(operation: Operation, action: (isCurrent: () => boolean) => Promise<void>) {
    if (!identity || !mounted.current || lock.current) return;
    const owner = identity;
    const current = () => mounted.current && identityRef.current === owner;
    lock.current = true; setBusy(operation); setError(null); setMessage(null);
    try { await action(current); }
    catch (failure) {
      if (!current()) return;
      setError(arcoErrorMessage(failure));
      if (failure instanceof ApiError && shouldInvalidateSession(failure.status, failure.data)) {
        clearVerification(); await signOut();
      }
    } finally {
      lock.current = false;
      if (current()) setBusy(null);
    }
  }

  return {
    profile, rows: profile ? personalDataRows(profile) : [],
    isLoading: profileResource.isLoading, loadError: profileResource.error ? arcoErrorMessage(profileResource.error) : null,
    notice: noticeResource.data, noticeLoading: noticeResource.isLoading,
    noticeError: noticeResource.error ? arcoErrorMessage(noticeResource.error) : null,
    preferences, preferencesLoading: preferencesResource.isLoading,
    preferencesError: preferencesResource.error ? arcoErrorMessage(preferencesResource.error) : null,
    receipts, receiptsLoading: receiptsResource.isLoading,
    receiptsError: receiptsResource.error ? arcoErrorMessage(receiptsResource.error) : null,
    busy, error, message, draft, fieldErrors, privacyAccepted, password, code, challenge,
    proofExpiresAt, confirmation, pendingRetry, requestId, cancellation,
    proofReady: Boolean(proofExpiresAt && Date.parse(proofExpiresAt) > now),
    challengeExpired: Boolean(challenge && Date.parse(challenge.expiresAt) <= now),
    waitingForTotp: Boolean(challenge?.notBefore && Date.parse(challenge.notBefore) > now),
    setPrivacyAccepted, setPassword, setCode, setConfirmation, setRequestId,
    retryProfile: profileResource.retry,
    retryNotice() { setPrivacyAccepted(false); noticeResource.retry(); },
    retryPreferences: preferencesResource.retry,
    retryReceipts: receiptsResource.retry,
    refresh() {
      if (lock.current || draft || challenge || proof.current || attempt.current) return;
      setProfileOverride(null); setPreferencesOverride(null); setReceiptsOverride(null);
      profileResource.refresh(); noticeResource.refresh(); receiptsResource.refresh(); preferencesResource.refresh();
      setPrivacyAccepted(false); setMessage(null);
    },
    isRefreshing: profileResource.isRefreshing || noticeResource.isRefreshing || preferencesResource.isRefreshing || receiptsResource.isRefreshing,
    beginEdit() {
      if (!profile || profileResource.error || lock.current) return;
      setDraft({ fullName: profile.fullName ?? '', phone: profile.phone ?? '' });
      setFieldErrors({}); setMessage(null); setError(null);
    },
    setField(field: keyof RectificationDraft, value: string) {
      if (lock.current) return;
      setDraft((current) => current ? { ...current, [field]: value } : null);
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    },
    cancelEdit() { if (!lock.current) { setDraft(null); setFieldErrors({}); } },
    save() {
      if (!draft || !profile || !user) return Promise.resolve();
      const { values, errors } = validateRectification(draft); setFieldErrors(errors);
      if (Object.keys(errors).length) return Promise.resolve();
      return perform('profile', async (current) => {
        try {
          const updated = await rectifyPersonalData(user.id, values, profile.etag);
          if (!current()) return;
          setProfileOverride({ ...profile, fullName: updated.fullName, phone: updated.phone,
            updatedAt: updated.updatedAt, version: updated.version, etag: updated.etag });
          setDraft(null);
          setMessage('El servidor confirmó la actualización de tu nombre y teléfono.');
        } catch (failure) {
          if (current() && failure instanceof ApiError && [412, 428].includes(failure.status)) {
            setDraft(null); setProfileOverride(null); profileResource.retry();
          }
          throw failure;
        }
      });
    },
    acceptNotice() {
      const notice = noticeResource.data;
      if (!privacyAccepted || !notice || noticeResource.error) return Promise.resolve();
      return perform('consent', async (current) => {
        try {
          const receipt = await acceptPrivacyNotice(notice);
          if (!current()) return;
          setReceiptsOverride([...receipts.filter((r) => r.receiptId !== receipt.receiptId), receipt]);
          setPrivacyAccepted(false); setMessage('El servidor registró tu aceptación y emitió un comprobante.');
        } catch (failure) {
          if (current() && failure instanceof ApiError && failure.code === 'NOTICE_VERSION_CHANGED') {
            setPrivacyAccepted(false); noticeResource.retry();
          }
          throw failure;
        }
      });
    },
    changePreference(purpose: OptionalPurpose, optOut: boolean) {
      if (!preferences || preferencesResource.error) return Promise.resolve();
      return perform('preferences', async (current) => {
        try {
          const updated = await patchPrivacyPreference(preferences, purpose, optOut);
          if (!current()) return;
          setPreferencesOverride(updated); setMessage('El servidor confirmó tu preferencia de privacidad.');
        } catch (failure) {
          if (current() && failure instanceof ApiError && failure.status === 409) {
            setPreferencesOverride(null); preferencesResource.retry();
          }
          throw failure;
        }
      });
    },
    reauthenticate() {
      if (!password) { setError('Ingresa tu contraseña actual.'); return Promise.resolve(); }
      return perform('reauthenticate', async (current) => {
        try {
          const result = await startCancellationReauthentication(password);
          if (!current()) return;
          clearVerification();
          if (result.kind === 'challenge') setChallenge(result.challenge);
          else { proof.current = result.proof; setProofExpiresAt(result.proof.expiresAt); setNow(Date.now()); }
        } finally { if (current()) setPassword(''); }
      });
    },
    verifyCode() {
      if (!challenge || Date.parse(challenge.expiresAt) <= Date.now()) {
        clearVerification(); setError('El reto venció. Verifica tu identidad nuevamente.'); return Promise.resolve();
      }
      if (challenge.notBefore && Date.parse(challenge.notBefore) > Date.now()) {
        setError('Espera al siguiente código de tu aplicación autenticadora.'); return Promise.resolve();
      }
      if (!/^\d{6}$/.test(code)) { setError('Ingresa el código de seis dígitos.'); return Promise.resolve(); }
      return perform('verify', async (current) => {
        try {
          const result = await verifyCancellationReauthentication(challenge.challengeId, code);
          if (!current()) return;
          proof.current = result; setChallenge(null); setCode(''); setProofExpiresAt(result.expiresAt); setNow(Date.now());
        } finally { if (current()) setCode(''); }
      });
    },
    submitCancellation() {
      if (!attempt.current) {
        if (confirmation !== CANCELLATION_CONFIRMATION) { setError('Escribe SOLICITAR CANCELACIÓN para confirmar el trámite.'); return Promise.resolve(); }
        if (!proof.current || Date.parse(proof.current.expiresAt) <= Date.now()) {
          clearVerification(); setError('La verificación venció. Verifica tu identidad nuevamente.'); return Promise.resolve();
        }
      }
      return perform('cancel', async (current) => {
        if (!attempt.current) {
          attempt.current = { idempotencyKey: randomUUID(), token: proof.current!.reauthenticationToken, confirmation };
        }
        const pending = attempt.current;
        try {
          const result = await submitCancellation(pending.confirmation, pending.token, pending.idempotencyKey);
          if (!current()) return;
          clearVerification(); setCancellation(result); setRequestId(result.requestId);
          setMessage('Solicitud recibida y pendiente de revisión. Tu cuenta sigue activa.');
        } catch (failure) {
          if (current()) {
            const uncertain = !(failure instanceof ApiError) || failure.status >= 500;
            if (uncertain) setPendingRetry(true);
            else clearVerification();
          }
          throw failure;
        }
      });
    },
    lookupCancellation() {
      return perform('lookup', async (current) => {
        const result = await getCancellationRequest(requestId.trim());
        if (current()) { setCancellation(result); setRequestId(result.requestId); }
      });
    },
    resetVerification() { if (!lock.current) clearVerification(); },
    async openApprovedNotice() {
      if (!noticeResource.data || noticeResource.error) return;
      try { await WebBrowser.openBrowserAsync(noticeResource.data.documentUrl); }
      catch { if (mounted.current) setError('No fue posible abrir el aviso. Intenta nuevamente.'); }
    },
    openManualChannel() { router.push(getLegalRoutes(role).privacy); },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(getLegalRoutes(role).parent);
    },
  };
}
