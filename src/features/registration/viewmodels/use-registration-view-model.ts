import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getPrivacyNotice } from '@/features/privacy/api/arco-api';
import { isArcoBackendEnabled } from '@/features/privacy/models/arco-config';
import { arcoErrorMessage, consentFor, parseReceipt, type PrivacyNotice } from '@/features/privacy/models/arco-contracts';
import { getRegistrationErrorMessage } from '@/features/registration/models/registration-errors';
import { type RegistrationFieldErrors, validateRegistration } from '@/features/registration/models/registration-model';
import { registerMobile } from '@/services/authService';
import { ApiError } from '@/types/auth';

export function useRegistrationViewModel() {
  const privacyEnabled = isArcoBackendEnabled();
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPasswordValue] = useState('');
  const [privacyAccepted, setPrivacyAcceptedValue] = useState(false);
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(privacyEnabled);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const mounted = useRef(true);
  const noticeRequest = useRef(0);

  const reloadNotice = useCallback(async () => {
    if (!privacyEnabled || submitLock.current) return;
    const requestId = ++noticeRequest.current;
    setPrivacyAcceptedValue(false); setNotice(null); setNoticeError(null); setNoticeLoading(true);
    try {
      const result = await getPrivacyNotice();
      if (mounted.current && requestId === noticeRequest.current) setNotice(result);
    } catch (error) {
      if (mounted.current && requestId === noticeRequest.current) setNoticeError(arcoErrorMessage(error));
    } finally {
      if (mounted.current && requestId === noticeRequest.current) setNoticeLoading(false);
    }
  }, [privacyEnabled]);
  useEffect(() => {
    mounted.current = true;
    const requestId = ++noticeRequest.current;
    if (privacyEnabled) {
      getPrivacyNotice().then(
        (result) => { if (mounted.current && requestId === noticeRequest.current) setNotice(result); },
        (error: unknown) => { if (mounted.current && requestId === noticeRequest.current) setNoticeError(arcoErrorMessage(error)); },
      ).finally(() => { if (mounted.current && requestId === noticeRequest.current) setNoticeLoading(false); });
    }
    return () => { mounted.current = false; };
  }, [privacyEnabled]);

  function setEmail(value: string) {
    setEmailValue(value); setFieldErrors((current) => ({ ...current, email: undefined }));
  }
  function setPassword(value: string) {
    setPasswordValue(value); setFieldErrors((current) => ({ ...current, password: undefined }));
  }
  function setConfirmPassword(value: string) {
    setConfirmPasswordValue(value); setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
  }
  function setPrivacyAccepted(value: boolean) {
    if (submitLock.current || (privacyEnabled && !notice)) return;
    setPrivacyAcceptedValue(value); setFieldErrors((current) => ({ ...current, privacyAccepted: undefined }));
  }
  async function submit() {
    if (submitLock.current || !mounted.current) return;
    const { email: normalizedEmail, errors } = validateRegistration(email, password, confirmPassword, privacyAccepted);
    setFieldErrors(errors); setFormError(null);
    if (Object.keys(errors).length > 0) return;
    const selectedNotice = notice;
    if (privacyEnabled && (!selectedNotice || noticeLoading || noticeError)) {
      setFormError('Consulta el aviso aprobado antes de registrar tu aceptación.'); return;
    }
    submitLock.current = true; setIsSubmitting(true);
    let versionChanged = false;
    try {
      if (privacyEnabled && selectedNotice) {
        const response = await registerMobile(normalizedEmail, password, consentFor(selectedNotice));
        parseReceipt(response.privacyConsent, selectedNotice);
      } else await registerMobile(normalizedEmail, password);
      if (!mounted.current) return;
      setPasswordValue(''); setConfirmPasswordValue('');
      router.push({ pathname: '/verify-account', params: { email: normalizedEmail } });
    } catch (error) {
      if (!mounted.current) return;
      versionChanged = error instanceof ApiError && error.code === 'NOTICE_VERSION_CHANGED';
      if (versionChanged || (error instanceof ApiError && ['CONSENT_REQUIRED', 'INVALID_ARCO_RESPONSE'].includes(error.code ?? ''))) {
        setPrivacyAcceptedValue(false); setFormError(arcoErrorMessage(error));
      } else setFormError(getRegistrationErrorMessage(error, 'No fue posible crear la cuenta. Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      submitLock.current = false;
      if (mounted.current) {
        setIsSubmitting(false);
        if (versionChanged) await reloadNotice();
      }
    }
  }
  return {
    email, password, confirmPassword, privacyAccepted, privacyEnabled,
    notice, noticeLoading, noticeError, reloadNotice, fieldErrors, formError, isSubmitting,
    setEmail, setPassword, setConfirmPassword, setPrivacyAccepted, submit,
    async openPrivacyNotice() {
      if (!privacyEnabled) { router.push('/privacy-notice'); return; }
      if (!notice) return;
      try { await WebBrowser.openBrowserAsync(notice.documentUrl); }
      catch { if (mounted.current) setFormError('No fue posible abrir el aviso aprobado. Intenta nuevamente.'); }
    },
  };
}
